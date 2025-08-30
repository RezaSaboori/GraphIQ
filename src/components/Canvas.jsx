import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { CoordinateSystem } from '../utils/coordinateSystem';

const Canvas = forwardRef(({ 
  children, 
  width = '100%', 
  height = '100%',
  showGrid = true,
  snapToGrid = true,
  onViewportChange,
  onCoordinateSystemReady,
  className = '',
  style = {}
}, ref) => {
  const canvasRef = useRef(null);
  const [coordinateSystem, setCoordinateSystem] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [viewportTransform, setViewportTransform] = useState({
    scale: 1.0,
    translateX: 0,
    translateY: 0,
    rotation: 0
  });

  // Expose coordinate system to parent via ref
  useImperativeHandle(ref, () => ({
    coordinateSystem,
    viewportTransform,
    resetViewport: () => {
      setViewportTransform({
        scale: 1.0,
        translateX: 0,
        translateY: 0,
        rotation: 0
      });
    }
  }), [coordinateSystem, viewportTransform]);

  // Initialize coordinate system
  useEffect(() => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const coordSystem = new CoordinateSystem(rect.width, rect.height);
      coordSystem.showGrid = showGrid;
      coordSystem.snapToGridEnabled = snapToGrid;
      
      // Ensure the coordinate system is properly initialized
      if (coordSystem && typeof coordSystem.snapToGrid === 'function') {
        setCoordinateSystem(coordSystem);
        
        // Notify parent that coordinate system is ready
        if (onCoordinateSystemReady) {
          onCoordinateSystemReady(coordSystem);
        }
      } else {
        console.error('Coordinate system failed to initialize properly');
      }
    }
  }, [showGrid, snapToGrid, onCoordinateSystemReady]);

  // Update coordinate system when viewport changes
  useEffect(() => {
    if (coordinateSystem && typeof coordinateSystem.updateViewportTransform === 'function') {
      try {
        coordinateSystem.updateViewportTransform(viewportTransform);
        onViewportChange?.(viewportTransform);
      } catch (error) {
        console.warn('Failed to update viewport transform:', error);
      }
    }
  }, [viewportTransform, coordinateSystem, onViewportChange]);

  // Handle mouse wheel for zooming
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5.0, viewportTransform.scale * zoomFactor));
    
    // Zoom towards mouse position
    const newTranslateX = mouseX - (mouseX - viewportTransform.translateX) * (newScale / viewportTransform.scale);
    const newTranslateY = mouseY - (mouseY - viewportTransform.translateY) * (newScale / viewportTransform.scale);
    
    setViewportTransform(prev => ({
      ...prev,
      scale: newScale,
      translateX: newTranslateX,
      translateY: newTranslateY
    }));
  }, [viewportTransform]);

  // Handle mouse down for panning
  const handleMouseDown = useCallback((e) => {
    if (e.button === 1 || e.button === 2) { // Middle or right mouse button
      e.preventDefault();
      setIsPanning(true);
      setPanStart({
        x: e.clientX - viewportTransform.translateX,
        y: e.clientY - viewportTransform.translateY
      });
    }
  }, [viewportTransform]);

  // Handle mouse move for panning
  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      setViewportTransform(prev => ({
        ...prev,
        translateX: e.clientX - panStart.x,
        translateY: e.clientY - panStart.y
      }));
    }
  }, [isPanning, panStart]);

  // Handle mouse up for panning
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handle context menu
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
  }, []);

  // Reset viewport
  const resetViewport = useCallback(() => {
    setViewportTransform({
      scale: 1.0,
      translateX: 0,
      translateY: 0,
      rotation: 0
    });
  }, []);

  // Only render children when coordinate system is ready
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { 
        coordinateSystem,
        viewportTransform 
      });
    }
    return child;
  });

  return (
    <div
      ref={canvasRef}
      className={`canvas-container ${className}`}
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : 'default',
        ...style
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      {/* Grid Background */}
      {showGrid && (
        <svg
          className="grid-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0
          }}
        >
          <defs>
            <pattern
              id="grid"
              width={20 * viewportTransform.scale}
              height={20 * viewportTransform.scale}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${20 * viewportTransform.scale} 0 L 0 0 0 ${20 * viewportTransform.scale}`}
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      )}

      {/* Canvas Content */}
      <div
        className="canvas-content"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: `
            translate(${viewportTransform.translateX}px, ${viewportTransform.translateY}px)
            scale(${viewportTransform.scale})
            rotate(${viewportTransform.rotation}rad)
          `,
          transformOrigin: '0 0',
          zIndex: 1
        }}
      >
        {childrenWithProps}
      </div>

      {/* Viewport Controls */}
      <div
        className="viewport-controls"
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '5px'
        }}
      >
        <button
          onClick={resetViewport}
          className="viewport-control-btn"
          style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            backdropFilter: 'blur(10px)'
          }}
        >
          Reset View
        </button>
        <div
          className="zoom-info"
          style={{
            padding: '4px 8px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            fontSize: '11px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)'
          }}
        >
          {Math.round(viewportTransform.scale * 100)}%
        </div>
      </div>

      {/* Coordinate System Info */}
      <div
        className="coordinate-info"
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          zIndex: 10,
          padding: '8px 12px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '4px',
          fontSize: '12px',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div>Origin: Top-Left</div>
        <div>Scale: {viewportTransform.scale.toFixed(2)}x</div>
        <div>Rotation: {(viewportTransform.rotation * 180 / Math.PI).toFixed(1)}°</div>
        <div>Grid: {coordinateSystem ? 'Active' : 'Initializing...'}</div>
      </div>
    </div>
  );
});

export default Canvas;
