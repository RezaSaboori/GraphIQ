/**
 * Draw an arrow on the canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} arrow - Arrow object with start, end, and styling properties
 * @param {Object} viewTransform - Current view transformation
 */
export function drawArrow(ctx, arrow, viewTransform) {
  const { from, to, label, color, width = 2, curveness = 0.8 } = arrow;
  
  // Calculate arrow path
  const path = calculateArrowPath(from, to, curveness);
  
  // Draw arrow line
  drawArrowLine(ctx, path, color, width);
  
  // Draw arrow head
  drawArrowHead(ctx, path.end, path.control, color, width);
  
  // Draw label if provided
  if (label) {
    drawArrowLabel(ctx, path, label, color);
  }
}

/**
 * Calculate the curved path for an arrow
 */
function calculateArrowPath(from, to, curveness) {
  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  
  // Calculate midpoint
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  
  // Calculate perpendicular offset for curve
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length === 0) return { start, end, control: { x: midX, y: midY } };
  
  // Normalize and rotate 90 degrees for perpendicular
  const perpX = -dy / length;
  const perpY = dx / length;
  
  // Control point for curve
  const control = {
    x: midX + perpX * length * curveness,
    y: midY + perpY * length * curveness
  };
  
  return { start, end, control };
}

/**
 * Draw the arrow line with curve
 */
function drawArrowLine(ctx, path, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Create quadratic curve
  ctx.beginPath();
  ctx.moveTo(path.start.x, path.start.y);
  ctx.quadraticCurveTo(path.control.x, path.control.y, path.end.x, path.end.y);
  ctx.stroke();
}

/**
 * Draw the arrow head
 */
function drawArrowHead(ctx, end, control, color, width) {
  const headSize = width * 2.5;
  
  // Calculate direction vector from control to end
  const dx = end.x - control.x;
  const dy = end.y - control.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length === 0) return;
  
  // Normalize direction
  const dirX = dx / length;
  const dirY = dy / length;
  
  // Calculate perpendicular for arrow head wings
  const perpX = -dirY;
  const perpY = dirX;
  
  // Arrow head points
  const tip = end;
  const leftWing = {
    x: end.x - dirX * headSize + perpX * headSize * 0.5,
    y: end.y - dirY * headSize + perpY * headSize * 0.5
  };
  const rightWing = {
    x: end.x - dirX * headSize - perpX * headSize * 0.5,
    y: end.y - dirY * headSize - perpY * headSize * 0.5
  };
  
  // Draw arrow head
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(leftWing.x, leftWing.y);
  ctx.lineTo(rightWing.x, rightWing.y);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw the arrow label
 */
function drawArrowLabel(ctx, path, label, color) {
  // Calculate a better position along the curve for the label
  // Use a point that's 60% along the curve for better visibility
  const t = 0.6;
  
  // Calculate position along the quadratic curve
  const labelX = (1 - t) * (1 - t) * path.start.x + 
                 2 * (1 - t) * t * path.control.x + 
                 t * t * path.end.x;
  const labelY = (1 - t) * (1 - t) * path.start.y + 
                 2 * (1 - t) * t * path.control.y + 
                 t * t * path.end.y;
  
  // Calculate tangent direction at this point for label orientation
  const tangentX = 2 * (1 - t) * (path.control.x - path.start.x) + 
                   2 * t * (path.end.x - path.control.x);
  const tangentY = 2 * (1 - t) * (path.control.y - path.start.y) + 
                   2 * t * (path.end.y - path.control.y);
  
  // Normalize tangent
  const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
  if (tangentLength > 0) {
    const normalizedTangentX = tangentX / tangentLength;
    const normalizedTangentY = tangentY / tangentLength;
    
    // Calculate perpendicular for label offset
    const perpX = -normalizedTangentY;
    const perpY = normalizedTangentX;
    
    // Offset label perpendicular to the curve for better visibility
    const offsetDistance = 15;
    const finalLabelX = labelX + perpX * offsetDistance;
    const finalLabelY = labelY + perpY * offsetDistance;
    
    // Set font before measuring text
    ctx.font = 'bold 12px Arial, sans-serif';
    
    // Label background with better sizing
    const textMetrics = ctx.measureText(label);
    const labelWidth = textMetrics.width + 16;
    const labelHeight = 24;
    
    // Draw label background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    
    // Simple rectangle background (easier to debug and more reliable)
    ctx.fillRect(finalLabelX - labelWidth / 2, finalLabelY - labelHeight / 2, labelWidth, labelHeight);
    
    // Label text
    ctx.fillStyle = color;
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, finalLabelX, finalLabelY);
    
    // Reset text alignment
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}
