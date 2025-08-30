import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { CoordinateSystem } from '../utils/coordinateSystem';
import { drawCard, drawArrow } from '../rendering';
import { useScene } from '../context/SceneContext';
import { usePerformance } from '../hooks/usePerformance';
import PerformanceMonitor from './PerformanceMonitor';
const CanvasRenderer = forwardRef(({
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

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sceneDataRef = useRef({ cards: [], arrows: [] });
  const [coordinateSystem, setCoordinateSystem] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(true);
  const [isHoveringOverCard, setIsHoveringOverCard] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  
  // Use scene context for global state
  const { 
    viewTransform, 
    cards, 
    arrows, 
    actions, 
    utils,
    isDragging,
    selectedCard,
    dragOffset
  } = useScene();
  
  // Performance monitoring
  const { 
    metrics, 
    startRenderTimer, 
    endRenderTimer, 
    updateMetrics, 
    updateCanvasSize
  } = usePerformance();
  
  // Update scene data ref for render loop
  useEffect(() => {
    sceneDataRef.current = { cards: cards || [], arrows: arrows || [] };
  }, [cards, arrows]);
  

  
  const [localViewTransform, setLocalViewTransform] = useState({
    scale: 1.0,
    translateX: 0,
    translateY: 0,
    rotation: 0
  });
  
  // Use scene context viewTransform if available, otherwise use local
  const viewportTransform = viewTransform || localViewTransform;

  // Expose coordinate system to parent via ref
  useImperativeHandle(ref, () => ({
    coordinateSystem,
    viewportTransform,
    resetViewport: () => {
      if (actions?.resetViewport) {
        actions.resetViewport();
      } else {
        setLocalViewTransform({
          scale: 1.0,
          translateX: 0,
          translateY: 0,
          rotation: 0
        });
      }
    }
  }), [coordinateSystem, viewportTransform, actions]);

  // Initialize coordinate system
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const coordSystem = new CoordinateSystem(rect.width, rect.height);
      coordSystem.showGrid = showGrid;
      coordSystem.snapToGridEnabled = snapToGrid;
      
      setCoordinateSystem(coordSystem);
      
      // Notify parent that coordinate system is ready
      if (onCoordinateSystemReady) {
        onCoordinateSystemReady(coordSystem);
      }
    }
  }, [showGrid, snapToGrid, onCoordinateSystemReady]);

  // Add wheel event listener with passive: false to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const wheelHandler = (e) => {
        e.preventDefault();
        
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(5.0, viewportTransform.scale * zoomFactor));
        
        // Zoom towards mouse position
        const newTranslateX = mouseX - (mouseX - viewportTransform.translateX) * (newScale / viewportTransform.scale);
        const newTranslateY = mouseY - (mouseY - viewportTransform.translateY) * (newScale / viewportTransform.scale);
        
        const newTransform = {
          ...viewportTransform,
          scale: newScale,
          translateX: newTranslateX,
          translateY: newTranslateY
        };
        
        // Update viewport transform immediately for smooth zooming
        if (actions?.updateViewTransform) {
          actions.updateViewTransform(newTransform);
        } else {
          setLocalViewTransform(newTransform);
        }
      };
      
      // Add event listener with passive: false to allow preventDefault
      container.addEventListener('wheel', wheelHandler, { passive: false });
      
      return () => {
        container.removeEventListener('wheel', wheelHandler);
      };
    }
  }, [viewportTransform, actions]);

  // Update coordinate system when viewport changes
  useEffect(() => {
    if (coordinateSystem) {
      coordinateSystem.updateViewportTransform(viewportTransform);
      onViewportChange?.(viewportTransform);
    }
  }, [viewportTransform, coordinateSystem, onViewportChange]);

  // Handle mouse wheel for zooming with throttling
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5.0, viewportTransform.scale * zoomFactor));
    
    // Zoom towards mouse position
    const newTranslateX = mouseX - (mouseX - viewportTransform.translateX) * (newScale / viewportTransform.scale);
    const newTranslateY = mouseY - (mouseY - viewportTransform.translateY) * (newScale / viewportTransform.scale);
    
    const newTransform = {
      ...viewportTransform,
      scale: newScale,
      translateX: newTranslateX,
      translateY: newTranslateY
    };
    
    // Update viewport transform immediately for smooth zooming
    if (actions?.updateViewTransform) {
      actions.updateViewTransform(newTransform);
    } else {
      setLocalViewTransform(newTransform);
    }
  }, [viewportTransform, actions]);

  // Check if mouse is over a card and update cursor
  const checkCardHover = useCallback((mouseX, mouseY) => {
    if (!cards || cards.length === 0) {
      setIsHoveringOverCard(false);
      setHoveredCard(null);
      return;
    }

    // Convert screen coordinates to world coordinates
    const worldPos = utils.screenToWorld(mouseX, mouseY);
    
    // Check if we're hovering over a card
    const cardUnderMouse = cards.find(card => 
      worldPos.x >= card.x && 
      worldPos.x <= card.x + card.width &&
      worldPos.y >= card.y && 
      worldPos.y <= card.y + card.height
    );
    
    if (cardUnderMouse && cardUnderMouse !== hoveredCard) {
      setIsHoveringOverCard(true);
      setHoveredCard(cardUnderMouse);
      // Update cursor to grab
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grab';
      }
    } else if (!cardUnderMouse && isHoveringOverCard) {
      setIsHoveringOverCard(false);
      setHoveredCard(null);
      // Update cursor to default
      if (containerRef.current) {
        containerRef.current.style.cursor = 'default';
      }
    }
  }, [cards, utils, hoveredCard, isHoveringOverCard]);

  // Handle mouse down for panning and card selection
  const handleMouseDown = useCallback((e) => {
    if (e.button === 1 || e.button === 2) { // Middle or right mouse button
      e.preventDefault();
      setIsPanning(true);
      setPanStart({
        x: e.clientX - viewportTransform.translateX,
        y: e.clientY - viewportTransform.translateY
      });
      
      // Change cursor to grabbing when panning
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing';
      }
    } else if (e.button === 0) { // Left mouse button
      // Check for card selection
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Convert screen coordinates to world coordinates
      const worldPos = utils.screenToWorld(mouseX, mouseY);
      
      // Check if we clicked on a card
      const clickedCard = cards.find(card => 
        worldPos.x >= card.x && 
        worldPos.x <= card.x + card.width &&
        worldPos.y >= card.y && 
        worldPos.y <= card.y + card.height
      );
      
      if (clickedCard) {
        // Calculate the offset from where we clicked to the card's top-left corner
        const dragOffset = {
          x: worldPos.x - clickedCard.x,
          y: worldPos.y - clickedCard.y
        };
        
        // Change cursor to grabbing when starting to drag
        if (containerRef.current) {
          containerRef.current.style.cursor = 'grabbing';
        }
        
        actions.selectCard(clickedCard.id);
        actions.setDragOffset(dragOffset);
        actions.startDrag(worldPos);
      }
    }
  }, [viewportTransform, utils, cards, actions]);

  // Handle mouse move for panning and card dragging with throttling
  const handleMouseMove = useCallback((e) => {
    // Check for card hover
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    if (!isPanning && !isDragging) {
      checkCardHover(mouseX, mouseY);
    }
    
    if (isPanning) {
      const newTransform = {
        ...viewportTransform,
        translateX: e.clientX - panStart.x,
        translateY: e.clientY - panStart.y
      };
      
      // Update viewport transform immediately for smooth panning
      if (actions?.updateViewTransform) {
        actions.updateViewTransform(newTransform);
      } else {
        setLocalViewTransform(newTransform);
      }
      

    } else if (isDragging && selectedCard) {
      // Handle card dragging with throttling
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Convert screen coordinates to world coordinates
      const worldPos = utils.screenToWorld(mouseX, mouseY);
      
      // Apply drag offset to maintain the same relative position under the mouse
      const newX = worldPos.x - dragOffset.x;
      const newY = worldPos.y - dragOffset.y;
      
      // Update card position (this will be throttled by the scene context)
      actions.updateCardPosition(selectedCard, newX, newY);
      

    }
  }, [isPanning, panStart, viewportTransform, actions, isDragging, selectedCard, utils, dragOffset, checkCardHover]);

  // Handle mouse up for panning and card dragging
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    
    // End card dragging if active
    if (isDragging) {
      actions.endDrag();
      
      // Restore cursor based on hover state
      if (containerRef.current) {
        if (isHoveringOverCard) {
          containerRef.current.style.cursor = 'grab';
        } else {
          containerRef.current.style.cursor = 'default';
        }
      }
    } else if (isPanning) {
      // Restore cursor based on hover state after panning
      if (containerRef.current) {
        if (isHoveringOverCard) {
          containerRef.current.style.cursor = 'grab';
        } else {
          containerRef.current.style.cursor = 'default';
        }
      }
    }
  }, [isDragging, actions, isHoveringOverCard, isPanning]);

  // Handle context menu
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
  }, []);

  // Reset viewport
  const resetViewport = useCallback(() => {
    if (actions?.resetViewport) {
      actions.resetViewport();
    } else {
      setLocalViewTransform({
        scale: 1.0,
        translateX: 0,
        translateY: 0,
        rotation: 0
      });
    }
  }, [actions]);

  // Main render loop
  const render = useCallback(() => {
    if (!canvasRef.current || !coordinateSystem) return;
    
    // Start performance timer
    startRenderTimer();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return; // Ensure context is available
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply view transformation
    ctx.save();
    ctx.scale(viewportTransform.scale, viewportTransform.scale);
    ctx.translate(-viewportTransform.translateX, -viewportTransform.translateY);
    
    // Draw grid if enabled
    if (showGrid) {
      drawGrid(ctx, coordinateSystem, viewportTransform);
    }
    
    // Draw scene objects using ref to avoid dependency issues
    drawScene(ctx, coordinateSystem, viewportTransform, sceneDataRef.current);
    
    // Restore context
    ctx.restore();
    
    // End performance timer and update metrics
    endRenderTimer();
    updateMetrics();
  }, [coordinateSystem, viewportTransform.scale, viewportTransform.translateX, viewportTransform.translateY, showGrid, startRenderTimer, endRenderTimer, updateMetrics]);

  // Start render loop with frame rate limiting
  useEffect(() => {
    if (coordinateSystem && canvasRef.current) {
      let lastTime = 0;
      const targetFPS = 60;
      const frameInterval = 1000 / targetFPS;
      
      const renderLoop = (currentTime) => {
        if (currentTime - lastTime >= frameInterval) {
          lastTime = currentTime;
          render();
        }
        animationFrameRef.current = requestAnimationFrame(renderLoop);
      };
      
      // Start the render loop immediately
      animationFrameRef.current = requestAnimationFrame(renderLoop);
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [coordinateSystem, render]);

  // Handle canvas resize
  const handleResize = useCallback(() => {
    if (containerRef.current && canvasRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      
      // Use device pixel ratio for crisp rendering
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = rect.width;
      const displayHeight = rect.height;
      
      // Set canvas size in memory (scaled up for device pixel ratio)
      canvasRef.current.width = displayWidth * dpr;
      canvasRef.current.height = displayHeight * dpr;
      
      // Set canvas size in CSS pixels
      canvasRef.current.style.width = displayWidth + 'px';
      canvasRef.current.style.height = displayHeight + 'px';
      
      // Scale the drawing context so everything draws at the correct size
      const ctx = canvasRef.current.getContext('2d');
      ctx.scale(dpr, dpr);
      
      // Update coordinate system
      if (coordinateSystem) {
        coordinateSystem.canvasWidth = displayWidth;
        coordinateSystem.canvasHeight = displayHeight;
      }
      
      // Update performance metrics with new canvas size
      updateCanvasSize(displayWidth, displayHeight);
    }
  }, [coordinateSystem]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Keyboard shortcuts
    const handleKeyDown = (e) => {
      if (e.key === 'p' || e.key === 'P') {
        setShowPerformanceMonitor(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleResize]);

  return (
    <div
      ref={containerRef}
      className={`canvas-container ${className}`}
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : 'default',
        ...style
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%'
        }}
      />
      
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
                <div>Objects: {cards?.length || 0} cards, {arrows?.length || 0} arrows</div>
      </div>
      
      {/* Performance Monitor */}
      <PerformanceMonitor
        isVisible={showPerformanceMonitor}
        onToggleVisibility={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
        metrics={metrics}
      />
    </div>
  );
});

// Grid drawing function with optimization
function drawGrid(ctx, coordinateSystem, viewportTransform) {
  const gridSize = coordinateSystem.gridSize * viewportTransform.scale;
  const canvasWidth = coordinateSystem.canvasWidth;
  const canvasHeight = coordinateSystem.canvasHeight;
  
  // Skip grid if too small or too large
  if (gridSize < 5 || gridSize > 100) return;
  
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  
  // Batch all grid lines for better performance
  ctx.beginPath();
  
  // Vertical lines
  for (let x = 0; x <= canvasWidth; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
  }
  
  // Horizontal lines
  for (let y = 0; y <= canvasHeight; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
  }
  
  ctx.stroke();
}

// Scene drawing function
function drawScene(ctx, coordinateSystem, viewportTransform, sceneData) {
  if (!sceneData) return;
  
  // Draw cards
  sceneData.cards.forEach(card => {
    drawCard(ctx, card, viewportTransform);
  });
  
  // Draw arrows with proper from/to card references
  sceneData.arrows.forEach(arrow => {
    const fromCard = sceneData.cards.find(card => card.id === arrow.from);
    const toCard = sceneData.cards.find(card => card.id === arrow.to);
    
    if (fromCard && toCard) {
      const arrowData = {
        ...arrow,
        from: fromCard,
        to: toCard
      };
      drawArrow(ctx, arrowData, viewportTransform);
    }
  });
}

export default CanvasRenderer;
