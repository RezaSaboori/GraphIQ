import React, { useState } from 'react';

const PerformanceMonitor = ({ metrics, isVisible, onToggleVisibility }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Color coding functions with static state consideration
  const getFPSColor = (fps, isStatic) => {
    if (isStatic) {
      // When static, lower FPS is normal and acceptable
      if (fps >= 25) return '#10b981'; // Green - Excellent for static
      if (fps >= 15) return '#f59e0b'; // Yellow - Good for static
      if (fps >= 8) return '#f97316'; // Orange - Fair for static
      return '#ef4444'; // Red - Poor even for static
    } else {
      // When moving, expect higher FPS
      if (fps >= 55) return '#10b981'; // Green - Excellent
      if (fps >= 45) return '#f59e0b'; // Yellow - Good
      if (fps >= 30) return '#f97316'; // Orange - Fair
      return '#ef4444'; // Red - Poor
    }
  };

  const getRenderTimeColor = (time) => {
    if (time <= 8) return '#10b981'; // Green - Excellent
    if (time <= 16) return '#f59e0b'; // Yellow - Good
    if (time <= 33) return '#f97316'; // Orange - Fair
    return '#ef4444'; // Red - Poor
  };

  const getMemoryColor = (memory) => {
    if (memory <= 50) return '#10b981'; // Green - Low
    if (memory <= 100) return '#f59e0b'; // Yellow - Medium
    if (memory <= 200) return '#f97316'; // Orange - High
    return '#ef4444'; // Red - Very High
  };

  const getPerformanceGrade = () => {
    const { fps, avgRenderTime, isStatic } = metrics;
    
    if (isStatic) {
      // When static, be more lenient with FPS requirements
      if (fps >= 25 && avgRenderTime <= 8) return { grade: 'A', color: '#10b981', label: 'Excellent (Static)' };
      if (fps >= 15 && avgRenderTime <= 16) return { grade: 'B', color: '#f59e0b', label: 'Good (Static)' };
      if (fps >= 8 && avgRenderTime <= 33) return { grade: 'C', color: '#f97316', label: 'Fair (Static)' };
      return { grade: 'D', color: '#ef4444', label: 'Poor (Static)' };
    } else {
      // When moving, expect higher performance
      if (fps >= 55 && avgRenderTime <= 8) return { grade: 'A', color: '#10b981', label: 'Excellent (Active)' };
      if (fps >= 45 && avgRenderTime <= 16) return { grade: 'B', color: '#f59e0b', label: 'Good (Active)' };
      if (fps >= 30 && avgRenderTime <= 33) return { grade: 'C', color: '#f97316', label: 'Fair (Active)' };
      return { grade: 'D', color: '#ef4444', label: 'Poor (Active)' };
    }
  };

  const showDetailedTooltip = (event, type) => {
    const rect = event.currentTarget.getBoundingClientRect();
    let content = '';
    
    switch (type) {
             case 'fps':
         content = `
           <strong>FPS (Frames Per Second)</strong><br/>
           Current: ${metrics.fps} FPS<br/>
           Status: ${metrics.isStatic ? '🟦 Static (No Movement)' : '🟢 Active (Moving)'}<br/>
           <br/>
           <strong>Performance Levels (Static):</strong><br/>
           🟢 25+ FPS: Excellent (Normal for static)<br/>
           🟡 15-24 FPS: Good (Normal for static)<br/>
           🟠 8-14 FPS: Fair (Acceptable for static)<br/>
           🔴 <8 FPS: Poor (Even for static)<br/>
           <br/>
           <strong>Performance Levels (Active):</strong><br/>
           🟢 55-60 FPS: Excellent<br/>
           🟡 45-54 FPS: Good<br/>
           🟠 30-44 FPS: Fair<br/>
           🔴 <30 FPS: Poor
         `;
        break;
      case 'render':
        content = `
          <strong>Render Performance</strong><br/>
          Average: ${metrics.avgRenderTime}ms<br/>
          Maximum: ${metrics.maxRenderTime}ms<br/>
          Minimum: ${metrics.minRenderTime}ms<br/>
          <br/>
          <strong>Target:</strong> < 16.67ms (60 FPS)<br/>
          <br/>
          <strong>Performance Levels:</strong><br/>
          🟢 0-8ms: Excellent<br/>
          🟡 9-16ms: Good<br/>
          🟠 17-33ms: Fair<br/>
          🔴 >33ms: Poor
        `;
        break;
      case 'memory':
        content = `
          <strong>Memory Usage</strong><br/>
          Current: ${metrics.memoryUsage} MB<br/>
          <br/>
          <strong>Performance Levels:</strong><br/>
          🟢 0-50 MB: Low<br/>
          🟡 51-100 MB: Medium<br/>
          🟠 101-200 MB: High<br/>
          🔴 >200 MB: Very High<br/>
          <br/>
          <strong>Note:</strong> High memory usage may indicate memory leaks or inefficient rendering.
        `;
        break;
      case 'canvas':
        content = `
          <strong>Canvas Information</strong><br/>
          Width: ${metrics.canvasSize.width}px<br/>
          Height: ${metrics.canvasSize.height}px<br/>
          Total Pixels: ${(metrics.canvasSize.width * metrics.canvasSize.height).toLocaleString()}<br/>
          <br/>
          <strong>Performance Impact:</strong><br/>
          Larger canvases require more processing power.<br/>
          Consider reducing canvas size for better performance.
        `;
        break;
             case 'overall':
         const grade = getPerformanceGrade();
         content = `
           <strong>Overall Performance Grade: ${grade.grade}</strong><br/>
           Status: ${grade.label}<br/>
           <br/>
           <strong>Current Metrics:</strong><br/>
           FPS: ${metrics.fps} (${getFPSColor(metrics.fps, metrics.isStatic) === '#10b981' ? '🟢' : getFPSColor(metrics.fps, metrics.isStatic) === '#f59e0b' ? '🟡' : getFPSColor(metrics.fps, metrics.isStatic) === '#f97316' ? '🟠' : '🔴'})<br/>
           Render Time: ${metrics.avgRenderTime}ms (${getRenderTimeColor(metrics.avgRenderTime) === '#10b981' ? '🟢' : getRenderTimeColor(metrics.avgRenderTime) === '#f59e0b' ? '🟡' : getRenderTimeColor(metrics.avgRenderTime) === '#f97316' ? '🟠' : '🔴'})<br/>
           Memory: ${metrics.memoryUsage}MB (${getMemoryColor(metrics.memoryUsage) === '#10b981' ? '🟢' : getMemoryColor(metrics.memoryUsage) === '#f59e0b' ? '🟡' : getMemoryColor(metrics.memoryUsage) === '#f97316' ? '🟠' : '🔴'})<br/>
           Canvas State: ${metrics.isStatic ? '🟦 Static (No Movement)' : '🟢 Active (Moving)'}<br/>
           <br/>
           <strong>Performance Context:</strong><br/>
           ${metrics.isStatic ? 
             '🟦 <strong>Static Mode:</strong> Lower FPS (15-30) is normal and expected when the canvas is not moving. This is browser optimization to save resources.' :
             '🟢 <strong>Active Mode:</strong> Higher FPS (45-60) is expected during movement, panning, or zooming operations.'
           }<br/>
           <br/>
           <strong>Recommendations:</strong><br/>
           ${grade.grade === 'A' ? '🎉 Performance is excellent! Keep up the good work.' : 
             grade.grade === 'B' ? '👍 Performance is good. Minor optimizations may help.' :
             grade.grade === 'C' ? '⚠️ Performance is fair. Consider optimizing rendering or reducing scene complexity.' :
             '🚨 Performance is poor. Immediate optimization required.'}
         `;
        break;
      default:
        break;
    }
    
    setTooltipContent(content);
    setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top - 10 });
    setShowTooltip(true);
  };

  const hideTooltip = () => {
    setShowTooltip(false);
  };

  if (!isVisible) return null;

  const performanceGrade = getPerformanceGrade();

  return (
    <>
      <div
        className="performance-monitor"
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 20,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          padding: '12px',
          color: 'white',
          fontSize: '12px',
          fontFamily: 'monospace',
          backdropFilter: 'blur(10px)',
          minWidth: '200px'
        }}
      >
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          paddingBottom: '4px'
        }}>
          <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>📊 Performance Monitor</span>
          <button
            onClick={onToggleVisibility}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '0',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Overall Grade */}
        <div 
          style={{ 
            textAlign: 'center', 
            marginBottom: '12px',
            padding: '8px',
            backgroundColor: `${performanceGrade.color}20`,
            border: `1px solid ${performanceGrade.color}`,
            borderRadius: '4px'
          }}
          onMouseEnter={(e) => showDetailedTooltip(e, 'overall')}
          onMouseLeave={hideTooltip}
        >
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: performanceGrade.color }}>
            {performanceGrade.grade}
          </div>
          <div style={{ fontSize: '10px', color: performanceGrade.color }}>
            {performanceGrade.label}
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {/* FPS */}
                     <div 
             className="metric-item"
             style={{
               padding: '6px',
               backgroundColor: 'rgba(255, 255, 255, 0.05)',
               borderRadius: '4px',
               cursor: 'pointer',
               border: `1px solid ${getFPSColor(metrics.fps, metrics.isStatic)}`
             }}
             onMouseEnter={(e) => showDetailedTooltip(e, 'fps')}
             onMouseLeave={hideTooltip}
           >
             <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>FPS</div>
             <div style={{ fontSize: '16px', fontWeight: 'bold', color: getFPSColor(metrics.fps, metrics.isStatic) }}>
               {metrics.fps}
             </div>
           </div>

          {/* Render Time */}
          <div 
            className="metric-item"
            style={{
              padding: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px',
              cursor: 'pointer',
              border: `1px solid ${getRenderTimeColor(metrics.avgRenderTime)}`
            }}
            onMouseEnter={(e) => showDetailedTooltip(e, 'render')}
            onMouseLeave={hideTooltip}
          >
            <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>Render</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: getRenderTimeColor(metrics.avgRenderTime) }}>
              {metrics.avgRenderTime}ms
            </div>
          </div>

          {/* Memory */}
          <div 
            className="metric-item"
            style={{
              padding: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px',
              cursor: 'pointer',
              border: `1px solid ${getMemoryColor(metrics.memoryUsage)}`
            }}
            onMouseEnter={(e) => showDetailedTooltip(e, 'memory')}
            onMouseLeave={hideTooltip}
          >
            <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>Memory</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: getMemoryColor(metrics.memoryUsage) }}>
              {metrics.memoryUsage}MB
            </div>
          </div>

          {/* Canvas Size */}
          <div 
            className="metric-item"
            style={{
              padding: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px',
              cursor: 'pointer',
              border: '1px solid #60a5fa'
            }}
            onMouseEnter={(e) => showDetailedTooltip(e, 'canvas')}
            onMouseLeave={hideTooltip}
          >
            <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>Canvas</div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#60a5fa' }}>
              {metrics.canvasSize.width}×{metrics.canvasSize.height}
            </div>
          </div>
        </div>

        {/* Status and Frame Count */}
        <div style={{ 
          marginTop: '8px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          fontSize: '10px'
        }}>
          {/* Canvas Status */}
          <div style={{
            padding: '4px 8px',
            backgroundColor: metrics.isStatic ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            border: `1px solid ${metrics.isStatic ? '#3b82f6' : '#10b981'}`,
            borderRadius: '4px',
            color: metrics.isStatic ? '#3b82f6' : '#10b981',
            fontWeight: 'bold'
          }}>
            {metrics.isStatic ? '🟦 Static' : '🟢 Active'}
          </div>
          
          {/* Frame Count */}
          <div style={{ 
            padding: '4px', 
            backgroundColor: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: '4px',
            color: '#9ca3af'
          }}>
            Frames: {metrics.frameCount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translateX(-50%) translateY(-100%)',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            color: 'white',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '11px',
            lineHeight: '1.4',
            maxWidth: '280px',
            zIndex: 1000,
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            whiteSpace: 'pre-line'
          }}
          dangerouslySetInnerHTML={{ __html: tooltipContent }}
        />
      )}
    </>
  );
};

export default PerformanceMonitor;
