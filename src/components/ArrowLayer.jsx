import React, { useEffect, useRef } from 'react';
import { getBoxToBoxArrow } from 'curved-arrows';



function getClosestSidePoint(rect1, rect2, conn) {
  const center1 = { x: rect1.left + rect1.width / 2, y: rect1.top + rect1.height / 2 };
  const center2 = { x: rect2.left + rect2.width / 2, y: rect2.top + rect2.height / 2 };


  const dx = center2.x - center1.x;
  const dy = center2.y - center1.y;

  let startPoint, endPoint, startSide, endSide;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) { startPoint = { x: rect1.right, y: center1.y }; startSide = 'right'; } else { startPoint = { x: rect1.left, y: center1.y }; startSide = 'left'; }
  } else {
    if (dy > 0) { startPoint = { x: center1.x, y: rect1.bottom }; startSide = 'bottom'; } else { startPoint = { x: center1.x, y: rect1.top }; startSide = 'top'; }
  }

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) { endPoint = { x: rect2.left, y: center2.y }; endSide = 'left'; } else { endPoint = { x: rect2.right, y: center2.y }; endSide = 'right'; }
  } else {
    if (dy > 0) { endPoint = { x: center2.x, y: rect2.top }; endSide = 'top'; } else { endPoint = { x: center2.x, y: rect2.bottom }; endSide = 'bottom'; }
  }

  if (conn && conn.from === 'card2' && conn.to === 'card1') {
    startPoint = { x: center1.x, y: rect1.bottom }; startSide = 'bottom';
    endPoint = { x: center2.x, y: rect2.top }; endSide = 'top';
  }

  switch (startSide) {
    case 'top': startPoint.y -= 8; break;
    case 'bottom': startPoint.y += 8; break;
    case 'left': startPoint.x -= 8; break;
    case 'right': startPoint.x += 8; break;
  }
  switch (endSide) {
    case 'top': endPoint.y -= 8; break;
    case 'bottom': endPoint.y += 8; break;
    case 'left': endPoint.x -= 8; break;
    case 'right': endPoint.x += 8; break;
  }

  return { startPoint, endPoint, endSide };
}

const ArrowLayer = ({ connections }) => {
  const svgRef = useRef(null);
  const labelsRef = useRef(null);
  const glowRef = useRef(null);
  const lineRef = useRef(null);


  const draw = () => {
    const svg = svgRef.current;
    const labels = labelsRef.current;
    const glow = glowRef.current;
    const line = lineRef.current;
    if (!svg || !labels || !glow || !line) return;

    svg.querySelectorAll('path').forEach(p => p.remove());
    svg.querySelectorAll('line').forEach(l => l.remove());
    labels.innerHTML = '';
    glow.innerHTML = '';
    line.innerHTML = '';

    connections.forEach(conn => {
      const fromCard = document.getElementById(conn.from);
      const toCard = document.getElementById(conn.to);
      if (!fromCard || !toCard) return;

      const rect1 = fromCard.getBoundingClientRect();
      const rect2 = toCard.getBoundingClientRect();
      getClosestSidePoint(rect1, rect2, conn);

      const arrowHeadSize = 10;
      const [sx, sy, c1x, c1y, c2x, c2y, ex, ey] = getBoxToBoxArrow(
        rect1.left, rect1.top, rect1.width, rect1.height,
        rect2.left, rect2.top, rect2.width, rect2.height,
        { padStart: 8, padEnd: arrowHeadSize }
      );

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`);
      path.setAttribute('stroke', conn.color);
      const strokeWidth = conn.width ?? 2;
      path.setAttribute('stroke-width', `${strokeWidth}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(path);

      const headLength = conn.headLength ?? 12;
      const headAngleDeg = conn.headAngleDeg ?? 32;
      const headWidth = conn.headWidth ?? (conn.width ?? 2);
      const theta = (headAngleDeg * Math.PI) / 180;
      const endAngle = Math.atan2(ey - c2y, ex - c2x);
      const a1 = endAngle + Math.PI - theta;
      const a2 = endAngle + Math.PI + theta;
      const hx1 = ex + Math.cos(a1) * headLength;
      const hy1 = ey + Math.sin(a1) * headLength;
      const hx2 = ex + Math.cos(a2) * headLength;
      const hy2 = ey + Math.sin(a2) * headLength;
      const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line1.setAttribute('x1', `${ex}`);
      line1.setAttribute('y1', `${ey}`);
      line1.setAttribute('x2', `${hx1}`);
      line1.setAttribute('y2', `${hy1}`);
      line1.setAttribute('stroke', conn.color);
      line1.setAttribute('stroke-width', `${headWidth}`);
      line1.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line1);
      const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line2.setAttribute('x1', `${ex}`);
      line2.setAttribute('y1', `${ey}`);
      line2.setAttribute('x2', `${hx2}`);
      line2.setAttribute('y2', `${hy2}`);
      line2.setAttribute('stroke', conn.color);
      line2.setAttribute('stroke-width', `${headWidth}`);
      line2.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line2);

      const label = document.createElement('div');
      label.className = 'arrow-label';
      label.textContent = conn.label;
      label.style.left = `${(sx + ex) / 2}px`;
      label.style.top = `${(sy + ey) / 2}px`;
      labels.appendChild(label);

      const rootRect = svg.getBoundingClientRect();
      const cs = window.getComputedStyle(toCard);
      const toNum = (v) => (typeof v === 'string' ? parseFloat(v) || 0 : 0);
      const edgeInset = Math.max(
        toNum(cs.borderTopLeftRadius),
        toNum(cs.borderTopRightRadius),
        toNum(cs.borderBottomLeftRadius),
        toNum(cs.borderBottomRightRadius)
      );
      const targetCenterX = rect2.left + rect2.width / 2;
      const targetCenterY = rect2.top + rect2.height / 2;
      const endSide = Math.abs(ex - targetCenterX) > Math.abs(ey - targetCenterY)
        ? (ex > targetCenterX ? 'right' : 'left')
        : (ey > targetCenterY ? 'bottom' : 'top');

      const makeBox = (className) => {
        const box = document.createElement('div');
        box.style.position = 'absolute';
        box.style.left = `${rect2.left - rootRect.left}px`;
        box.style.top = `${rect2.top - rootRect.top}px`;
        box.style.width = `${rect2.width}px`;
        box.style.height = `${rect2.height}px`;
        box.style.pointerEvents = 'none';
        box.style.setProperty('--edge-inset', `${edgeInset}px`);
        const light = document.createElement('div');
        light.className = `${className} ${endSide}`;
        light.style.setProperty('--glow-color', conn.color);
        box.appendChild(light);
        return box;
      };

      glow.appendChild(makeBox('tubelight-blur'));
      line.appendChild(makeBox('tubelight-line'));
    });
  };

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    const raf = () => { draw(); requestAnimationFrame(raf); };
    const id = requestAnimationFrame(raf);
    return () => { window.removeEventListener('resize', draw); cancelAnimationFrame(id); };
  }, [connections]);

  return (
    <>
      <div ref={glowRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />
      <svg ref={svgRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 3 }}>
        <defs></defs>
      </svg>
      <div ref={lineRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 9999 }} />
      <div ref={labelsRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 10001 }} />
    </>
  );
};

export default ArrowLayer;


