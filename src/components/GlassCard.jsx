import React, { forwardRef, useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { CoordinateSystem } from '../utils/coordinateSystem';
import { calculateTubelightLength, getTubelightStyles, getTubelightLineStyles } from '../utils/arrowUtils';

const GlassCard = forwardRef(({ 
  id, 
  className = '', 
  style, 
  width, 
  children, 
  position = { x: 0, y: 0 },
  onPositionChange,
  coordinateSystem,
  snapToGrid = true,
  tubelights = [], // Array of tubelight objects with color, side, and position data
  ...props 
}, ref) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  // Update position when position prop changes
  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.transform = `translate(${position.x}px, ${position.y}px)`;
    }
  }, [position]);

  const handleMouseDown = useCallback((e) => {
    if (e.target !== cardRef.current) return;
    
    setIsDragging(true);
    console.log('Mouse Down - isDragging:', true, 'isHovered:', isHovered);
    
    // Calculate offset from mouse position to the card's current position
    // Since we're using transform, we need to account for the current position
    const offsetX = e.clientX - position.x;
    const offsetY = e.clientY - position.y;
    
    setDragOffset({
      x: offsetX,
      y: offsetY
    });
    
    // Cursor will be updated via React state
  }, [position, isHovered]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;
    
    // Apply grid snapping if coordinate system is available and has the snapToGrid method
    if (coordinateSystem && snapToGrid && typeof coordinateSystem.snapToGrid === 'function') {
      try {
        const snapped = coordinateSystem.snapToGrid(newX, newY);
        newX = snapped.x;
        newY = snapped.y;
      } catch (error) {
        console.warn('Grid snapping failed:', error);
        // Continue without snapping if there's an error
      }
    }
    
    // Ensure the card stays within bounds if coordinate system is available
    if (coordinateSystem && typeof coordinateSystem.isWithinBounds === 'function') {
      try {
        const maxX = coordinateSystem.canvasWidth - (width || 400);
        const maxY = coordinateSystem.canvasHeight - 200; // Approximate height
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
      } catch (error) {
        console.warn('Boundary checking failed:', error);
        // Continue without boundary checking if there's an error
      }
    }
    
    if (onPositionChange) {
      onPositionChange({ x: newX, y: newY });
    }
  }, [isDragging, dragOffset, onPositionChange, coordinateSystem, snapToGrid, width]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      console.log('Mouse Up - isDragging:', false, 'isHovered:', isHovered);
      // Cursor will be updated via React state
    }
  }, [isDragging, isHovered]);

  const handleMouseEnter = useCallback(() => {
    if (!isDragging) {
      setIsHovered(true);
      console.log('Mouse Enter - isHovered:', true, 'isDragging:', isDragging);
    }
  }, [isDragging]);

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      setIsHovered(false);
      console.log('Mouse Leave - isHovered:', false, 'isDragging:', isDragging);
    }
  }, [isDragging]);

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Group tubelights by side for proper blending
  const groupedTubelights = useMemo(() => {
    const groups = {};
    
    tubelights.forEach(tubelight => {
      const side = tubelight.side;
      if (!groups[side]) {
        groups[side] = [];
      }
      groups[side].push(tubelight);
    });
    
    return groups;
  }, [tubelights]);

  const mergedStyle = {
    width: width != null ? `${width}px` : undefined,
    position: 'absolute',
    cursor: isDragging ? 'grabbing' : (isHovered ? 'grab' : 'move'),
    userSelect: 'none',
    ...style
  };

  // Force cursor update by adding it directly to the element
  useEffect(() => {
    if (cardRef.current) {
      const cursorValue = isDragging ? 'grabbing' : (isHovered ? 'grab' : 'move');
      cardRef.current.style.cursor = cursorValue;
      console.log('Direct cursor update:', cursorValue);
    }
  }, [isDragging, isHovered]);

  // Debug cursor state
  console.log('Cursor State - isDragging:', isDragging, 'isHovered:', isHovered, 'cursor:', mergedStyle.cursor);

  return (
    <div 
      id={id} 
      ref={(el) => {
        cardRef.current = el;
        if (ref) {
          if (typeof ref === 'function') {
            ref(el);
          } else {
            ref.current = el;
          }
        }
      }}
      className={`glass-card ${className}`} 
      style={mergedStyle} 
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {/* Tubelight Effects - Multiple layers for proper blending */}
      {Object.entries(groupedTubelights).map(([side, sideTubelights]) => {
        if (sideTubelights.length === 0) return null;
        
        // Calculate effective length for this side
        const sideLength = side === 'top' || side === 'bottom' ? width : 200; // Approximate height
        const effectiveLength = calculateTubelightLength(sideLength, 30);
        
        // Get base styles for this side
        const baseTubelightStyles = getTubelightStyles(side, { x: 0, y: 0 }, effectiveLength);
        const baseLineStyles = getTubelightLineStyles(side, { x: 0, y: 0 }, effectiveLength);
        
        return (
          <React.Fragment key={side}>
            {/* Tubelight Glow Layer - Behind blur layer */}
            <div 
              className="tubelight-glow-container"
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 0
              }}
            >
              {sideTubelights.map((tubelight, index) => (
                <div
                  key={`glow-${side}-${index}`}
                  className="tubelight-glow"
                  style={{
                    ...baseTubelightStyles,
                    background: tubelight.color,
                    filter: 'blur(35px)',
                    mixBlendMode: 'screen',
                    opacity: 0.9,
                    zIndex: index
                  }}
                />
              ))}
            </div>
            
            {/* Tubelight Blur Layer - Above glow, below content */}
            <div 
              className="tubelight-blur-container"
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 1
              }}
            >
              {sideTubelights.map((tubelight, index) => (
                <div
                  key={`blur-${side}-${index}`}
                  className="tubelight-blur"
                  style={{
                    ...baseTubelightStyles,
                    background: tubelight.color,
                    filter: 'blur(35px)',
                    mixBlendMode: 'screen',
                    opacity: 0.9,
                    zIndex: index
                  }}
                />
              ))}
            </div>
            
            {/* Tubelight Line Layer - Above all layers */}
            <div 
              className="tubelight-line-container"
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 10
              }}
            >
              {sideTubelights.map((tubelight, index) => (
                <div
                  key={`line-${side}-${index}`}
                  className="tubelight-line"
                  style={{
                    ...baseLineStyles,
                    background: tubelight.color,
                    mixBlendMode: 'screen',
                    opacity: 0.9,
                    zIndex: index
                  }}
                />
              ))}
            </div>
          </React.Fragment>
        );
      })}
      
      {/* Card Content */}
      <div className="card-content" style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
});

export default GlassCard;


