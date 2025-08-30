import { useRef, useCallback, useState } from 'react';

export function usePerformance() {
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const renderTimesRef = useRef([]);
  const [metrics, setMetrics] = useState({
    fps: 0,
    avgRenderTime: 0,
    maxRenderTime: 0,
    minRenderTime: Infinity,
    frameCount: 0,
    memoryUsage: 0,
    canvasSize: { width: 0, height: 0 },
    isStatic: true,
    lastMovementTime: 0
  });

  const startRenderTimer = useCallback(() => {
    renderTimesRef.current.push(performance.now());
  }, []);

  const endRenderTimer = useCallback(() => {
    if (renderTimesRef.current.length > 0) {
      const startTime = renderTimesRef.current.pop();
      const renderTime = performance.now() - startTime;
      
      // Keep only last 60 render times for averaging
      if (renderTimesRef.current.length > 60) {
        renderTimesRef.current.shift();
      }
      
      renderTimesRef.current.push(renderTime);
    }
  }, []);

  const updateMetrics = useCallback(() => {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTimeRef.current;
    
    if (deltaTime >= 1000) { // Update every second
      const fps = Math.round((frameCountRef.current * 1000) / deltaTime);
      
      // Calculate render time statistics
      const renderTimes = renderTimesRef.current;
      const avgRenderTime = renderTimes.length > 0 
        ? Math.round(renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length)
        : 0;
      const maxRenderTime = renderTimes.length > 0 ? Math.round(Math.max(...renderTimes)) : 0;
      const minRenderTime = renderTimes.length > 0 ? Math.round(Math.min(...renderTimes)) : Infinity;
      
      // Get memory usage if available
      let memoryUsage = 0;
      if (performance.memory) {
        memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024); // MB
      }
      
      setMetrics({
        fps,
        avgRenderTime,
        maxRenderTime,
        minRenderTime: minRenderTime === Infinity ? 0 : minRenderTime,
        frameCount: frameCountRef.current,
        memoryUsage,
        canvasSize: { width: 0, height: 0 }
      });
      
      frameCountRef.current = 0;
      lastTimeRef.current = currentTime;
    }
    
    frameCountRef.current++;
  }, []);

  const updateCanvasSize = useCallback((width, height) => {
    setMetrics(prev => ({
      ...prev,
      canvasSize: { width, height }
    }));
  }, []);

  const updateMovementStatus = useCallback((isMoving) => {
    const currentTime = performance.now();
    console.log('📊 Performance Hook: updateMovementStatus called with:', isMoving ? 'ACTIVE' : 'STATIC');
    
    // If trying to set to ACTIVE, show detailed stack trace
    if (isMoving) {
      console.log('🚨 ATTENTION: Setting to ACTIVE - Full stack trace:');
      console.log('📊 Stack trace:', new Error().stack);
    }
    
    setMetrics(prev => ({
      ...prev,
      isStatic: !isMoving,
      lastMovementTime: isMoving ? currentTime : prev.lastMovementTime
    }));
  }, []);

  return {
    metrics,
    startRenderTimer,
    endRenderTimer,
    updateMetrics,
    updateCanvasSize,
    updateMovementStatus
  };
}
