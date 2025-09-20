import { mat4, vec4 } from 'gl-matrix';

type Vec2 = { x: number; y: number };

interface Node {
  position: { x: number; y: number };
  width?: number;
  height?: number;
}

export class Camera {
  viewportWidth: number;
  viewportHeight: number;
  position: Vec2 = { x: 0, y: 0 };   // Camera center, in world space
  zoom: number = 1.0;                  // Uniform zoom, default 1 (1:1)
  projection: mat4;
  view: mat4;
  viewProjection: mat4;

  constructor(viewportWidth: number, viewportHeight: number) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.position = { x: 0, y: 0 };   // Camera center, in world space
    this.zoom = 1.0;                  // Uniform zoom, default 1 (1:1)
    this._recalc();
  }

  setViewportSize(width: number, height: number) {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this._recalc();
  }

  setCenter(x: number, y: number) {
    this.position.x = x;
    this.position.y = y;
    this._recalc();
  }

  setZoom(zoom: number) {
    this.zoom = zoom;
    this._recalc();
  }

  _recalc() {
    // Orthographic: world units = pixels at zoom=1.0
    const hw = this.viewportWidth / (2 * this.zoom);
    const hh = this.viewportHeight / (2 * this.zoom);
    this.projection = mat4.ortho(mat4.create(), -hw, hw, -hh, hh, -1000, 1000);

    // View: center on camera position.
    this.view = mat4.create();
    mat4.translate(this.view, this.view, [-this.position.x, -this.position.y, 0]);

    // viewProjection = projection * view
    this.viewProjection = mat4.create();
    mat4.multiply(this.viewProjection, this.projection, this.view);
  }

  // ===== Coordinate Conversion =====

  // World → Screen (pixel space) :: output: { x, y }
  worldToScreen(wx: number, wy: number): Vec2 {
    const world = vec4.fromValues(wx, wy, 0, 1);
    const out = vec4.create();
    vec4.transformMat4(out, world, this.viewProjection);

    const ndcX = out[0] / out[3];
    const ndcY = out[1] / out[3];

    return {
      x: (ndcX + 1) * 0.5 * this.viewportWidth,
      y: (1 - ndcY) * 0.5 * this.viewportHeight // Canvas Y: 0 = top
    }
  }

  // Screen (pixel) → World
  screenToWorld(sx: number, sy: number): Vec2 {
    const ndcX = (sx / this.viewportWidth) * 2 - 1;
    const ndcY = 1 - (sy / this.viewportHeight) * 2;
    const clip = vec4.fromValues(ndcX, ndcY, 0, 1);
    const invVP = mat4.invert(mat4.create(), this.viewProjection);
    const out = vec4.create();
    vec4.transformMat4(out, clip, invVP);
    return { x: out[0] / out[3], y: out[1] / out[3] }
  }

  // ===== View Fitting =====
  // Auto-fit viewport to a set of objects (nodes)
  fitToView(nodes: Node[], padding: number = 100) {
    if (!nodes || nodes.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
      const x = node.position.x;
      const y = node.position.y;
      const width = node.width || 300;
      const height = node.height || 100;
      minX = Math.min(minX, x - width/2);
      minY = Math.min(minY, y - height/2);
      maxX = Math.max(maxX, x + width/2);
      maxY = Math.max(maxY, y + height/2);
    }
    minX -= padding; minY -= padding; maxX += padding; maxY += padding;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    const zoomX = this.viewportWidth / graphWidth;
    const zoomY = this.viewportHeight / graphHeight;
    const zoom = Math.min(zoomX, zoomY, 1.0); // Don't zoom in more than 1:1
    this.setCenter(centerX, centerY);
    this.setZoom(zoom);
  }
}
