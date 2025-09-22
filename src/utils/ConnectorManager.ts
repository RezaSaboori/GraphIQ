import { ShapeManager } from './ShapeManager';
import { Camera } from './Camera';

export interface Connector {
  id: string;
  fromID: string;
  toID: string;
  tint: [number, number, number];
  weight: number;
}

export class ConnectorManager {
  private connectors: Map<string, Connector> = new Map();

  constructor(initialConnectors: Connector[] = []) {
    initialConnectors.forEach(connector => {
      this.addConnector(connector);
    });
  }

  addConnector(connectorData: Connector): string {
    this.connectors.set(connectorData.id, connectorData);
    return connectorData.id;
  }

  getAllConnectors(): Connector[] {
    return Array.from(this.connectors.values());
  }

  getConnectorDataForShader(
    shapeManager: ShapeManager,
    camera: Camera | null,
    canvasInfo: { width: number; height: number; dpr: number }
  ): {
    positions: number[];
    weights: number[];
    tints: number[];
    count: number;
  } {
    const connectors = this.getAllConnectors();
    const positions: number[] = [];
    const weights: number[] = [];
    const tints: number[] = [];
    let count = 0;

    for (const connector of connectors) {
      const fromShape = shapeManager.getShape(connector.fromID);
      const toShape = shapeManager.getShape(connector.toID);

      if (fromShape && toShape && camera) {
        const fromScreenPos = camera.worldToScreen(fromShape.position.x, fromShape.position.y);
        const toScreenPos = camera.worldToScreen(toShape.position.x, toShape.position.y);

        positions.push(fromScreenPos.x * canvasInfo.dpr, fromScreenPos.y * canvasInfo.dpr);
        positions.push(toScreenPos.x * canvasInfo.dpr, toScreenPos.y * canvasInfo.dpr);

        weights.push(connector.weight * camera.zoom * canvasInfo.dpr);
        tints.push(connector.tint[0] / 255, connector.tint[1] / 255, connector.tint[2] / 255);
        count++;
      }
    }

    return { positions, weights, tints, count };
  }
}
