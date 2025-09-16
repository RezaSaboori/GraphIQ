import type { ZIndexLayerManager } from '../render/ZIndexLayerManager';
import { LiquidShape } from '../elements/LiquidShape';

type HoverAnim = {
  elementId: string;
  startTime: number;
  duration: number;
  startPos: { x: number; y: number };
};

export class AnimationManager {
  private hoverAnimations = new Map<string, HoverAnim>();

  updateAnimations(deltaTime: number, _layerManager: ZIndexLayerManager): void {
    const now = performance.now();
    for (const [id, anim] of this.hoverAnimations) {
      const t = Math.min((now - anim.startTime) / anim.duration, 1);
      if (t >= 1) this.hoverAnimations.delete(id);
    }
  }

  startHoverAnimation(elementId: string, mousePos: { x: number; y: number }): void {
    this.hoverAnimations.set(elementId, {
      elementId,
      startTime: performance.now(),
      duration: 500,
      startPos: { x: mousePos.x, y: mousePos.y },
    });
  }

  createHoverBubble(parent: LiquidShape, mousePos: { x: number; y: number }): LiquidShape {
    return new LiquidShape(
      `hover_${parent.id}`,
      { x: mousePos.x, y: mousePos.y },
      { width: 0, height: 0 },
      parent.zIndex,
      { r: 255, g: 255, b: 255, a: 0.8 },
      100,
      5,
    );
  }
}


