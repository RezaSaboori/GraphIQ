import type { RenderableElement, ElementShaderData, BoundingBox } from './RenderableElement';

export type TextStyle = {
  fontSize: number;
  fontFamily: string;
  color: { r: number; g: number; b: number; a: number };
  backgroundColor?: { r: number; g: number; b: number; a: number };
};

export class TextElement implements RenderableElement {
  public static defaultStyle: TextStyle = {
    fontSize: 24,
    fontFamily: 'Arial',
    color: { r: 1, g: 1, b: 1, a: 1 },
    backgroundColor: { r: 0, g: 0, b: 0, a: 0.5 },
  };

  public animated = false;
  public visible = true;
  private textTexture: WebGLTexture | null = null;

  constructor(
    public id: string,
    public text: string,
    public position: { x: number; y: number },
    public zIndex: number,
    public style: TextStyle = TextElement.defaultStyle
  ) {}

  updateAnimation(_deltaTime: number): void {}

  getShaderData(): ElementShaderData {
    // Placeholder: treat text as a quad sized by font size. Texture usage is deferred.
    const width = this.getTextWidth();
    const height = this.getTextHeight();
    const bg = this.style.backgroundColor ?? { r: 0, g: 0, b: 0, a: 0 };
    return {
      positions: new Float32Array([this.position.x, this.position.y]),
      sizes: new Float32Array([width, height]),
      colors: new Float32Array([bg.r, bg.g, bg.b, bg.a]),
      customData: new Float32Array([this.textTexture ? 1 : 0, 0, 0, 0]),
      elementType: 1,
    };
  }

  getBounds(): BoundingBox {
    const w = this.getTextWidth();
    const h = this.getTextHeight();
    return { x: this.position.x - w / 2, y: this.position.y - h / 2, width: w, height: h };
  }

  cleanup(): void {}

  private getTextWidth(): number {
    return this.style.fontSize * Math.max(1, this.text.length * 0.6);
  }

  private getTextHeight(): number {
    return this.style.fontSize * 1.2;
  }
}


