import React, { useRef, useEffect, useState, useCallback } from 'react';
import Xarrow from 'react-xarrows';

const ArrowLayer = ({ connections, onArrowPositionsChange, coordinateSystem, viewportTransform }) => {
  const [arrowPositions, setArrowPositions] = useState({});
  const arrowRefs = useRef({});

  // Calculate arrow connection points based on card positions
  const calculateArrowEndPoint = (fromCard, toCard) => {
    const fromCenter = {
      x: fromCard.x + fromCard.width / 2,
      y: fromCard.y + fromCard.height / 2
    };
    
    const toCenter = {
      x: toCard.x + toCard.width / 2,
      y: toCard.y + toCard.height / 2
    };

    // Calculate direction vector
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    // Determine which side of the target card the arrow should connect to
    let connectionPoint;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection (left or right)
      if (dx > 0) {
        // Arrow goes right, connect to left side
        connectionPoint = {
          x: toCard.x,
          y: toCenter.y
        };
      } else {
        // Arrow goes left, connect to right side
        connectionPoint = {
          x: toCard.x + toCard.width,
          y: toCenter.y
        };
      }
    } else {
      // Vertical connection (top or bottom)
      if (dy > 0) {
        // Arrow goes down, connect to top side
        connectionPoint = {
          x: toCenter.x,
          y: toCard.y
        };
      } else {
        // Arrow goes up, connect to bottom side
        connectionPoint = {
          x: toCenter.x,
          y: toCard.y + toCard.height
        };
      }
    }

    return connectionPoint;
  };

  // Update arrow positions when connections change
  useEffect(() => {
    // Get card positions from the DOM
    const positions = {};
    
    connections.forEach(conn => {
      const arrowId = `${conn.from}-${conn.to}`;
      
      try {
        const fromCard = document.getElementById(conn.from);
        const toCard = document.getElementById(conn.to);
        
        if (fromCard && toCard) {
          const fromRect = fromCard.getBoundingClientRect();
          const toRect = toCard.getBoundingClientRect();
          
          // Convert to our coordinate system
          const fromCardPos = {
            x: fromRect.left,
            y: fromRect.top,
            width: fromRect.width,
            height: fromRect.height
          };
          
          const toCardPos = {
            x: toRect.left,
            y: toRect.top,
            width: toRect.width,
            height: toRect.height
          };
          
          // Calculate the connection point
          const connectionPoint = calculateArrowEndPoint(fromCardPos, toCardPos);
          
          positions[arrowId] = {
            from: conn.from,
            to: conn.to,
            endPoint: connectionPoint,
            color: conn.color,
            connection: conn
          };
        }
      } catch (error) {
        console.warn(`Failed to calculate arrow position for ${arrowId}:`, error);
      }
    });
    
    setArrowPositions(positions);
    onArrowPositionsChange?.(positions);
  }, [connections, onArrowPositionsChange]);

  // Force arrow position updates when viewport changes
  useEffect(() => {
    if (viewportTransform && coordinateSystem) {
      // Force a complete recalculation of arrow positions when viewport changes
      const timer = setTimeout(() => {
        // Trigger a re-render by updating the effect dependencies
        setArrowPositions(prev => ({ ...prev }));
        
        // Force Xarrow to recalculate by dispatching a resize event
        window.dispatchEvent(new Event('resize'));
        
        // Also try to force a DOM update
        Object.keys(arrowRefs.current).forEach(arrowId => {
          const arrowRef = arrowRefs.current[arrowId];
          if (arrowRef) {
            // Force a re-render by temporarily hiding and showing
            arrowRef.style.visibility = 'hidden';
            arrowRef.offsetHeight; // Force reflow
            arrowRef.style.visibility = 'visible';
          }
        });
      }, 100); // Increased delay to ensure DOM updates are complete
      
      return () => clearTimeout(timer);
    }
  }, [viewportTransform, coordinateSystem]);

  return (
    <>
      {connections.map((conn, index) => {
        const arrowId = `${conn.from}-${conn.to}`;
        
        return (
          <div
            key={`${arrowId}-${viewportTransform?.scale?.toFixed(3)}-${viewportTransform?.translateX?.toFixed(0)}-${viewportTransform?.translateY?.toFixed(0)}`}
            ref={el => arrowRefs.current[arrowId] = el}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            <Xarrow
              start={conn.from}
              end={conn.to}
              labels={conn.label}
              color={conn.color}
              strokeWidth={conn.width ?? 2}
              headSize={(conn.width ?? 2) * 2.5}
              curveness={0.8}
              path="smooth"
              arrowHeadProps={{
                style: {
                  strokeWidth: 0,
                },
              }}
            />
          </div>
        );
      })}
    </>
  );
};

export default ArrowLayer;


