import { getBoxToBoxCurve, interpolateCubicBezierAngle, interpolateCubicBezier } from 'proto-arrows';

/**
 * Draw a beautiful curved arrow using proto-arrows.
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D rendering context.
 * @param {object} arrow - The arrow object, containing from/to card references.
 * @param {object} viewTransform - The current viewport transformation.
 */
export function drawArrow(ctx, arrow, viewTransform) {
  const { from, to, label, color, width = 2 } = arrow;

  // Add padding around the cards for better arrow spacing
  const padding = 10;
  
  // Define the boxes for the start and end cards with padding.
  const startBox = { 
    x: from.x - padding, 
    y: from.y - padding, 
    w: from.width + (padding * 2), 
    h: from.height + (padding * 2) 
  };
  const endBox = { 
    x: to.x - padding, 
    y: to.y - padding, 
    w: to.width + (padding * 2), 
    h: to.height + (padding * 2) 
  };

  // Get the ideal curve from box to box.
  const curve = getBoxToBoxCurve(startBox, endBox);

  // Draw the arrow line.
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(curve.start.x, curve.start.y);
  ctx.bezierCurveTo(curve.control1.x, curve.control1.y, curve.control2.x, curve.control2.y, curve.end.x, curve.end.y);
  ctx.stroke();

  // Draw the arrow head.
  const angle = interpolateCubicBezierAngle(curve, 1);
  const arrowHeadSize = width * 4;
  ctx.save();
  ctx.translate(curve.end.x, curve.end.y);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.beginPath();
  ctx.moveTo(-arrowHeadSize, -arrowHeadSize / 2);
  ctx.lineTo(0, 0);
  ctx.lineTo(-arrowHeadSize, arrowHeadSize / 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();

  // Draw the label at the midpoint of the curve.
  if (label) {
    const midPoint = interpolateCubicBezier(curve, 0.5);
    ctx.font = 'bold 12px Arial, sans-serif';
    const textMetrics = ctx.measureText(label);
    const labelWidth = textMetrics.width + 16;
    const labelHeight = 24;

    // Draw label background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(midPoint.x - labelWidth / 2, midPoint.y - labelHeight / 2, labelWidth, labelHeight);

    // Draw label text
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, midPoint.x, midPoint.y);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}
