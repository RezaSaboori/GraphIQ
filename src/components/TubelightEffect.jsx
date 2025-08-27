import React, { useLayoutEffect, useRef, useState } from 'react';

const TubelightEffect = ({ to, color }) => {
  const glowRef = useRef(null);
  const lineRef = useRef(null);
  const [targetRect, setTargetRect] = useState(null);

  // This effect tracks the position of the target card
  useLayoutEffect(() => {
    const toCard = document.getElementById(to);
    if (!toCard) return;

    // Use a ResizeObserver to efficiently track position changes
    const observer = new ResizeObserver(() => {
      const rect = toCard.getBoundingClientRect();
      setTargetRect(rect);
    });
    observer.observe(toCard);

    // Initial position
    const rect = toCard.getBoundingClientRect();
    setTargetRect(rect);

    return () => observer.disconnect();
  }, [to]);

  const makeBox = (className, ref) => {
    if (!targetRect) return null;

    // Calculate which edge the arrow is approaching from
    // For now, we'll use a simple heuristic - you can enhance this based on arrow direction
    const endSide = 'top'; // Default, can be enhanced with arrow direction logic

    return (
      <div
        ref={ref}
        style={{
          position: 'fixed', // Use fixed position based on viewport
          left: `${targetRect.left}px`,
          top: `${targetRect.top}px`,
          width: `${targetRect.width}px`,
          height: `${targetRect.height}px`,
          pointerEvents: 'none',
          '--edge-inset': '8px',
        }}
      >
        <div
          className={`${className} ${endSide}`}
          style={{ '--glow-color': color }}
        />
      </div>
    );
  };

  return (
    <>
      {makeBox('tubelight-blur', glowRef)}
      {makeBox('tubelight-line', lineRef)}
    </>
  );
};

export default TubelightEffect;
