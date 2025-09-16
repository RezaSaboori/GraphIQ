export type RGBA = { r: number; g: number; b: number; a: number };

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementShaderData {
  positions: Float32Array; // vec2 per element
  sizes: Float32Array; // vec2 per element
  colors: Float32Array; // vec4 per element
  customData: Float32Array; // vec4 per element (element specific)
  elementType: number; // 0 = shape, 1 = text, 2 = icon
}

export interface RenderableElement {
  id: string;
  zIndex: number;
  position: { x: number; y: number };
  visible: boolean;
  animated: boolean;

  updateAnimation(deltaTime: number): void;
  getShaderData(): ElementShaderData;
  getBounds(): BoundingBox;
  cleanup(): void;
}


