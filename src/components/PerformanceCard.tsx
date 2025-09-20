import { useEffect, useMemo, useRef, useState } from 'react';

type GpuInfo = {
  vendor: string;
  renderer: string;
};

function getWebGLGpuInfo(): GpuInfo | null {
  const canvas = document.createElement('canvas');
  const gl =
    (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
    (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
    (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
  if (!gl) return null;
  const dbg = (gl as any).getExtension('WEBGL_debug_renderer_info');
  if (!dbg) return null;
  const vendor = gl.getParameter((dbg as any).UNMASKED_VENDOR_WEBGL) as string;
  const renderer = gl.getParameter((dbg as any).UNMASKED_RENDERER_WEBGL) as string;
  return { vendor, renderer };
}

export function PerformanceCard() {
  const [fps, setFps] = useState<number>(0);
  const [avgFps, setAvgFps] = useState<number>(0);
  const [gpu, setGpu] = useState<GpuInfo | null>(null);
  const [heapMB, setHeapMB] = useState<number | null>(null);

  const frameTimes = useRef<number[]>([]);
  const lastFrame = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    setGpu(getWebGLGpuInfo());

    const loop = (t: number) => {
      if (lastFrame.current != null) {
        const dt = t - lastFrame.current;
        const currentFps = dt > 0 ? 1000 / dt : 0;
        setFps(currentFps);
        frameTimes.current.push(dt);
        if (frameTimes.current.length > 60) frameTimes.current.shift();
        const avg =
          frameTimes.current.reduce((a, b) => a + b, 0) /
          Math.max(1, frameTimes.current.length);
        setAvgFps(1000 / avg);
      }
      lastFrame.current = t;
      rafId.current = requestAnimationFrame(loop);

      // Memory (Chrome-specific)
      const perfMem = (performance as any).memory;
      if (perfMem && typeof perfMem.usedJSHeapSize === 'number') {
        setHeapMB(Math.round((perfMem.usedJSHeapSize / (1024 * 1024)) * 10) / 10);
      }
    };
    rafId.current = requestAnimationFrame(loop);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  const cpuInfo = useMemo(() => {
    const hw = (navigator as any).hardwareConcurrency as number | undefined;
    return hw ? `${hw} threads` : 'n/a';
  }, []);

  const style: React.CSSProperties = {
    position: 'fixed',
    right: 12,
    bottom: 12,
    zIndex: 2,
    minWidth: 200,
    padding: '10px 12px',
    borderRadius: 8,
    background: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 12,
    lineHeight: 1.4,
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)'
  };

  const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12 };
  const label: React.CSSProperties = { opacity: 0.7 };

  return (
    <div style={style}>
      <div style={{ ...row, marginBottom: 6 }}>
        <span style={label}>FPS</span>
        <span>{Math.round(fps)} (avg {Math.round(avgFps)})</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, marginBottom: 8 }}>
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, Math.round((Math.min(120, avgFps) / 120) * 100))}%`,
            background: avgFps >= 55 ? '#2ecc71' : avgFps >= 30 ? '#f1c40f' : '#e74c3c',
            borderRadius: 2,
            transition: 'width 120ms linear',
          }}
        />
      </div>
      <div style={{ ...row, marginBottom: 4 }}>
        <span style={label}>CPU</span>
        <span>{cpuInfo}</span>
      </div>
      <div style={{ ...row, marginBottom: 4 }}>
        <span style={label}>GPU</span>
        <span style={{ maxWidth: 260, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {gpu ? `${gpu.vendor} • ${gpu.renderer}` : 'n/a'}
        </span>
      </div>
      <div style={{ ...row }}>
        <span style={label}>Heap</span>
        <span>{heapMB != null ? `${heapMB} MB` : 'n/a'}</span>
      </div>
    </div>
  );
}

export default PerformanceCard;


