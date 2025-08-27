import React, { useCallback } from 'react';
import GlassCard from './components/GlassCard.jsx';
import ArrowLayer from './components/ArrowLayer.jsx';
import useDraggable from './hooks/useDraggable.js';

const connections = [
  { from: 'card2', to: 'card1', label: '_Related', color: '#facc15' },
  { from: 'card1', to: 'card3', label: '_Connected', color: '#818cf8' },
  { from: 'card2', to: 'card3', label: '_Related', color: '#facc15' },
];

function App() {
  const redraw = useCallback(() => {
    // no-op; ArrowLayer listens to resize, but we can force rerender by toggling state if needed
  }, []);
  const bindDrag = useDraggable(redraw);

  return (
    <div className="w-screen h-screen flex items-center justify-center relative">
      <ArrowLayer connections={connections} />

      <GlassCard id="card1" width={400} style={{ top: '45%', left: '15%' }} {...bindDrag}>
        <div className="label-container">
          <div className="label label-green">personal history</div>
          <div className="label label-blue">risk factor</div>
          <div className="label label-red">Unspecified</div>
        </div>
        <div className="property">
          <span className="property-name">name :</span> Problems associated with the natural environment or human-made changes to the environment
        </div>
      </GlassCard>

      <GlassCard id="card2" width={400} style={{ top: '15%', left: '55%' }} {...bindDrag}>
        <div className="label-container">
          <div className="label label-green">personal history</div>
          <div className="label label-blue">risk factor</div>
          <div className="label label-red">Unspecified</div>
        </div>
        <div className="property">
          <span className="property-name">name :</span> Problems associated with the natural environment or human-made changes to the environment
        </div>
      </GlassCard>

      <GlassCard id="card3" width={400} style={{ top: '55%', left: '60%' }} {...bindDrag}>
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
    </div>
  );
}

export default App;
