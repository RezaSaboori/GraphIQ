import React, { forwardRef } from 'react';

const GlassCard = forwardRef(({ id, className = '', style, width, children, ...props }, ref) => {
  const mergedStyle = width != null ? { width: `${width}px`, ...style } : style;
  return (
    <div id={id} ref={ref} className={`glass-card ${className}`} style={mergedStyle} {...props}>
      {children}
    </div>
  );
});

export default GlassCard;


