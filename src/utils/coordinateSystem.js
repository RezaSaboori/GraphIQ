/**
 * Professional Coordinate System for GraphIQ
 * 
 * Coordinate System Characteristics:
 * - Origin: Top-left corner of the canvas
 * - Units: Pixels (with support for scaling and transformation)
 * - Positive Directions: Right (X-axis), Down (Y-axis)
 * - Support for viewport transformations, zoom, and pan
 */

export class CoordinateSystem {
  constructor(canvasWidth = 1920, canvasHeight = 1080) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    
    // Viewport transformation matrix
    this.viewportTransform = {
      scale: 1.0,
      translateX: 0,
      translateY: 0,
      rotation: 0
    };
    
    // Grid settings
    this.gridSize = 20;
    this.showGrid = true;
    
    // Snap settings
    this.snapToGridEnabled = true;
    this.snapThreshold = 5;
  }

  /**
   * Convert screen coordinates to world coordinates
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {Object} World coordinates {x, y}
   */
  screenToWorld(screenX, screenY) {
    // First, remove the translation
    let x = screenX - this.viewportTransform.translateX;
    let y = screenY - this.viewportTransform.translateY;
    
    // Then, remove the scale
    x = x / this.viewportTransform.scale;
    y = y / this.viewportTransform.scale;
    
    // Finally, remove the rotation (apply inverse rotation)
    if (this.viewportTransform.rotation !== 0) {
      const cos = Math.cos(-this.viewportTransform.rotation);
      const sin = Math.sin(-this.viewportTransform.rotation);
      
      const rotatedX = x * cos - y * sin;
      const rotatedY = x * sin + y * cos;
      
      x = rotatedX;
      y = rotatedY;
    }
    
    return { x, y };
  }

  /**
   * Convert world coordinates to screen coordinates
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {Object} Screen coordinates {x, y}
   */
  worldToScreen(worldX, worldY) {
    let x = worldX;
    let y = worldY;
    
    // First, apply rotation
    if (this.viewportTransform.rotation !== 0) {
      const cos = Math.cos(this.viewportTransform.rotation);
      const sin = Math.sin(this.viewportTransform.rotation);
      
      const rotatedX = x * cos - y * sin;
      const rotatedY = x * sin + y * cos;
      
      x = rotatedX;
      y = rotatedY;
    }
    
    // Then, apply scale
    x = x * this.viewportTransform.scale;
    y = y * this.viewportTransform.scale;
    
    // Finally, apply translation
    const screenX = x + this.viewportTransform.translateX;
    const screenY = y + this.viewportTransform.translateY;
    
    return { x: screenX, y: screenY };
  }

  /**
   * Snap coordinates to grid
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object} Snapped coordinates {x, y}
   */
  snapToGrid(x, y) {
    if (!this.snapToGridEnabled) return { x, y };
    
    const snappedX = Math.round(x / this.gridSize) * this.gridSize;
    const snappedY = Math.round(y / this.gridSize) * this.gridSize;
    
    return { x: snappedX, y: snappedY };
  }

  /**
   * Check if coordinates are within canvas bounds
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if within bounds
   */
  isWithinBounds(x, y) {
    return x >= 0 && x <= this.canvasWidth && y >= 0 && y <= this.canvasHeight;
  }

  /**
   * Calculate distance between two points
   * @param {Object} point1 - First point {x, y}
   * @param {Object} point2 - Second point {x, y}
   * @returns {number} Distance in pixels
   */
  calculateDistance(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate angle between two points
   * @param {Object} point1 - First point {x, y}
   * @param {Object} point2 - Second point {x, y}
   * @returns {number} Angle in radians
   */
  calculateAngle(point1, point2) {
    return Math.atan2(point2.y - point1.y, point2.x - point1.x);
  }

  /**
   * Get grid lines for rendering
   * @returns {Array} Array of grid line objects
   */
  getGridLines() {
    if (!this.showGrid) return [];
    
    const lines = [];
    const step = this.gridSize * this.viewportTransform.scale;
    
    // Vertical lines
    for (let x = 0; x <= this.canvasWidth; x += step) {
      lines.push({
        type: 'vertical',
        x: x,
        y1: 0,
        y2: this.canvasHeight
      });
    }
    
    // Horizontal lines
    for (let y = 0; y <= this.canvasHeight; y += step) {
      lines.push({
        type: 'horizontal',
        y: y,
        x1: 0,
        x2: this.canvasWidth
      });
    }
    
    return lines;
  }

  /**
   * Update viewport transformation
   * @param {Object} transform - New transformation parameters
   */
  updateViewportTransform(transform) {
    this.viewportTransform = { ...this.viewportTransform, ...transform };
  }

  /**
   * Reset viewport to default
   */
  resetViewport() {
    this.viewportTransform = {
      scale: 1.0,
      translateX: 0,
      translateY: 0,
      rotation: 0
    };
  }

  /**
   * Get current viewport bounds in world coordinates
   * @returns {Object} Viewport bounds {left, top, right, bottom}
   */
  getViewportBounds() {
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.canvasWidth, this.canvasHeight);
    
    return {
      left: Math.min(topLeft.x, bottomRight.x),
      top: Math.min(topLeft.y, bottomRight.y),
      right: Math.max(topLeft.x, bottomRight.x),
      bottom: Math.max(topLeft.y, bottomRight.y)
    };
  }
}

/**
 * Utility functions for coordinate calculations
 */

/**
 * Calculate the closest point on a line segment to a given point
 * @param {Object} point - Point {x, y}
 * @param {Object} lineStart - Line start point {x, y}
 * @param {Object} lineEnd - Line end point {x, y}
 * @returns {Object} Closest point {x, y}
 */
export function closestPointOnLine(point, lineStart, lineEnd) {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) return { x: lineStart.x, y: lineStart.y };
  
  let param = dot / lenSq;
  
  if (param < 0) {
    return { x: lineStart.x, y: lineStart.y };
  } else if (param > 1) {
    return { x: lineEnd.x, y: lineEnd.y };
  }
  
  return {
    x: lineStart.x + param * C,
    y: lineStart.y + param * D
  };
}

/**
 * Calculate intersection point of two line segments
 * @param {Object} line1Start - First line start {x, y}
 * @param {Object} line1End - First line end {x, y}
 * @param {Object} line2Start - Second line start {x, y}
 * @param {Object} line2End - Second line end {x, y}
 * @returns {Object|null} Intersection point {x, y} or null if no intersection
 */
export function lineIntersection(line1Start, line1End, line2Start, line2End) {
  const x1 = line1Start.x, y1 = line1Start.y;
  const x2 = line1End.x, y2 = line1End.y;
  const x3 = line2Start.x, y3 = line2Start.y;
  const x4 = line2End.x, y4 = line2End.y;
  
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  
  if (Math.abs(denom) < 1e-10) return null;
  
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1)
    };
  }
  
  return null;
}

export default CoordinateSystem;
