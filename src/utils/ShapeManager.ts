import { Camera } from './Camera';

export interface Shape {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  radius: number;
  roundness: number;
  visible: boolean;
  draggable: boolean;
  zIndex: number;
  tint: [number, number, number]; // [r, g, b] array format
}

export interface ShapeManagerState {
  shapes: Map<string, Shape>;
  selectedShapeId: string | null;
  draggingShapeId: string | null;
  dragStartPos: { x: number; y: number };
  dragStartShapePos: { x: number; y: number };
}

export class ShapeManager {
  private state: ShapeManagerState = {
    shapes: new Map(),
    selectedShapeId: null,
    draggingShapeId: null,
    dragStartPos: { x: 0, y: 0 },
    dragStartShapePos: { x: 0, y: 0 },
  };

  private nextId = 1;

  constructor(initialShapes: Partial<Shape>[] = []) {
    // Add initial shapes
    initialShapes.forEach(shapeData => {
      this.addShape(shapeData);
    });
  }

  addShape(shapeData: Partial<Shape> = {}): string {
    const id = shapeData.id || `shape_${this.nextId++}`;
    const shape: Shape = {
      id,
      position: shapeData.position || { x: 0, y: 0 },
      size: shapeData.size || { width: 200, height: 200 },
      radius: shapeData.radius || 80,
      roundness: shapeData.roundness || 5,
      visible: shapeData.visible !== false,
      draggable: shapeData.draggable !== false,
      zIndex: shapeData.zIndex !== undefined ? shapeData.zIndex : 0,
      tint: shapeData.tint || [255, 255, 255],
    };
    
    this.state.shapes.set(id, shape);
    return id;
  }

  removeShape(id: string): boolean {
    const removed = this.state.shapes.delete(id);
    if (this.state.selectedShapeId === id) {
      this.state.selectedShapeId = null;
    }
    if (this.state.draggingShapeId === id) {
      this.state.draggingShapeId = null;
    }
    return removed;
  }

  getShape(id: string): Shape | undefined {
    return this.state.shapes.get(id);
  }

  getAllShapes(): Shape[] {
    return Array.from(this.state.shapes.values());
  }

  getVisibleShapes(): Shape[] {
    return this.getAllShapes()
      .filter(shape => shape.visible)
      // .sort((a, b) => a.zIndex - b.zIndex); // No longer needed for OIT
  }

  updateShape(id: string, updates: Partial<Shape>): boolean {
    const shape = this.state.shapes.get(id);
    if (!shape) return false;
    
    Object.assign(shape, updates);
    return true;
  }

  setShapePosition(id: string, position: { x: number; y: number }): boolean {
    return this.updateShape(id, { position });
  }

  setShapeSize(id: string, size: { width: number; height: number }): boolean {
    return this.updateShape(id, { size });
  }

  setShapeVisible(id: string, visible: boolean): boolean {
    return this.updateShape(id, { visible });
  }

  setShapeZIndex(id: string, zIndex: number): boolean {
    return this.updateShape(id, { zIndex });
  }

  selectShape(id: string | null): void {
    this.state.selectedShapeId = id;
  }

  getSelectedShape(): Shape | undefined {
    return this.state.selectedShapeId ? this.getShape(this.state.selectedShapeId) : undefined;
  }

  startDragging(id: string, startPos: { x: number; y: number }): boolean {
    const shape = this.getShape(id);
    if (!shape || !shape.draggable) return false;
    
    this.state.draggingShapeId = id;
    this.state.dragStartPos = startPos;
    this.state.dragStartShapePos = { ...shape.position };
    return true;
  }

  updateDragging(currentPos: { x: number; y: number }): boolean {
    if (!this.state.draggingShapeId) return false;
    
    const deltaX = currentPos.x - this.state.dragStartPos.x;
    const deltaY = currentPos.y - this.state.dragStartPos.y;
    
    const newPosition = {
      x: this.state.dragStartShapePos.x + deltaX,
      y: this.state.dragStartShapePos.y + deltaY,
    };
    
    return this.setShapePosition(this.state.draggingShapeId, newPosition);
  }

  stopDragging(): void {
    this.state.draggingShapeId = null;
  }

  isDragging(): boolean {
    return this.state.draggingShapeId !== null;
  }

  getDraggingShapeId(): string | null {
    return this.state.draggingShapeId;
  }

  // New method from guide
  private getShapeDefinition(shapeId: string) {
      // This should reference your shape definitions from App.tsx
      // You'll need to pass this data to ShapeManager
      // For now, returning a default tint
      const shape = this.getShape(shapeId);
      return shape ? { tint: shape.tint } : null;
  }

  // New method for batched shape data with alpha testing optimization
  public getBatchedShapeData(maxShapesPerBatch: number = 50): {
      batches: Array<{
          shapes: Shape[];
          zIndex: number;
          avgAlpha: number;
          tint: [number, number, number]; // [r, g, b] array format
      }>;
  } {
      const visibleShapes = this.getVisibleShapes();
      // Use a Map with a compound key to group by zIndex and tint
      const groups = new Map<string, Shape[]>();

      visibleShapes.forEach(shape => {
          // Use a consistent key for the tint object
          const tintKey = JSON.stringify(shape.tint);
          const key = `${shape.zIndex}-${tintKey}`;
          if (!groups.has(key)) {
              groups.set(key, []);
          }
          groups.get(key)!.push(shape);
      });
      
      const result: Array<{shapes: Shape[]; zIndex: number; avgAlpha: number; tint: [number, number, number]}> = [];
      
      // Split large groups into multiple batches
      for (const shapes of groups.values()) {
          if (shapes.length === 0) continue;
          
          // All shapes in this group have the same zIndex and tint
          const zIndex = shapes[0].zIndex;
          const tint = shapes[0].tint;
          const avgAlpha = 1.0; // Alpha is now controlled by controls config
          
          // Split into batches of maxShapesPerBatch
          for (let i = 0; i < shapes.length; i += maxShapesPerBatch) {
              const batchShapes = shapes.slice(i, i + maxShapesPerBatch);
              result.push({ shapes: batchShapes, zIndex, avgAlpha, tint });
          }
      }
      
      // Sort final batches by z-index (back to front)
      result.sort((a, b) => a.zIndex - b.zIndex);
      
      return { batches: result };
  }

  // New method to set shape definitions
  public setShapeDefinitions(definitions: Array<{ id: string; tint: [number, number, number] }>) {
      const defsById = new Map(definitions.map(d => [d.id, d]));
      for (const shape of this.state.shapes.values()) {
          const def = defsById.get(shape.id);
          if (def) {
              shape.tint = def.tint;
          }
      }
  }

  // Get shape at a specific screen position (for click detection)
  public getShapeAtPosition(
    worldPos: { x: number; y: number }
  ): string | null {
    const sortedShapes = this.getSortedShapes();

    // Iterate from top to bottom (highest zIndex first)
    for (let i = sortedShapes.length - 1; i >= 0; i--) {
      const shape = sortedShapes[i];
      if (!shape.visible) continue;

      const halfWidth = shape.size.width / 2;
      const halfHeight = shape.size.height / 2;

      if (
        worldPos.x >= shape.position.x - halfWidth &&
        worldPos.x <= shape.position.x + halfWidth &&
        worldPos.y >= shape.position.y - halfHeight &&
        worldPos.y <= shape.position.y + halfHeight
      ) {
        return shape.id; // Return the topmost shape found
      }
    }
    return null;
  }

  // Helper to get shapes sorted by zIndex
  private getSortedShapes(): Shape[] {
    return [...this.state.shapes.values()].sort((a, b) => a.zIndex - b.zIndex);
  }

  // Get shape data for shader uniforms
  getShapeDataForShader(
    camera: Camera | null,
    canvasInfo: { width: number; height: number; dpr: number }
  ): {
    positions: number[];
    sizes: number[];
    radii: number[];
    roundnesses: number[];
    visibilities: number[];
    zIndices: number[];
    isHoverShape: number[]; // Track which shapes are hover shapes (1.0 for hover, 0.0 for regular)
    count: number;
  } {
    const shapes = this.getAllShapes().filter(s => s.visible); // Use unsorted but visible shapes
    const maxShapes = 20; // Maximum shapes supported by shader
    
    const positions: number[] = [];
    const sizes: number[] = [];
    const radii: number[] = [];
    const roundnesses: number[] = [];
    const visibilities: number[] = [];
    const zIndices: number[] = [];
    const isHoverShape: number[] = [];
    
    // Fill arrays with shape data
    for (let i = 0; i < maxShapes; i++) {
      if (i < shapes.length) {
        const shape = shapes[i];

        if (camera) {
          const screenPos = camera.worldToScreen(shape.position.x, shape.position.y);
          const shaderPosX = -(screenPos.x - (canvasInfo.width / 2)) * canvasInfo.dpr;
          const shaderPosY = (screenPos.y - (canvasInfo.height / 2)) * canvasInfo.dpr;

          const screenSizeWidth = shape.size.width * camera.zoom * canvasInfo.dpr;
          const screenSizeHeight = shape.size.height * camera.zoom * canvasInfo.dpr;

          positions.push(shaderPosX, shaderPosY);
          sizes.push(screenSizeWidth, screenSizeHeight);
        } else {
          positions.push(shape.position.x, shape.position.y);
          sizes.push(shape.size.width, shape.size.height);
        }

        radii.push(shape.radius * (camera?.zoom ?? 1));
        roundnesses.push(shape.roundness);
        visibilities.push(shape.visible ? 1.0 : 0.0);
        zIndices.push(shape.zIndex);
        isHoverShape.push(shape.id === 'hover_shape' ? 1.0 : 0.0);
      } else {
        // Fill with default values for unused slots
        positions.push(0, 0);
        sizes.push(0, 0);
        radii.push(0);
        roundnesses.push(0);
        visibilities.push(0);
        zIndices.push(0);
        isHoverShape.push(0.0);
      }
    }
    
    return {
      positions,
      sizes,
      radii,
      roundnesses,
      visibilities,
      zIndices,
      isHoverShape,
      count: Math.min(shapes.length, maxShapes),
    };
  }

  // Serialize/deserialize for persistence
  serialize(): string {
    return JSON.stringify({
      shapes: Array.from(this.state.shapes.entries()),
      nextId: this.nextId,
    });
  }

  getShapeDataForTexture(
    camera: Camera,
    canvasInfo: { width: number; height: number; dpr: number }
  ): {
    data: Float32Array;
    width: number;
    height: number;
    count: number;
  } {
    const shapes = this.getAllShapes().filter(s => s.visible);
    const shapeCount = shapes.length;
    if (shapeCount === 0) {
      return { data: new Float32Array(), width: 0, height: 0, count: 0 };
    }

    // Use 3 pixels (RGBA = 4 floats) per shape
    // Pixel 1: (pos.x, pos.y, size.x, size.y)
    // Pixel 2: (radius, roundness, zIndex, isHoverShape)
    // Pixel 3: (tint[0], tint[1], tint[2], alpha)
    const floatsPerShape = 12;
    const data = new Float32Array(shapeCount * floatsPerShape);

    for (let i = 0; i < shapeCount; i++) {
      const shape = shapes[i];
      const offset = i * floatsPerShape;

      // Pixel 1
      if (camera) {
        const screenPos = camera.worldToScreen(shape.position.x, shape.position.y);
        const shaderPosX = -(screenPos.x - (canvasInfo.width / 2)) * canvasInfo.dpr;
        const shaderPosY = (screenPos.y - (canvasInfo.height / 2)) * canvasInfo.dpr;
        const screenSizeWidth = shape.size.width * camera.zoom * canvasInfo.dpr;
        const screenSizeHeight = shape.size.height * camera.zoom * canvasInfo.dpr;

        data[offset + 0] = shaderPosX;
        data[offset + 1] = shaderPosY;
        data[offset + 2] = screenSizeWidth;
        data[offset + 3] = screenSizeHeight;
      } else {
        data[offset + 0] = shape.position.x;
        data[offset + 1] = shape.position.y;
        data[offset + 2] = shape.size.width;
        data[offset + 3] = shape.size.height;
      }


      // Pixel 2
      if (camera) {
        data[offset + 4] = shape.radius * camera.zoom * canvasInfo.dpr;
      } else {
        data[offset + 4] = shape.radius;
      }
      data[offset + 5] = shape.roundness;
      data[offset + 6] = shape.zIndex;
      data[offset + 7] = shape.id === 'hover_shape' ? 1.0 : 0.0;

      // Pixel 3
      data[offset + 8] = shape.tint[0] / 255;
      data[offset + 9] = shape.tint[1] / 255;
      data[offset + 10] = shape.tint[2] / 255;
      data[offset + 11] = 1.0; // Alpha will be controlled by controls config
    }

    // For simplicity, using a 1D texture layout for now.
    // A 2D layout would be more robust for very large numbers of shapes.
    const textureWidth = shapeCount * 3;
    const textureHeight = 1;

    return {
      data,
      width: textureWidth,
      height: textureHeight,
      count: shapeCount,
    };
  }

  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.state.shapes = new Map(parsed.shapes);
      this.nextId = parsed.nextId || 1;
    } catch (error) {
      console.error('Failed to deserialize shape data:', error);
    }
  }
}
