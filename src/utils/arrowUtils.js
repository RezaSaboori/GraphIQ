/**
 * Arrow utilities for calculating tubelight positioning and effects
 */

/**
 * Calculate which side of a target card an arrow approaches from
 * @param {Object} toCard - Target card position and dimensions in world coordinates
 * @param {Object} arrowEnd - Actual arrow end point coordinates in world coordinates
 * @param {Object} coordinateSystem - Optional coordinate system for additional calculations
 * @returns {string} Side of the card (top, bottom, left, right)
 */
export function calculateArrowEndSide(toCard, arrowEnd, coordinateSystem = null) {
  // Calculate the center of the target card
  const cardCenter = {
    x: toCard.x + toCard.width / 2,
    y: toCard.y + toCard.height / 2
  };

  // Calculate the direction vector from card center to arrow end
  const directionVector = {
    x: arrowEnd.x - cardCenter.x,
    y: arrowEnd.y - cardCenter.y
  };

  // Calculate the distances to each edge
  const distanceToLeft = Math.abs(arrowEnd.x - toCard.x);
  const distanceToRight = Math.abs(arrowEnd.x - (toCard.x + toCard.width));
  const distanceToTop = Math.abs(arrowEnd.y - toCard.y);
  const distanceToBottom = Math.abs(arrowEnd.y - (toCard.y + toCard.height));

  // Find the closest edge
  const minDistance = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom);

  // Determine which side the arrow approaches from based on closest edge
  if (minDistance === distanceToLeft) {
    return 'left';
  } else if (minDistance === distanceToRight) {
    return 'right';
  } else if (minDistance === distanceToTop) {
    return 'top';
  } else {
    return 'bottom';
  }
}

/**
 * Calculate the effective tubelight length considering border radius
 * @param {number} sideLength - Length of the side
 * @param {number} borderRadius - Border radius of the card
 * @returns {number} Effective tubelight length
 */
export function calculateTubelightLength(sideLength, borderRadius = 30) {
  // Tubelight length is side length minus border radius
  return Math.max(0, sideLength - (borderRadius * 2));
}

/**
 * Generate CSS for tubelight positioning based on side
 * @param {string} side - Side of the card (top, bottom, left, right)
 * @param {number} effectiveLength - Effective length of the tubelight
 * @returns {Object} CSS styles for positioning
 */
export function getTubelightStyles(side, effectiveLength) {
  const baseStyles = {
    position: 'absolute',
    pointerEvents: 'none',
    '--edge-inset': '8px'
  };

  switch (side) {
    case 'top':
      return {
        ...baseStyles,
        top: 0,
        left: '30px', // Start after border radius
        width: `${effectiveLength}px`,
        height: '60%',
        maskImage: 'linear-gradient(to bottom, black 10%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 10%, transparent 100%)'
      };
    
    case 'bottom':
      return {
        ...baseStyles,
        bottom: 0,
        left: '30px', // Start after border radius
        width: `${effectiveLength}px`,
        height: '60%',
        maskImage: 'linear-gradient(to top, black 10%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to top, black 10%, transparent 100%)'
      };
    
    case 'left':
      return {
        ...baseStyles,
        left: 0,
        top: '30px', // Start after border radius
        width: '60%',
        height: `${effectiveLength}px`,
        maskImage: 'linear-gradient(to right, black 10%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, black 10%, transparent 100%)'
      };
    
    case 'right':
      return {
        ...baseStyles,
        right: 0,
        top: '30px', // Start after border radius
        width: '60%',
        height: `${effectiveLength}px`,
        maskImage: 'linear-gradient(to left, black 10%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to left, black 10%, transparent 100%)'
      };
    
    default:
      return baseStyles;
  }
}

/**
 * Generate CSS for tubelight line positioning
 * @param {string} side - Side of the card
 * @param {number} effectiveLength - Effective length
 * @returns {Object} CSS styles for the line
 */
export function getTubelightLineStyles(side, effectiveLength) {
  const baseStyles = {
    position: 'absolute',
    pointerEvents: 'none',
    '--edge-inset': '8px'
  };

  switch (side) {
    case 'top':
      return {
        ...baseStyles,
        top: 0,
        left: '30px',
        width: `${effectiveLength}px`,
        height: '2px',
        maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)'
      };
    
    case 'bottom':
      return {
        ...baseStyles,
        bottom: 0,
        left: '30px',
        width: `${effectiveLength}px`,
        height: '2px',
        maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)'
      };
    
    case 'left':
      return {
        ...baseStyles,
        left: 0,
        top: '30px',
        width: '2px',
        height: `${effectiveLength}px`,
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
      };
    
    case 'right':
      return {
        ...baseStyles,
        right: 0,
        top: '30px',
        width: '2px',
        height: `${effectiveLength}px`,
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
      };
    
    default:
      return baseStyles;
  }
}

export default {
  calculateArrowEndSide,
  calculateTubelightLength,
  getTubelightStyles,
  getTubelightLineStyles
};
