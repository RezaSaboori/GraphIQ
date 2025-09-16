import { FrameBuffer, ShaderProgram } from '../utils/GLUtils';
import type { RenderableElement, ElementShaderData } from '../elements/RenderableElement';
import VertexShader from '../shaders/vertex.glsl?raw';
import FragmentMainShader from '../shaders/fragment-main.glsl?raw';

export class ZIndexLayerManager {
  private layers = new Map<number, ZIndexLayer>();
  private maxLayerSize = { width: 2048, height: 2048 };

  constructor(private gl: WebGL2RenderingContext) {}

  addElement(element: RenderableElement): void {
    const z = element.zIndex;
    if (!this.layers.has(z)) {
      this.layers.set(z, new ZIndexLayer(this.gl, z, this.maxLayerSize));
    }
    this.layers.get(z)!.addElement(element);
  }

  removeElement(elementId: string, zIndex: number): void {
    const layer = this.layers.get(zIndex);
    if (layer) {
      layer.removeElement(elementId);
      if (layer.isEmpty()) {
        layer.dispose();
        this.layers.delete(zIndex);
      }
    }
  }

  renderAllLayers(globalUniforms: Record<string, any>): WebGLTexture[] {
    const sorted = Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex);
    const outputs: WebGLTexture[] = [];
    for (const layer of sorted) {
      const tex = layer.render(globalUniforms);
      if (tex) outputs.push(tex);
    }
    return outputs;
  }

  updateAnimations(deltaTime: number): void {
    for (const layer of this.layers.values()) {
      layer.updateAnimations(deltaTime);
    }
  }
}

class ZIndexLayer {
  private elements = new Map<string, RenderableElement>();
  private frameBuffer: FrameBuffer;
  private shaderProgram: ShaderProgram;
  private isDirty = true;
  private vao: WebGLVertexArrayObject | null = null;

  constructor(
    private gl: WebGL2RenderingContext,
    public readonly zIndex: number,
    private size: { width: number; height: number }
  ) {
    this.frameBuffer = new FrameBuffer(gl, size.width, size.height);
    this.shaderProgram = new ShaderProgram(gl, {
      vertex: VertexShader,
      fragment: FragmentMainShader,
    });
    this.vao = this.createFullscreenVAO();
  }

  addElement(element: RenderableElement): void {
    this.elements.set(element.id, element);
    this.isDirty = true;
  }

  removeElement(elementId: string): void {
    if (this.elements.delete(elementId)) {
      this.isDirty = true;
    }
  }

  isEmpty(): boolean {
    return this.elements.size === 0;
  }

  updateAnimations(deltaTime: number): void {
    let anyAnimated = false;
    for (const el of this.elements.values()) {
      if (el.animated) {
        el.updateAnimation(deltaTime);
        anyAnimated = true;
      }
    }
    if (anyAnimated) this.isDirty = true;
  }

  render(globalUniforms: Record<string, any>): WebGLTexture | null {
    if (!this.isDirty && !this.hasAnimatedElements()) {
      return this.frameBuffer.getTexture();
    }

    const gl = this.gl;
    this.frameBuffer.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.shaderProgram.use();
    Object.entries(globalUniforms).forEach(([k, v]) => this.shaderProgram.setUniform(k, v));

    const data = this.prepareElementData();
    this.shaderProgram.setUniform('u_shapeCount', data.count);
    this.shaderProgram.setUniform('u_shapePositions', data.positions);
    this.shaderProgram.setUniform('u_shapeSizes', data.sizes);
    this.shaderProgram.setUniform('u_shapeRadii', data.radii);
    this.shaderProgram.setUniform('u_shapeRoundnesses', data.roundnesses);
    this.shaderProgram.setUniform('u_shapeVisibilities', data.visibilities);
    this.shaderProgram.setUniform('u_shapeZIndices', data.zIndices);
    this.shaderProgram.setUniform('u_isHoverShape', data.isHoverShape);

    // Draw full-screen quad
    if (this.vao) {
      gl.bindVertexArray(this.vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindVertexArray(null);
    }

    this.frameBuffer.unbind();
    this.isDirty = false;
    return this.frameBuffer.getTexture();
  }

  private prepareElementData(): {
    count: number;
    positions: Float32Array;
    sizes: Float32Array;
    radii: Float32Array;
    roundnesses: Float32Array;
    visibilities: Float32Array;
    zIndices: Float32Array;
    isHoverShape: Float32Array;
  } {
    const elements = Array.from(this.elements.values()).filter(e => e.visible);
    const max = 20;
    const positions = new Float32Array(max * 2);
    const sizes = new Float32Array(max * 2);
    const radii = new Float32Array(max);
    const roundnesses = new Float32Array(max);
    const visibilities = new Float32Array(max);
    const zIndices = new Float32Array(max);
    const isHoverShape = new Float32Array(max);

    for (let i = 0; i < Math.min(elements.length, max); i++) {
      const el = elements[i];
      const d: ElementShaderData = el.getShaderData();
      positions.set(d.positions, i * 2);
      sizes.set(d.sizes, i * 2);
      // customData.x = radius; customData.y = roundness
      radii[i] = d.customData[0] ?? 0;
      roundnesses[i] = d.customData[1] ?? 0;
      visibilities[i] = el.visible ? 1 : 0;
      zIndices[i] = el.zIndex;
      isHoverShape[i] = el.id === 'hover_shape' ? 1 : 0;
    }

    return {
      count: Math.min(elements.length, max),
      positions,
      sizes,
      radii,
      roundnesses,
      visibilities,
      zIndices,
      isHoverShape,
    };
  }

  private hasAnimatedElements(): boolean {
    for (const el of this.elements.values()) if (el.animated) return true;
    return false;
  }

  dispose(): void {
    this.elements.clear();
    // FrameBuffer and program cleaned up by GC; GL resources disposed by parent when needed
    if (this.vao) {
      this.gl.deleteVertexArray(this.vao);
      this.vao = null;
    }
  }

  private createFullscreenVAO(): WebGLVertexArrayObject {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('Failed to create VAO');
    gl.bindVertexArray(vao);
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('Failed to create buffer');
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const positionLoc = this.gl.getAttribLocation((this as any).shaderProgram['program'], 'a_position');
    // Fallback to ShaderProgram API if accessible
    const loc = positionLoc >= 0 ? positionLoc : this.shaderProgram.getAttributeLocation('a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return vao;
  }
}


