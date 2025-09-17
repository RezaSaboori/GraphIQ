import { createTexture, RenderPass } from './GLUtils';
import WBOITGatherVertex from '../shaders/vertex.glsl?raw';
import WBOITGatherFragment from '../shaders/wboit-gather.glsl?raw';
import PassthroughVertex from '../shaders/vertex.glsl?raw'; // Simple quad vertex shader
import WBOITCompositeFragment from '../shaders/wboit-composite.glsl?raw';
import { ShapeManager } from './ShapeManager';

export class OITSystem {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private drawBuffersExt: WEBGL_draw_buffers | null = null;

  // WBOIT Framebuffers and Textures
  private oitFBO: WebGLFramebuffer | null = null;
  private accumTexture: WebGLTexture | null = null;
  private revealageTexture: WebGLTexture | null = null;

  // Render Passes
  private gatherPass: RenderPass | null = null;
  private compositePass: RenderPass | null = null;
  
  private screenWidth: number;
  private screenHeight: number;
  private shapeTexture: WebGLTexture | null = null;
  private shapeTextureData: Float32Array | null = null;
  private shapeTextureWidth = 0;
  private shapeTextureHeight = 0;

  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, width: number, height: number) {
    this.gl = gl;
    this.screenWidth = width;
    this.screenHeight = height;
    
    this.init();
  }

  private init(): void {
    const gl = this.gl;

    // 1. Get extensions
    this.drawBuffersExt = gl.getExtension('WEBGL_draw_buffers');
    if (!this.drawBuffersExt) {
      console.error('WEBGL_draw_buffers is not supported');
      return;
    }
    const halfFloatExt = gl.getExtension('OES_texture_half_float') || gl.getExtension('EXT_color_buffer_half_float');
    if (!halfFloatExt) {
      console.error('OES_texture_half_float or EXT_color_buffer_half_float is not supported');
      return;
    }
    
    // In WebGL1, we need this for linear filtering on float textures
    gl.getExtension('OES_texture_half_float_linear');

    // 2. Create Textures for WBOIT
    const floatType = halfFloatExt.HALF_FLOAT_OES || (gl as any).HALF_FLOAT;
    this.accumTexture = createTexture(gl, this.screenWidth, this.screenHeight, gl.RGBA, floatType);
    this.revealageTexture = createTexture(gl, this.screenWidth, this.screenHeight, gl.RGBA, floatType); 

    // 3. Create Framebuffer
    this.oitFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.oitFBO);

    // 4. Attach textures to FBO
    const attachments = [
      this.drawBuffersExt.COLOR_ATTACHMENT0_WEBGL,
      this.drawBuffersExt.COLOR_ATTACHMENT1_WEBGL,
    ];
    this.drawBuffersExt.drawBuffersWEBGL(attachments);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachments[0], gl.TEXTURE_2D, this.accumTexture, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachments[1], gl.TEXTURE_2D, this.revealageTexture, 0);

    // 5. Check FBO status
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.error('FBO incomplete: ' + status.toString());
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // 6. Create Shader Programs / Render Passes
    this.gatherPass = new RenderPass(gl, { vertex: WBOITGatherVertex, fragment: WBOITGatherFragment });
    this.compositePass = new RenderPass(gl, { vertex: PassthroughVertex, fragment: WBOITCompositeFragment }, true);
  }
  
  public render(shapeManager: ShapeManager, bgTexture: WebGLTexture, globalUniforms: Record<string, any>): void {
    const gl = this.gl;
    if (!this.drawBuffersExt || !this.oitFBO || !this.gatherPass || !this.compositePass) return;

    // --- 1. GATHER PASS ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.oitFBO);
    gl.viewport(0, 0, this.screenWidth, this.screenHeight);

    // Clear buffers
    this.drawBuffersExt.drawBuffersWEBGL([
      this.drawBuffersExt.COLOR_ATTACHMENT0_WEBGL,
      this.drawBuffersExt.COLOR_ATTACHMENT1_WEBGL,
    ]);
    gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 0.0]); // Accumulation buffer
    gl.clearBufferfv(gl.COLOR, 1, [1.0, 1.0, 1.0, 1.0]); // Revealage buffer

    // Set blending for WBOIT
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
    
    // Disable depth test for this pass, z-ordering is handled by blending
    gl.disable(gl.DEPTH_TEST);

    const shapeData = shapeManager.getShapeDataForTexture();
    if (shapeData.count === 0) return;

    // Update shape data texture
    if (!this.shapeTexture || this.shapeTextureWidth !== shapeData.width || this.shapeTextureHeight !== shapeData.height) {
        if (this.shapeTexture) gl.deleteTexture(this.shapeTexture);
        this.shapeTexture = createTexture(gl, shapeData.width, shapeData.height, gl.RGBA, (gl as any).FLOAT, shapeData.data);
        this.shapeTextureWidth = shapeData.width;
        this.shapeTextureHeight = shapeData.height;
    } else {
        gl.bindTexture(gl.TEXTURE_2D, this.shapeTexture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, shapeData.width, shapeData.height, gl.RGBA, (gl as any).FLOAT, shapeData.data);
    }
    
    const uniforms = {
        ...globalUniforms,
        u_shapeTexture: this.shapeTexture,
        u_shapeTextureSize: [this.shapeTextureWidth, this.shapeTextureHeight],
        u_shapeCount: shapeData.count,
        u_bg: bgTexture
    };
    this.gatherPass.render(uniforms);

    // --- 2. COMPOSITE PASS ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // Render to screen
    gl.viewport(0, 0, this.screenWidth, this.screenHeight);
    
    // Disable blending for composite pass, it's a direct write
    gl.disable(gl.BLEND);
    
    this.compositePass.render({
        u_accumTexture: this.accumTexture,
        u_revealageTexture: this.revealageTexture,
        u_bgTexture: bgTexture,
    });
  }

  public dispose(): void {
    const gl = this.gl;
    if (this.oitFBO) gl.deleteFramebuffer(this.oitFBO);
    if (this.accumTexture) gl.deleteTexture(this.accumTexture);
    if (this.revealageTexture) gl.deleteTexture(this.revealageTexture);
    
    this.gatherPass?.dispose();
    this.compositePass?.dispose();
    if (this.shapeTexture) gl.deleteTexture(this.shapeTexture);
  }
}
