import { ComputeShader } from './GLUtils';
import type { LiquidShape } from '../elements/LiquidShape';

import gatherShaderSource from '../shaders/oit-gather.glsl?raw';
import sortShaderSource from '../shaders/oit-sort.glsl?raw';
import compositeShaderSource from '../shaders/oit-composite.glsl?raw';

export class OITSystem {
  private gl: WebGL2RenderingContext;
  private gatherShader: ComputeShader;
  private sortShader: ComputeShader;
  private compositeShader: ComputeShader;
  
  // A-Buffer storage
  private fragmentListSSBO: WebGLBuffer;
  private headPointerTexture: WebGLTexture;
  private atomicCounterBuffer: WebGLBuffer;
  
  // Configuration
  private maxFragmentsPerPixel = 16;
  private screenWidth: number;
  private screenHeight: number;

  constructor(gl: WebGL2RenderingContext, width: number, height: number) {
    this.gl = gl;
    this.screenWidth = width;
    this.screenHeight = height;
    
    this.initializeBuffers();
    this.createShaders();
  }

  private initializeBuffers(): void {
    const gl = this.gl;
    const pixelCount = this.screenWidth * this.screenHeight;
    const maxFragments = pixelCount * this.maxFragmentsPerPixel;

    // Fragment list SSBO - stores color, depth, next pointer for each fragment
    this.fragmentListSSBO = gl.createBuffer()!;
    gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.fragmentListSSBO);
    // Each fragment: vec4 color + float depth + uint next = 24 bytes, but let's use 32 for alignment
    gl.bufferData(gl.SHADER_STORAGE_BUFFER, maxFragments * 32, gl.DYNAMIC_DRAW);
    
    // Head pointer texture - stores first fragment index for each pixel
    this.headPointerTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.headPointerTexture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R32UI, this.screenWidth, this.screenHeight);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Atomic counter for fragment allocation
    this.atomicCounterBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ATOMIC_COUNTER_BUFFER, this.atomicCounterBuffer);
    gl.bufferData(gl.ATOMIC_COUNTER_BUFFER, 4, gl.DYNAMIC_DRAW);
  }

  private createShaders(): void {
    // Create the three compute shaders
    this.gatherShader = new ComputeShader(this.gl, gatherShaderSource);
    this.sortShader = new ComputeShader(this.gl, sortShaderSource);
    this.compositeShader = new ComputeShader(this.gl, compositeShaderSource);
  }

  public render(shapes: LiquidShape[], globalUniforms: Record<string, any>): WebGLTexture {
    this.clearBuffers();
    this.gatherFragments(shapes, globalUniforms);
    this.sortFragments();
    return this.compositeFragments(globalUniforms);
  }

  private clearBuffers(): void {
    const gl = this.gl;
    
    // Reset atomic counter
    gl.bindBuffer(gl.ATOMIC_COUNTER_BUFFER, this.atomicCounterBuffer);
    const zero = new Uint32Array([0]);
    gl.bufferSubData(gl.ATOMIC_COUNTER_BUFFER, 0, zero);
    gl.bindBuffer(gl.ATOMIC_COUNTER_BUFFER, null);
    
    // Clear head pointers to 0xFFFFFFFF
    const clearValue = new Uint32Array(this.screenWidth * this.screenHeight);
    clearValue.fill(0xFFFFFFFF);
    gl.bindTexture(gl.TEXTURE_2D, this.headPointerTexture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.screenWidth, this.screenHeight, gl.RED_INTEGER, gl.UNSIGNED_INT, clearValue);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
  
  public dispose(): void {
    this.gatherShader.dispose();
    this.sortShader.dispose();
    this.compositeShader.dispose();

    this.gl.deleteBuffer(this.fragmentListSSBO);
    this.gl.deleteTexture(this.headPointerTexture);
    this.gl.deleteBuffer(this.atomicCounterBuffer);
  }

  private prepareShapeData(shapes: LiquidShape[]) {
    const positions: number[] = [];
    const sizes: number[] = [];
    const radii: number[] = [];
    const roundnesses: number[] = [];
    const visibilities: number[] = [];
    const zIndices: number[] = [];
    const tints: number[] = [];

    for (const shape of shapes) {
        positions.push(shape.position.x, shape.position.y);
        sizes.push(shape.size.width, shape.size.height);
        radii.push(shape.radius);
        roundnesses.push(shape.roundness);
        visibilities.push(shape.visible ? 1.0 : 0.0);
        zIndices.push(shape.zIndex);
        tints.push(shape.tint.r / 255, shape.tint.g / 255, shape.tint.b / 255, shape.tint.a);
    }

    return { positions, sizes, radii, roundnesses, visibilities, zIndices, tints };
  }

  private gatherFragments(shapes: LiquidShape[], _globalUniforms: Record<string, any>): void {
    const gl = this.gl;
    
    this.gatherShader.use();
    
    // Bind buffers
    gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, 0, this.fragmentListSSBO);
    gl.bindBufferBase(gl.ATOMIC_COUNTER_BUFFER, 0, this.atomicCounterBuffer);
    gl.bindImageTexture(0, this.headPointerTexture, 0, false, 0, gl.READ_WRITE, gl.R32UI);
    
    // Set uniforms
    this.gatherShader.setUniform('u_resolution', [this.screenWidth, this.screenHeight]);
    this.gatherShader.setUniform('u_shapeCount', shapes.length);
    
    // Set shape data
    const shapeData = this.prepareShapeData(shapes);
    this.gatherShader.setUniform('u_shapePositions', shapeData.positions);
    this.gatherShader.setUniform('u_shapeSizes', shapeData.sizes);
    this.gatherShader.setUniform('u_shapeRadii', shapeData.radii);
    this.gatherShader.setUniform('u_shapeRoundnesses', shapeData.roundnesses);
    this.gatherShader.setUniform('u_shapeVisibilities', shapeData.visibilities);
    this.gatherShader.setUniform('u_shapeZIndices', shapeData.zIndices);
    this.gatherShader.setUniform('u_shapeTints', shapeData.tints);

    // Dispatch - one thread per pixel
    const workGroupsX = Math.ceil(this.screenWidth / 16);
    const workGroupsY = Math.ceil(this.screenHeight / 16);
    this.gatherShader.dispatch(workGroupsX, workGroupsY);
  }

  private sortFragments(): void {
    const gl = this.gl;
    
    this.sortShader.use();
    gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, 0, this.fragmentListSSBO);
    gl.bindImageTexture(0, this.headPointerTexture, 0, false, 0, gl.READ_WRITE, gl.R32UI);
    
    this.sortShader.setUniform('u_resolution', [this.screenWidth, this.screenHeight]);
    this.sortShader.setUniform('u_maxFragments', this.maxFragmentsPerPixel);
    
    // Dispatch sorting - one thread per pixel
    const workGroupsX = Math.ceil(this.screenWidth / 16);
    const workGroupsY = Math.ceil(this.screenHeight / 16);
    this.sortShader.dispatch(workGroupsX, workGroupsY);
  }

  private compositeFragments(globalUniforms: Record<string, any>): WebGLTexture {
    const gl = this.gl;
    
    // Create output texture
    const outputTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, outputTexture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, this.screenWidth, this.screenHeight);
    
    this.compositeShader.use();
    gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, 0, this.fragmentListSSBO);
    gl.bindImageTexture(0, this.headPointerTexture, 0, false, 0, gl.READ_ONLY, gl.R32UI);
    gl.bindImageTexture(1, outputTexture, 0, false, 0, gl.WRITE_ONLY, gl.RGBA16F);
    
    // Set liquid glass effect uniforms
    this.compositeShader.setUniform('u_resolution', [this.screenWidth, this.screenHeight]);
    this.compositeShader.setUniform('u_refFactor', globalUniforms.u_refFactor || 1.0);
    this.compositeShader.setUniform('u_refDispersion', globalUniforms.u_refDispersion || 0.0);
    
    // Other uniforms for composite shader like background textures
    if (globalUniforms.u_blurredBg) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, globalUniforms.u_blurredBg);
        this.compositeShader.setUniform('u_blurredBg', 0);
    }
    if (globalUniforms.u_bg) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, globalUniforms.u_bg);
        this.compositeShader.setUniform('u_bg', 1);
    }
    
    const workGroupsX = Math.ceil(this.screenWidth / 16);
    const workGroupsY = Math.ceil(this.screenHeight / 16);
    this.compositeShader.dispatch(workGroupsX, workGroupsY);
    
    return outputTexture;
  }
}
