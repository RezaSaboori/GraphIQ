import React from 'react';
import CanvasRenderer from './components/CanvasRenderer';
import { SceneProvider } from './context/SceneContext';

function App() {
  return (
    <SceneProvider>
      <div className="w-screen h-screen bg-gray-900">
        <CanvasRenderer
          showGrid={true}
          snapToGrid={true}
        />
      </div>
    </SceneProvider>
  );
}

export default App;
