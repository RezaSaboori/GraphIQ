import { useEffect, useRef } from 'react';

export default function useDraggable(onDrag) {
  const activeRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!activeRef.current) return;
      e.preventDefault();
      const newX = e.clientX - offsetRef.current.x;
      const newY = e.clientY - offsetRef.current.y;
      activeRef.current.style.left = `${newX}px`;
      activeRef.current.style.top = `${newY}px`;
      if (onDrag) onDrag();
    };
    const onMouseUp = () => {
      if (activeRef.current) {
        activeRef.current.style.cursor = 'grab';
      }
      activeRef.current = null;
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [onDrag]);

  const bind = {
    onMouseDown: (e) => {
      const el = e.currentTarget;
      if (e.target !== el) return;
      activeRef.current = el;
      const rect = el.getBoundingClientRect();
      offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      el.style.cursor = 'grabbing';
    },
  };

  return bind;
}

