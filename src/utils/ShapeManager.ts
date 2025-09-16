export interface Shape {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  radius: number;
  roundness: number;
  visible: boolean;
  draggable: boolean;
  zIndex: number;
  color?: { r: number; g: number; b: number; a: number };
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
      color: shapeData.color || { r: 255, g: 255, b: 255, a: 1 },
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
      .sort((a, b) => a.zIndex - b.zIndex); // Sort by zIndex (lower values render first/behind)
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

  // Get shape at a specific screen position (for click detection)
  public getShapeAtPosition(
    mousePos: { x: number; y: number },
    canvasInfo: { width: number; height: number; dpr: number },
  ): string | null {
    const sortedShapes = this.getSortedShapes();
    const dpr = canvasInfo.dpr || 1;

    // Convert mouse position to physical pixels for comparison
    const mousePhysX = mousePos.x * dpr;
    const mousePhysY = mousePos.y * dpr;

    // Iterate from top to bottom (highest zIndex first)
    for (let i = sortedShapes.length - 1; i >= 0; i--) {
      const shape = sortedShapes[i];
      if (!shape.visible) continue;

      // Center of the canvas in physical pixels
      const centerX = (canvasInfo.width * dpr) / 2;
      const centerY = (canvasInfo.height * dpr) / 2;

      // Shape's position is relative to the center, convert it to top-left physical coordinates
      const shapeX = centerX - shape.position.x - shape.size.width / 2;
      const shapeY = centerY + shape.position.y - shape.size.height / 2;

      if (
        mousePhysX >= shapeX &&
        mousePhysX <= shapeX + shape.size.width &&
        mousePhysY >= shapeY &&
        mousePhysY <= shapeY + shape.size.height
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
  getShapeDataForShader(): {
    positions: number[];
    sizes: number[];
    radii: number[];
    roundnesses: number[];
    visibilities: number[];
    zIndices: number[];
    isHoverShape: number[]; // Track which shapes are hover shapes (1.0 for hover, 0.0 for regular)
    count: number;
  } {
    const shapes = this.getVisibleShapes();
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
        positions.push(shape.position.x, shape.position.y);
        sizes.push(shape.size.width, shape.size.height);
        radii.push(shape.radius);
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
