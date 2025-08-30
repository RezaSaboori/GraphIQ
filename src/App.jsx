import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Xwrapper } from 'react-xarrows';
import Canvas from './components/Canvas';
import GlassCard from './components/GlassCard';
import ArrowLayer from './components/ArrowLayer';
import { calculateArrowEndSide } from './utils/arrowUtils';

const connections = [
  { from: 'card2', to: 'card1', label: '_Related', color: '#facc15', width: 4 },
  { from: 'card1', to: 'card3', label: '_Connected', color: '#818cf8', width: 4 },
  { from: 'card2', to: 'card3', label: '_Related', color: '#facc15', width: 4 },
];

function App() {
  const [cardPositions, setCardPositions] = useState({
    card1: { x: 200, y: 300 },
    card2: { x: 600, y: 150 },
    card3: { x: 500, y: 500 },
  });
  
  const [coordinateSystem, setCoordinateSystem] = useState(null);
  const [arrowPositions, setArrowPositions] = useState({});
  const canvasRef = useRef(null);

  const handleCardDrag = useCallback((cardId, newPosition) => {
    setCardPositions(prev => ({
      ...prev,
      [cardId]: newPosition
    }));
  }, []);

  const handleViewportChange = useCallback((viewportTransform) => {
    // Update coordinate system when viewport changes
    if (coordinateSystem) {
      coordinateSystem.updateViewportTransform(viewportTransform);
    }
  }, [coordinateSystem]);

  // Handle arrow position updates from ArrowLayer
  const handleArrowPositionsChange = useCallback((positions) => {
    setArrowPositions(positions);
  }, []);

  // Calculate tubelight information for each card based on actual arrow positions
  const cardTubelights = useMemo(() => {
    const tubelights = {};
    
    Object.values(arrowPositions).forEach(arrowData => {
      const targetCard = arrowData.to;
      
      if (!tubelights[targetCard]) {
        tubelights[targetCard] = [];
      }
      
      // Get target card position and dimensions
      const toCard = {
        x: cardPositions[targetCard]?.x || 0,
        y: cardPositions[targetCard]?.y || 0,
        width: 400,
        height: 200
      };
      
      // Use the actual arrow end position to determine the side
      const side = calculateArrowEndSide(toCard, arrowData.endPoint, coordinateSystem);
      
      tubelights[targetCard].push({
        color: arrowData.color,
        side: side,
        from: arrowData.from,
        connection: arrowData.connection
      });
    });
    
    return tubelights;
  }, [arrowPositions, cardPositions, coordinateSystem]);

  return (
    <div className="w-screen h-screen bg-gray-900">
      <Canvas
        ref={canvasRef}
        showGrid={true}
        snapToGrid={true}
        onViewportChange={handleViewportChange}
        onCoordinateSystemReady={setCoordinateSystem}
      >
        <Xwrapper>
          <ArrowLayer 
            connections={connections} 
            onArrowPositionsChange={handleArrowPositionsChange}
          />

          <GlassCard 
            id="card1" 
            width={400} 
            position={cardPositions.card1}
            onPositionChange={(pos) => handleCardDrag('card1', pos)}
            coordinateSystem={coordinateSystem}
            snapToGrid={true}
            tubelights={cardTubelights.card1 || []}
          >
            <div className="label-container">
              <div className="label label-green">personal history</div>
              <div className="label label-blue">risk factor</div>
              <div className="label label-red">Unspecified</div>
            </div>
            <div className="property">
              <span className="property-name">name :</span> Problems associated with the natural environment or human-made changes to the environment
            </div>
          </GlassCard>

          <GlassCard 
            id="card2" 
            width={400} 
            position={cardPositions.card2}
            onPositionChange={(pos) => handleCardDrag('card2', pos)}
            coordinateSystem={coordinateSystem}
            snapToGrid={true}
            tubelights={cardTubelights.card2 || []}
          >
            <div className="label-container">
              <div className="label label-green">personal history</div>
              <div className="label label-blue">risk factor</div>
              <div className="label label-red">Unspecified</div>
            </div>
            <div className="property">
              <span className="property-name">name :</span> Problems associated with the natural environment or human-made changes to the environment
            </div>
          </GlassCard>

          <GlassCard 
            id="card3" 
            width={400} 
            position={cardPositions.card3}
            onPositionChange={(pos) => handleCardDrag('card3', pos)}
            coordinateSystem={coordinateSystem}
            snapToGrid={true}
            tubelights={cardTubelights.card3 || []}
          >
            <div className="label-container">
              <div className="label label-orange">family history</div>
              <div className="label label-red">Unspecified</div>
            </div>
            <div className="property">
              <span className="property-name">name :</span> Family history of diseases of the blood or blood-forming organs
            </div>
            <div className="property">
              <span className="property-name">exclusions :</span> Occupational exposure to risk-factors
            </div>
          </GlassCard>
        </Xwrapper>
      </Canvas>
    </div>
  );
}

export default App;
