import type { RenderableElement, ElementShaderData, RGBA, BoundingBox } from './RenderableElement';

export class LiquidShape implements RenderableElement {
  public animated = false;
  public visible = true;

  constructor(
    public id: string,
    public position: { x: number; y: number },
    public size: { width: number; height: number },
    public zIndex: number,
    public tint: RGBA,
    public radius: number = 80,
    public roundness: number = 5
  ) {}

  updateAnimation(_deltaTime: number): void {}

  getShaderData(): ElementShaderData {
    return {
      positions: new Float32Array([this.position.x, this.position.y]),
      sizes: new Float32Array([this.size.width, this.size.height]),
      colors: new Float32Array([
        this.tint.r / 255,
        this.tint.g / 255,
        this.tint.b / 255,
        this.tint.a,
      ]),
      customData: new Float32Array([this.radius, this.roundness, 0, 0]),
      elementType: 0,
    };
  }

  getBounds(): BoundingBox {
    return {
      x: this.position.x - this.size.width / 2,
      y: this.position.y - this.size.height / 2,
      width: this.size.width,
      height: this.size.height,
    };
  }

  cleanup(): void {}
}


