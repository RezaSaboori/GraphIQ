import type { RenderableElement } from './RenderableElement';
import { LiquidShape } from './LiquidShape';
import { TextElement, type TextStyle } from './TextElement';

export type ElementConfig = {
  id: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  zIndex: number;
  tint?: { r: number; g: number; b: number; a: number };
  radius?: number;
  roundness?: number;
  text?: string;
  textStyle?: TextStyle;
};

export interface ElementFactory<T extends RenderableElement = RenderableElement> {
  create(config: ElementConfig): T;
  getDefaultConfig(): Partial<ElementConfig>;
}

export class ElementRegistry {
  private static elementTypes = new Map<string, ElementFactory>();

  static registerElementType<T extends RenderableElement>(typeName: string, factory: ElementFactory<T>): void {
    this.elementTypes.set(typeName, factory as unknown as ElementFactory);
  }

  static createElement(type: string, config: ElementConfig): RenderableElement | null {
    const factory = this.elementTypes.get(type);
    if (!factory) {
      console.warn(`Unknown element type: ${type}`);
      return null;
    }
    const defaults = factory.getDefaultConfig();
    return factory.create({ ...defaults, ...config });
  }

  static getAvailableTypes(): string[] {
    return Array.from(this.elementTypes.keys());
  }
}

// Register built-in types
ElementRegistry.registerElementType('liquid-shape', {
  create: (config) =>
    new LiquidShape(
      config.id,
      config.position,
      config.size ?? { width: 200, height: 200 },
      config.zIndex,
      config.tint ?? { r: 255, g: 255, b: 255, a: 0.8 },
      config.radius ?? 80,
      config.roundness ?? 5,
    ),
  getDefaultConfig: () => ({
    radius: 80,
    roundness: 5,
    tint: { r: 255, g: 255, b: 255, a: 0.8 },
  }),
});

ElementRegistry.registerElementType('text', {
  create: (config) =>
    new TextElement(
      config.id,
      config.text || 'Sample Text',
      config.position,
      config.zIndex,
      config.textStyle || TextElement.defaultStyle,
    ),
  getDefaultConfig: () => ({
    textStyle: TextElement.defaultStyle,
  }),
});


