/**
 * Draw a glass card on the canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} card - Card object with position, dimensions, and content
 * @param {Object} viewTransform - Current view transformation
 */
export function drawCard(ctx, card, viewTransform) {
  const { x, y, width, height, title, content, labels = [], properties = [], tubelights = [] } = card;
  
  // Save context for transformations
  ctx.save();
  
  // Apply card position
  ctx.translate(x, y);
  
  // Draw card background with glass effect
  drawCardBackground(ctx, width, height);
  
  // Draw tubelights
  drawTubelights(ctx, width, height, tubelights);
  
  // Draw card content
  drawCardContent(ctx, width, height, labels, properties);
  
  // Restore context
  ctx.restore();
}

/**
 * Draw the card background with glass effect
 */
function drawCardBackground(ctx, width, height) {
  // Create glass effect with gradients
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
  
  // Draw main card rectangle
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Draw border with subtle glow
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);
  
  // Add inner shadow effect
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  // Draw inner highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fillRect(2, 2, width - 4, height - 4);
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Draw tubelight effects around the card
 */
function drawTubelights(ctx, width, height, tubelights) {
  tubelights.forEach(tubelight => {
    const { color, side, from } = tubelight;
    
    // Create tubelight gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 0);
    
    if (side === 'top' || side === 'bottom') {
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, color + '80');
      gradient.addColorStop(1, 'transparent');
    } else {
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, color + '80');
      gradient.addColorStop(1, 'transparent');
    }
    
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.6;
    
    // Draw tubelight based on side
    switch (side) {
      case 'top':
        ctx.fillRect(0, -30, width, 30);
        break;
      case 'bottom':
        ctx.fillRect(0, height, width, 30);
        break;
      case 'left':
        ctx.fillRect(-30, 0, 30, height);
        break;
      case 'right':
        ctx.fillRect(width, 0, 30, height);
        break;
    }
    
    ctx.globalAlpha = 1.0;
  });
}

/**
 * Draw card content (labels and properties)
 */
function drawCardContent(ctx, width, height, labels, properties) {
  const padding = 20;
  let currentY = padding;
  
  // Draw labels
  if (labels.length > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '12px Arial, sans-serif';
    
    labels.forEach(label => {
      const labelWidth = ctx.measureText(label.text).width;
      const labelHeight = 20;
      
      // Draw label background
      ctx.fillStyle = label.color || 'rgba(100, 100, 100, 0.8)';
      ctx.fillRect(padding, currentY, labelWidth + 20, labelHeight);
      
      // Draw label text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText(label.text, padding + 10, currentY + 15);
      
      currentY += labelHeight + 10;
    });
  }
  
  // Draw properties
  if (properties.length > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '14px Arial, sans-serif';
    
    properties.forEach(property => {
      const text = `${property.name}: ${property.value}`;
      const lines = wrapText(ctx, text, width - 2 * padding);
      
      lines.forEach(line => {
        ctx.fillText(line, padding, currentY + 15);
        currentY += 20;
      });
      
      currentY += 5; // Spacing between properties
    });
  }
}

/**
 * Wrap text to fit within a given width
 */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];
  
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  
  lines.push(currentLine);
  return lines;
}
