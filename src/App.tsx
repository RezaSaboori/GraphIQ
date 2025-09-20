import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import styles from './App.module.scss';
import {
  createEmptyTexture,
  loadTextureFromURL,
  MultiPassRenderer,
  updateVideoTexture,
  RenderPass,
  createBlueNoiseTexture,
} from './utils/GLUtils';
import { OITSystem } from './utils/OITSystem';
import PassthroughFragmentShader from './shaders/fragment-passthrough.glsl?raw';

import VertexShader from './shaders/vertex.glsl?raw';
import FragmentBgShader from './shaders/fragment-bg.glsl?raw';
 
import FragmentMainShader from './shaders/fragment-main.glsl?raw';
import { useLevaControls } from './Controls';
import { ShapeManager, type Shape } from './utils/ShapeManager';
import { LiquidShape } from './elements/LiquidShape';
import PerformanceCard from './components/PerformanceCard';

// Import ColorValue type for per-shape tints
type ColorValue = [number, number, number]; // [r, g, b] array format

// HELPER REMOVED: buildLayeredRenderPasses is now obsolete.

// Helper function to create a hover shape with merging animation
function createHoverShape(
  originalShape: Shape,
  animationProgress: number, // 0 to 1 for merge animation
  canvasInfo: { width: number; height: number; dpr: number }
): Partial<Shape> {
  const dpr = canvasInfo.dpr;
  
  // Bottom-right direction (diagonal down-right)
  // CRITICAL: In this coordinate system, shape positions are inverted!
  // Looking at ShapeManager.ts line 172-173: shapeX = centerX - shape.position.x (X is inverted!)
  // So for bottom-right: we need negative X (left in shape space = right on screen), positive Y (down)
  const dirX = -1; // Left in shape space = Right on screen (due to inversion)
  const dirY = 1; // Down (positive Y is down)
  const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
  const normalizedDirX = dirX / dirLength;
  const normalizedDirY = dirY / dirLength;
  
  // Calculate the edge position of the mother shape in the bottom-right direction
  const motherHalfWidth = originalShape.size.width / 2;
  const motherHalfHeight = originalShape.size.height / 2;
  
  // Always use the actual bottom-right corner of the shape
  // Corner position relative to shape center (accounting for coordinate inversion)
  const cornerX = -motherHalfWidth;  // Right corner (inverted coordinate system)
  const cornerY = motherHalfHeight;  // Bottom corner
  
  // Calculate consistent spacing that maintains the same visual distance regardless of shape size
  // Use the larger dimension to normalize spacing, ensuring consistent visual appearance
  const maxDimension = Math.max(motherHalfWidth, motherHalfHeight);
  const baseSpacing = 20 * dpr;
  
  // Scale spacing based on shape size to maintain consistent visual distance
  const scaledSpacing = baseSpacing + (maxDimension * 0.1); // Add 10% of largest dimension
  
  const finalOffsetX = cornerX + (normalizedDirX * scaledSpacing);
  const finalOffsetY = cornerY + (normalizedDirY * scaledSpacing);
  
  // Final position is mother position + border offset + spacing
  const finalX = originalShape.position.x + finalOffsetX;
  const finalY = originalShape.position.y + finalOffsetY;
  
  // Animation: start from the corner of mother shape (with merge bubble effect)
  const startX = originalShape.position.x + cornerX;
  const startY = originalShape.position.y + cornerY;
  
  const hoverX = startX + (finalX - startX) * animationProgress;
  const hoverY = startY + (finalY - startY) * animationProgress;
  
  // Animation: scale from 0 to full size with easing
  const maxSize = 50 * dpr;
  const easeProgress = 1 - Math.pow(1 - animationProgress, 3); // Ease out cubic
  const currentSize = maxSize * easeProgress;
  
  return {
    id: 'hover_shape',
    position: { x: hoverX, y: hoverY },
    size: { width: currentSize, height: currentSize },
    radius: 100, // 100% radius for perfect circle
    roundness: 5,
    visible: animationProgress > 0.05, // Show earlier for merge bubble effect
    draggable: false,
    zIndex: originalShape.zIndex, // Use same z-index as mother shape for merging
  };
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasInfo, setCanvasInfo] = useState<{ width: number; height: number; dpr: number }>({
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: 1,
  });
  const [oitSystem, setOitSystem] = useState<OITSystem | null>(null);
  const [displayPass, setDisplayPass] = useState<RenderPass | null>(null);
  const [gl, setGl] = useState<WebGL2RenderingContext | null>(null);

  const { controls } = useLevaControls();

  const stateRef = useRef<{
    renderRaf: number | null;
    canvasInfo: typeof canvasInfo;
    glStates: {
      gl: WebGL2RenderingContext;
      programs: Record<string, WebGLProgram>;
      vao: WebGLVertexArrayObject;
    } | null;
    canvasPointerPos: { x: number; y: number };
    controls: typeof controls;
    bgTextureUrl: string | null;
    bgTexture: WebGLTexture | null;
    bgTextureRatio: number;
    bgTextureType: 'image' | 'video' | null;
    bgTextureReady: boolean;
    bgVideoEls: Map<number, HTMLVideoElement>;
    shapeDefinitions: Array<{
      id: string;
      position: { x: number; y: number };
      size: { width: number; height: number };
      zIndex: number;
      tint: ColorValue;
    }>;
    shapeManager: ShapeManager;
    draggingShapeId: string | null;
    dragStartPos: { x: number; y: number };
    dragStartShapePos: { x: number; y: number };
    draggingGroupShapes: Map<string, { x: number; y: number }>; // Store original positions of all shapes in dragging group
    hoveredShapeId: string | null; // Track which shape is being hovered
    hoverShapeId: string | null; // ID of the temporary hover shape
    hoverAnimationStart: number | null; // Animation start timestamp
    hoverAnimationDuration: number; // Animation duration in ms
    blueNoiseTexture: WebGLTexture | null;
    frameCount: number;
    startTime: number;
    performanceMode: 'high' | 'medium' | 'low' | 'auto';
    frameTimeHistory: number[];
    adaptiveQuality: {
      enableSelectiveAlpha: boolean;
      tintAlphaThreshold: number;
      effectComplexityThreshold: number;
      ditherStrength: number;
      ditherType: number;
    }
    lastBatchCount: number | null;
  }>({
    renderRaf: null,
    glStates: null,
    canvasInfo,
    canvasPointerPos: {
      x: 0,
      y: 0,
    },
    controls,
    bgTextureUrl: null,
    bgTexture: null,
    bgTextureRatio: 1,
    bgTextureType: null,
    bgTextureReady: false,
    bgVideoEls: new Map(),
    // Shape definitions with all properties in one place for easy modification
    // To add a new shape, simply add a new object to this array with unique id, position, size, zIndex, and tint
    shapeDefinitions: (() => {
      const dpr = window.devicePixelRatio || 1;
      return [
      ];
    })(),
    shapeManager: new ShapeManager([]), // Will be initialized with shapeDefinitions
    draggingShapeId: null,
    dragStartPos: { x: 0, y: 0 },
    dragStartShapePos: { x: 0, y: 0 },
    draggingGroupShapes: new Map(),
    hoveredShapeId: null,
    hoverShapeId: null,
    hoverAnimationStart: null,
    hoverAnimationDuration: 500, // 500ms animation duration
    blueNoiseTexture: null,
    frameCount: 0,
    startTime: performance.now(),
    performanceMode: 'auto',
    frameTimeHistory: [],
    adaptiveQuality: {
      enableSelectiveAlpha: true,
      tintAlphaThreshold: 0.95, // Higher threshold for smoother interiors
      effectComplexityThreshold: 0.4, // Less aggressive alpha testing
      ditherStrength: 0.3, // Lower default dither strength
      ditherType: 2, // Default to blue noise for better quality
    },
    lastBatchCount: null,
  });
  stateRef.current.canvasInfo = canvasInfo;
  stateRef.current.controls = controls;

  // Initialize ShapeManager with shapeDefinitions
  const initialShapes = stateRef.current.shapeDefinitions.map(def => ({
    id: def.id, // Include the ID from our definitions
    position: def.position,
    size: def.size,
    zIndex: def.zIndex,
  }));
  stateRef.current.shapeManager = new ShapeManager(initialShapes);

  // Performance adaptation function - optimized for reduced noise
  const adaptQualitySettings = (frameTime: number, qualityControls: typeof stateRef.current.adaptiveQuality) => {
      const fps = 1000 / frameTime;
      const targetFPS = 60;
      
      if (fps < targetFPS * 0.7) {
          // Low performance - prioritize speed with minimal noise
          qualityControls.enableSelectiveAlpha = true;
          qualityControls.tintAlphaThreshold = 0.98; // More areas get smooth blending
          qualityControls.effectComplexityThreshold = 0.15; // More aggressive alpha testing
          qualityControls.ditherStrength = 0.2; // Very low dither noise
          qualityControls.ditherType = 1; // Use minimal Bayer dithering
      } else if (fps > targetFPS * 0.9) {
          // Good performance - prioritize quality with blue noise
          qualityControls.enableSelectiveAlpha = true;
          qualityControls.tintAlphaThreshold = 0.85; // Balanced selective rendering
          qualityControls.effectComplexityThreshold = 0.5; // Less aggressive alpha testing
          qualityControls.ditherStrength = 0.4; // Moderate quality dithering
          qualityControls.ditherType = 2; // Use blue noise dithering
      }
      // Medium performance range - use default values from initialization
  };

  // useEffect(() => {
  //   setLangName(controls.language[0] as keyof typeof languages);
  // }, [controls.language]);


  // Removed blur kernel computation

  // Load shapes dataset from public/datasets/shapes.json and initialize ShapeManager
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('datasets/shapes.json');
        if (!res.ok) return;
        const data: Array<{
          id: string;
          position: { x: number; y: number };
          size: { height: number };
          zIndex: number;
          tint: ColorValue;
        }> = await res.json();
        const dpr = window.devicePixelRatio || 1;
        // Map dataset to internal definitions, applying DPR and width from controls
        const defs = data.map((item) => ({
          id: item.id,
          position: { x: item.position.x * dpr, y: item.position.y * dpr },
          size: { width: controls.shapeWidth * dpr, height: item.size.height * dpr },
          zIndex: item.zIndex,
          tint: item.tint,
        }));
        stateRef.current.shapeDefinitions = defs;
        const shapes = defs.map(def => ({
          id: def.id,
          position: def.position,
          size: def.size,
          zIndex: def.zIndex,
        }));
        stateRef.current.shapeManager = new ShapeManager(shapes);
        stateRef.current.shapeManager.setShapeDefinitions(defs);
        // Force renderer to rebuild on next frame
        stateRef.current.lastBatchCount = -1; // Force rebuild
      } catch (err) {
        console.error('Failed to load dataset shapes.json', err);
      }
    };
    load();
  }, []);

  // Static shape management - no dynamic controls


  useLayoutEffect(() => {
    const onResize = () => {
      setCanvasInfo({
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: window.devicePixelRatio,
      });
    };
    window.addEventListener('resize', onResize);
    onResize();

    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useLayoutEffect(() => {
    if (!canvasRef.current) {
      return;
    }
    canvasRef.current.width = canvasInfo.width * canvasInfo.dpr;
    canvasRef.current.height = canvasInfo.height * canvasInfo.dpr;
    
    if (gl) {
      // Handle gl context resizing here if needed
    }
  }, [canvasInfo, gl]);

  // Ensure we initialize a WebGL2 context so the fallback renderer can run
  useEffect(() => {
    if (!canvasRef.current) return;
    if (gl) return; // already initialized
    
    const webgl2Context = canvasRef.current.getContext('webgl2', { antialias: false });
    if (!webgl2Context) {
      console.error('WebGL 2 not supported');
      return;
    }
    setGl(webgl2Context);
  }, [canvasRef.current]);

  useEffect(() => {
    if (!canvasRef.current || !gl) {
      return;
    }

    // This block will now contain both the OIT and the fallback rendering logic.
    // If oitSystem is present, we use it. Otherwise, the old logic runs.
    
    const canvasEl = canvasRef.current;
    
    // Add keyboard controls for testing zIndex functionality
    const onKeyDown = (e: KeyboardEvent) => {
      const shapes = stateRef.current.shapeManager.getAllShapes();
      if (shapes.length === 0) return;
      
      const shapeIds = shapes.map(s => s.id);
      
      // Press 1, 2, 3 to select shapes
      if (e.key >= '1' && e.key <= '3') {
        const shapeIndex = parseInt(e.key) - 1;
        if (shapeIndex < shapeIds.length) {
          const shapeId = shapeIds[shapeIndex];
          const shape = stateRef.current.shapeManager.getShape(shapeId);
          if (shape) {
            console.log(`Selected shape ${shapeId} with zIndex: ${shape.zIndex}`);
          }
        }
      }
      
      // Press + or = to increase zIndex of selected shape
      if (e.key === '+' || e.key === '=') {
        if (stateRef.current.shapeManager.getSelectedShape()) {
          const selectedShape = stateRef.current.shapeManager.getSelectedShape();
          if (selectedShape) {
            stateRef.current.shapeManager.setShapeZIndex(selectedShape.id, selectedShape.zIndex + 1);
            console.log(`Increased zIndex of ${selectedShape.id} to ${selectedShape.zIndex + 1}`);
          }
        }
      }
      
      // Press - to decrease zIndex of selected shape
      if (e.key === '-') {
        if (stateRef.current.shapeManager.getSelectedShape()) {
          const selectedShape = stateRef.current.shapeManager.getSelectedShape();
          if (selectedShape) {
            stateRef.current.shapeManager.setShapeZIndex(selectedShape.id, Math.max(0, selectedShape.zIndex - 1));
            console.log(`Decreased zIndex of ${selectedShape.id} to ${Math.max(0, selectedShape.zIndex - 1)}`);
          }
        }
      }
      
      // Press space to cycle through shapes
      if (e.key === ' ') {
        e.preventDefault();
        const currentSelected = stateRef.current.shapeManager.getSelectedShape();
        if (currentSelected) {
          const currentIndex = shapeIds.indexOf(currentSelected.id);
          const nextIndex = (currentIndex + 1) % shapeIds.length;
          stateRef.current.shapeManager.selectShape(shapeIds[nextIndex]);
          console.log(`Selected shape ${shapeIds[nextIndex]}`);
        } else {
          stateRef.current.shapeManager.selectShape(shapeIds[0]);
          console.log(`Selected shape ${shapeIds[0]}`);
        }
      }
    };
    
    const onPointerMove = (e: PointerEvent) => {
      const canvasInfo = stateRef.current.canvasInfo;
      if (!canvasInfo) {
        return;
      }
      const canvasRect = canvasEl.getBoundingClientRect();
      stateRef.current.canvasPointerPos = {
        x: (e.clientX - canvasRect.left) * canvasInfo.dpr,
        y: (canvasInfo.height - (e.clientY - canvasRect.top)) * canvasInfo.dpr,
      };

      // Handle dragging
      if (stateRef.current.draggingShapeId) {
        const deltaX = e.clientX - stateRef.current.dragStartPos.x;
        const deltaY = e.clientY - stateRef.current.dragStartPos.y;

        // Update all shapes in the dragging group
        for (const [shapeId, originalPos] of stateRef.current.draggingGroupShapes.entries()) {
          const newPosition = {
            x: originalPos.x - deltaX * canvasInfo.dpr,
            y: originalPos.y + deltaY * canvasInfo.dpr,
          };

          stateRef.current.shapeManager.setShapePosition(shapeId, newPosition);
        }
      } else {
        // Handle hover detection when not dragging
        const mousePos = {
          x: e.clientX - canvasRect.left,
          y: e.clientY - canvasRect.top,
        };

        const hoveredShapeId = stateRef.current.shapeManager.getShapeAtPosition(mousePos, canvasInfo);
        
        // Only consider original shapes (not the hover shape itself)
        const isHoveringOriginalShape = hoveredShapeId && hoveredShapeId !== 'hover_shape';
        
        if (isHoveringOriginalShape !== (stateRef.current.hoveredShapeId !== null)) {
          if (isHoveringOriginalShape) {
            // Started hovering over a shape
            stateRef.current.hoveredShapeId = hoveredShapeId;
            
            // Remove existing hover shape if any
            if (stateRef.current.hoverShapeId) {
              stateRef.current.shapeManager.removeShape(stateRef.current.hoverShapeId);
            }
            
            // Start merge animation
            stateRef.current.hoverAnimationStart = performance.now();
            
            // Create new hover shape with initial animation state
            const originalShape = stateRef.current.shapeManager.getShape(hoveredShapeId);
            if (originalShape) {
              const hoverShapeData = createHoverShape(originalShape, 0, canvasInfo);
              const hoverShapeId = stateRef.current.shapeManager.addShape(hoverShapeData);
              stateRef.current.hoverShapeId = hoverShapeId;
            }
          } else {
            // Stopped hovering over shapes
            stateRef.current.hoveredShapeId = null;
            stateRef.current.hoverAnimationStart = null;
            
            // Remove hover shape
            if (stateRef.current.hoverShapeId) {
              stateRef.current.shapeManager.removeShape(stateRef.current.hoverShapeId);
              stateRef.current.hoverShapeId = null;
            }
          }
        }
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const canvasInfo = stateRef.current.canvasInfo;
      if (!canvasInfo) {
        return;
      }
      
      const canvasRect = canvasEl.getBoundingClientRect();
      const mousePos = {
        x: e.clientX - canvasRect.left,
        y: e.clientY - canvasRect.top,
      };

      const clickedShapeId = stateRef.current.shapeManager.getShapeAtPosition(mousePos, {
        width: canvasInfo.width,
        height: canvasInfo.height,
        dpr: canvasInfo.dpr,
      });
      
      if (clickedShapeId) {
        const clickedShape = stateRef.current.shapeManager.getShape(clickedShapeId);
        if (clickedShape) {
          stateRef.current.draggingShapeId = clickedShapeId;
          stateRef.current.dragStartPos = { x: e.clientX, y: e.clientY };
          stateRef.current.dragStartShapePos = { ...clickedShape.position };
          
          // Find all shapes with the same z-index for group dragging
          stateRef.current.draggingGroupShapes.clear();
          const allShapes = stateRef.current.shapeManager.getAllShapes();
          const targetZIndex = clickedShape.zIndex;
          
          for (const shape of allShapes) {
            if (shape.zIndex === targetZIndex) {
              stateRef.current.draggingGroupShapes.set(shape.id, { ...shape.position });
            }
          }
        }
      }
    };

    const onPointerUp = () => {
      stateRef.current.draggingShapeId = null;
      stateRef.current.draggingGroupShapes.clear();
    };

    const onPointerLeave = () => {
      // Clean up hover shape when mouse leaves canvas
      stateRef.current.hoveredShapeId = null;
      stateRef.current.hoverAnimationStart = null;
      if (stateRef.current.hoverShapeId) {
        stateRef.current.shapeManager.removeShape(stateRef.current.hoverShapeId);
        stateRef.current.hoverShapeId = null;
      }
    };

    canvasEl.addEventListener('pointermove', onPointerMove);
    canvasEl.addEventListener('pointerdown', onPointerDown);
    canvasEl.addEventListener('pointerup', onPointerUp);
    canvasEl.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('keydown', onKeyDown);

    let renderer: MultiPassRenderer | null = null;
    if (!oitSystem) {
      const controls = stateRef.current.controls; // Moved this line up
      const batchedData = stateRef.current.shapeManager.getBatchedShapeData(controls.maxShapesPerPass);
      const initialPasses: any[] = [
        { name: 'bgPass', shader: { vertex: VertexShader, fragment: FragmentBgShader } }
      ];

      let previousLayerName = 'bgPass';
      batchedData.batches.forEach((batch, index) => {
        const passName = `alphaBatch_${index}`;
        const isLastBatch = index === batchedData.batches.length - 1;
        initialPasses.push({
          name: passName,
          shader: { vertex: VertexShader, fragment: FragmentMainShader },
          inputs: { u_bg: 'bgPass', u_previousLayer: previousLayerName },
          outputToScreen: isLastBatch,
        });
        previousLayerName = passName;
      });

      if (batchedData.batches.length === 0) {
        initialPasses.push({
          name: 'passthroughPass',
          shader: { vertex: VertexShader, fragment: FragmentBgShader, },
          inputs: { u_prevPassTexture: 'bgPass', },
          outputToScreen: true,
        });
      }
      
      renderer = new MultiPassRenderer(canvasEl, initialPasses);
    }
    
    let raf: number | null = null;
    const lastState = {
      canvasInfo: null as typeof canvasInfo | null,
      controls: null as typeof controls | null,
      bgTextureType: null as typeof stateRef.current.bgTextureType,
      bgTextureUrl: null as typeof stateRef.current.bgTextureUrl,
    };
    // let startTime: number | null = null
    const render = () => {
      const frameStart = performance.now();
      raf = requestAnimationFrame(render);
      stateRef.current.frameCount++;
      
      const canvasInfo = stateRef.current.canvasInfo;
      const controls = stateRef.current.controls;

      if (oitSystem && gl) {
        // --- OIT Render Path ---
        // The old background texture logic has issues, let's create a placeholder
        const bgTexture = createEmptyTexture(gl); // Simplified for now

        // Prepare global uniforms
        const globalUniforms = {
          u_resolution: [canvasInfo.width * canvasInfo.dpr, canvasInfo.height * canvasInfo.dpr],
          u_dpr: canvasInfo.dpr,
          u_refFactor: controls.refFactor,
          u_refDispersion: controls.refDispersion,
          u_refThickness: controls.refThickness,
          u_tint: [
            controls.tint.r / 255,
            controls.tint.g / 255,
            controls.tint.b / 255,
            controls.tint.a,
          ],
          u_refFresnelRange: controls.refFresnelRange,
          u_refFresnelHardness: controls.refFresnelHardness / 100,
          u_refFresnelFactor: controls.refFresnelFactor / 100,
          u_glareRange: controls.glareRange,
          u_glareHardness: controls.glareHardness / 100,
          u_glareConvergence: controls.glareConvergence / 100,
          u_glareOppositeFactor: controls.glareOppositeFactor / 100,
          u_glareFactor: controls.glareFactor / 100,
          u_glareAngle: (controls.glareAngle * Math.PI) / 180,
          u_mergeRatio: controls.mergeRatio,
          STEP: controls.step,
        };
        
        // Render with OIT
        oitSystem.render(stateRef.current.shapeManager, bgTexture, globalUniforms);

      } else if (renderer) {
        // --- Fallback Multi-Pass Render Path with Dithering ---
        const currentTime = (performance.now() - stateRef.current.startTime) / 1000.0;
        
        if (!stateRef.current.blueNoiseTexture && gl instanceof WebGL2RenderingContext) {
            stateRef.current.blueNoiseTexture = createBlueNoiseTexture(gl);
        }

        // Update hover animation if active
        if (stateRef.current.hoverAnimationStart !== null && stateRef.current.hoverShapeId) {
          const now = performance.now();
          const elapsed = now - stateRef.current.hoverAnimationStart;
          const progress = Math.min(elapsed / stateRef.current.hoverAnimationDuration, 1.0);
          
          // Update hover shape with current animation progress
          const originalShape = stateRef.current.hoveredShapeId 
            ? stateRef.current.shapeManager.getShape(stateRef.current.hoveredShapeId)
            : null;
          
          if (originalShape) {
            const currentCanvasInfo = stateRef.current.canvasInfo;
            const hoverShapeData = createHoverShape(originalShape, progress, currentCanvasInfo);
            stateRef.current.shapeManager.updateShape(stateRef.current.hoverShapeId, hoverShapeData);
          }
          
          // Stop animation when complete
          if (progress >= 1.0) {
            stateRef.current.hoverAnimationStart = null;
          }
        }

        const batchedData = stateRef.current.shapeManager.getBatchedShapeData(controls.maxShapesPerPass);

        // Only rebuild render passes if the number of batches has changed
        if (batchedData.batches.length !== stateRef.current.lastBatchCount) {
            const newPasses: any[] = [
                { name: 'bgPass', shader: { vertex: VertexShader, fragment: FragmentBgShader } }
            ];

            let previousLayerName = 'bgPass';
            batchedData.batches.forEach((_, index) => {
                const passName = `alphaBatch_${index}`;
                const isLastBatch = index === batchedData.batches.length - 1;
                newPasses.push({
                    name: passName,
                    shader: { vertex: VertexShader, fragment: FragmentMainShader },
                    inputs: { u_bg: 'bgPass', u_previousLayer: previousLayerName },
                    outputToScreen: isLastBatch,
                });
                previousLayerName = passName;
            });

            if (batchedData.batches.length === 0) {
                newPasses.push({
                    name: 'passthroughPass',
                    shader: { vertex: VertexShader, fragment: FragmentBgShader, },
                    inputs: { u_prevPassTexture: 'bgPass', },
                    outputToScreen: true,
                });
            }

            renderer.rebuildPasses(newPasses);
            stateRef.current.lastBatchCount = batchedData.batches.length;
        }

        const textureUrl = stateRef.current.bgTextureUrl;
        if (
          !lastState.canvasInfo ||
          lastState.canvasInfo.width !== canvasInfo.width ||
          lastState.canvasInfo.height !== canvasInfo.height ||
          lastState.canvasInfo.dpr !== canvasInfo.dpr
        ) {
          gl.viewport(
            0,
            0,
            Math.round(canvasInfo.width * canvasInfo.dpr),
            Math.round(canvasInfo.height * canvasInfo.dpr),
          );
          renderer.resize(canvasInfo.width * canvasInfo.dpr, canvasInfo.height * canvasInfo.dpr);
          renderer.setUniform('u_resolution', [
            canvasInfo.width * canvasInfo.dpr,
            canvasInfo.height * canvasInfo.dpr,
          ]);
        }
        if (textureUrl !== lastState.bgTextureUrl) {
          if (lastState.bgTextureType === 'video') {
            if (lastState.controls?.bgType !== undefined) {
              stateRef.current.bgVideoEls.get(lastState.controls.bgType)?.pause();
            }
          }
          if (!textureUrl) {
            if (stateRef.current.bgTexture) {
              gl.deleteTexture(stateRef.current.bgTexture);
              stateRef.current.bgTexture = null;
              stateRef.current.bgTextureType = null;
            }
          } else {
            if (stateRef.current.bgTextureType === 'image') {
              const rafId = requestAnimationFrame(() => {
                stateRef.current.bgTextureReady = false;
              });
              loadTextureFromURL(gl, textureUrl).then(({ texture, ratio }) => {
                if (stateRef.current.bgTextureUrl === textureUrl) {
                  cancelAnimationFrame(rafId);
                  stateRef.current.bgTexture = texture;
                  stateRef.current.bgTextureRatio = ratio;
                  stateRef.current.bgTextureReady = true;
                }
              });
            } else if (stateRef.current.bgTextureType === 'video') {
              stateRef.current.bgTextureReady = false;
              stateRef.current.bgTexture = createEmptyTexture(gl);
              stateRef.current.bgVideoEls.get(stateRef.current.controls.bgType)?.play();
            }
          }
        }
        lastState.controls = stateRef.current.controls;
        lastState.bgTextureType = stateRef.current.bgTextureType;
        lastState.canvasInfo = canvasInfo;
        lastState.bgTextureUrl = stateRef.current.bgTextureUrl;

        if (stateRef.current.bgTextureType === 'video') {
          const videoEl = stateRef.current.bgVideoEls.get(stateRef.current.controls.bgType);
          if (stateRef.current.bgTexture && videoEl) {
            const info = updateVideoTexture(gl, stateRef.current.bgTexture, videoEl);

            if (info) {
              stateRef.current.bgTextureRatio = info.ratio;
              stateRef.current.bgTextureReady = true;
            }
          }
        }

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Removed duplicate re-declaration of controls here

        const shapeSizeSpring = {
          x: controls.shapeWidth,
          y: undefined,
        };

        // Set global uniforms that apply to all passes
        renderer.setUniforms({
          u_resolution: [canvasInfo.width * canvasInfo.dpr, canvasInfo.height * canvasInfo.dpr],
          u_dpr: canvasInfo.dpr,
          u_mouse: [stateRef.current.canvasPointerPos.x, stateRef.current.canvasPointerPos.y],
          u_glareAngle: (controls.glareAngle * Math.PI) / 180,
          // Dithering uniforms
          u_time: currentTime,
          u_frameCount: stateRef.current.frameCount,
          u_ditherStrength: stateRef.current.adaptiveQuality.ditherStrength,
          u_ditherType: stateRef.current.adaptiveQuality.ditherType,
          u_blueNoiseTex: stateRef.current.blueNoiseTexture,
          // Selective alpha uniforms
          u_enableSelectiveAlpha: stateRef.current.adaptiveQuality.enableSelectiveAlpha ? 1.0 : 0.0,
          u_tintAlphaThreshold: stateRef.current.adaptiveQuality.tintAlphaThreshold,
          u_effectComplexityThreshold: stateRef.current.adaptiveQuality.effectComplexityThreshold,
        });

        // Build pass-specific uniforms
        const passUniforms: Record<string, Record<string, any>> = {
          bgPass: {
            u_bgType: controls.bgType,
            u_bgTexture: (stateRef.current.bgTextureUrl && stateRef.current.bgTexture) ?? undefined,
            u_bgTextureRatio:
              stateRef.current.bgTextureUrl && stateRef.current.bgTexture
                ? stateRef.current.bgTextureRatio
                : undefined,
            u_bgTextureReady: stateRef.current.bgTextureReady ? 1 : 0,
            u_shadowExpand: controls.shadowExpand,
            u_shadowFactor: controls.shadowFactor / 100,
            u_shadowPosition: [-controls.shadowPosition.x, -controls.shadowPosition.y],
            // For background shadows, we still need all shapes
            u_shapeCount: stateRef.current.shapeManager.getVisibleShapes().length,
            u_shapePositions: stateRef.current.shapeManager.getShapeDataForShader().positions,
            u_shapeSizes: stateRef.current.shapeManager.getShapeDataForShader().sizes,
            u_shapeRadii: stateRef.current.shapeManager.getShapeDataForShader().radii,
            u_shapeRoundnesses: stateRef.current.shapeManager.getShapeDataForShader().roundnesses,
            u_shapeVisibilities: stateRef.current.shapeManager.getShapeDataForShader().visibilities,
            u_shapeZIndices: stateRef.current.shapeManager.getShapeDataForShader().zIndices,
            u_isHoverShape: stateRef.current.shapeManager.getShapeDataForShader().isHoverShape,
            u_mergeRatio: controls.mergeRatio,
          },
        };

        batchedData.batches.forEach((batch, index) => {
          const passName = `alphaBatch_${index}`;

          // Create shape data for this batch only
          const batchShapeData = {
            positions: [] as number[],
            sizes: [] as number[],
            radii: [] as number[],
            roundnesses: [] as number[],
            visibilities: [] as number[],
            zIndices: [] as number[],
            isHoverShape: [] as number[],
            tints: [] as number[],
          };
          
          const maxShapes = controls.maxShapesPerPass;
          for (let j = 0; j < maxShapes; j++) {
              if (j < batch.shapes.length) {
                  const shape = batch.shapes[j];
                  batchShapeData.positions.push(shape.position.x, shape.position.y);
                  batchShapeData.sizes.push(shape.size.width, shape.size.height);
                  batchShapeData.radii.push(shape.radius);
                  batchShapeData.roundnesses.push(shape.roundness);
                  batchShapeData.visibilities.push(shape.visible ? 1.0 : 0.0);
                  batchShapeData.zIndices.push(shape.zIndex);
                  batchShapeData.isHoverShape.push(shape.id === 'hover_shape' ? 1.0 : 0.0);
                  const tint = shape.tint || [255, 255, 255];
                  batchShapeData.tints.push(tint[0]/255, tint[1]/255, tint[2]/255, controls.shapeAlpha);
            } else {
                  batchShapeData.positions.push(0, 0);
                  batchShapeData.sizes.push(0, 0);
                  batchShapeData.radii.push(0);
                  batchShapeData.roundnesses.push(0);
                  batchShapeData.visibilities.push(0);
                  batchShapeData.zIndices.push(0);
                  batchShapeData.isHoverShape.push(0.0);
                  batchShapeData.tints.push(0,0,0,0);
            }
          }
          
          passUniforms[passName] = {
            u_shapeCount: batch.shapes.length,
            u_shapePositions: batchShapeData.positions,
            u_shapeSizes: batchShapeData.sizes,
            u_shapeRadii: batchShapeData.radii,
            u_shapeRoundnesses: batchShapeData.roundnesses,
            u_shapeVisibilities: batchShapeData.visibilities,
            u_shapeZIndices: batchShapeData.zIndices,
            u_isHoverShape: batchShapeData.isHoverShape,
            u_tint: [
              batch.tint[0] / 255,
              batch.tint[1] / 255,
              batch.tint[2] / 255,
              controls.shapeAlpha, // Use global alpha control
            ],
            u_mergeRatio: controls.mergeRatio,
            // Glass effect properties
            u_refThickness: controls.refThickness,
            u_refFactor: controls.refFactor,
            u_refDispersion: controls.refDispersion,
            u_refFresnelRange: controls.refFresnelRange,
            u_refFresnelHardness: controls.refFresnelHardness / 100,
            u_refFresnelFactor: controls.refFresnelFactor / 100,
            u_glareRange: controls.glareRange,
            u_glareHardness: controls.glareHardness / 100,
            u_glareConvergence: controls.glareConvergence / 100,
            u_glareOppositeFactor: controls.glareOppositeFactor / 100,
            u_glareFactor: controls.glareFactor / 100,
            STEP: controls.step,
          };
        });

        // Add uniforms for the single shape mask pass (much simpler!)
        const currentShapes = stateRef.current.shapeManager.getVisibleShapes();
        
        if (currentShapes.length > 0) {
          // Only need uniforms for the single allShapesMask pass
          passUniforms.allShapesMask = {
            u_shapeCount: currentShapes.length,
            u_shapePositions: stateRef.current.shapeManager.getShapeDataForShader().positions,
            u_shapeSizes: stateRef.current.shapeManager.getShapeDataForShader().sizes,
            u_shapeRadii: stateRef.current.shapeManager.getShapeDataForShader().radii,
            u_shapeRoundnesses: stateRef.current.shapeManager.getShapeDataForShader().roundnesses,
            u_shapeVisibilities: stateRef.current.shapeManager.getShapeDataForShader().visibilities,
            u_isHoverShape: stateRef.current.shapeManager.getShapeDataForShader().isHoverShape,
            u_mergeRatio: controls.mergeRatio,
          };
        }

        // Add uniforms for each z-index layer (simplified)
        // const currentPasses = buildLayeredRenderPasses(currentShapes); // This line is no longer needed
        
        // Group shapes by z-index for uniform generation
        // const zIndexGroups = new Map<number, Shape[]>(); // This line is no longer needed
        // currentShapes.forEach(shape => { // This line is no longer needed
        //   if (!zIndexGroups.has(shape.zIndex)) { // This line is no longer needed
        //     zIndexGroups.set(shape.zIndex, []); // This line is no longer needed
        //   } // This line is no longer needed
        //   zIndexGroups.get(shape.zIndex)!.push(shape); // This line is no longer needed
        // }); // This line is no longer needed
        
        // Add uniforms for each z-index layer
        // const zIndexValues = Array.from(zIndexGroups.keys()).sort((a, b) => a - b); // This line is no longer needed
        // for (let i = 0; i < zIndexValues.length; i++) { // This line is no longer needed
        //   const zIndex = zIndexValues[i]; // This line is no longer needed
        //   const shapesInGroup = zIndexGroups.get(zIndex)!; // This line is no longer needed
        //   const passName = `zIndexLayer_${zIndex}`; // This line is no longer needed
          
        //   // Get tint - prioritize hover shape tint if present, otherwise use first shape's tint // This line is no longer needed
        //   let groupTint: ColorValue; // This line is no longer needed
        //   const hoverShape = shapesInGroup.find(s => s.id === 'hover_shape'); // This line is no longer needed
        //   if (hoverShape && stateRef.current.hoveredShapeId) { // This line is no longer needed
        //     // Use the tint of the original hovered shape for the hover shape // This line is no longer needed
        //     const hoveredShapeDef = stateRef.current.shapeDefinitions.find(def => def.id === stateRef.current.hoveredShapeId); // This line is no longer needed
        //     groupTint = hoveredShapeDef ? hoveredShapeDef.tint : controls.tint; // This line is no longer needed
        //   } else { // This line is no longer needed
        //     // Use the tint of the first shape in the group // This line is no longer needed
        //     const firstShape = shapesInGroup[0]; // This line is no longer needed
        //     const shapeDef = stateRef.current.shapeDefinitions.find(def => def.id === firstShape.id); // This line is no longer needed
        //     groupTint = shapeDef ? shapeDef.tint : controls.tint; // This line is no longer needed
        //   } // This line is no longer needed
          
        //   // Create shape data for this z-index group only // This line is no longer needed
        //   const groupShapeData = { // This line is no longer needed
        //     positions: [] as number[], // This line is no longer needed
        //     sizes: [] as number[], // This line is no longer needed
        //     radii: [] as number[], // This line is no longer needed
        //     roundnesses: [] as number[], // This line is no longer needed
        //     visibilities: [] as number[], // This line is no longer needed
        //     zIndices: [] as number[], // This line is no longer needed
        //     isHoverShape: [] as number[], // This line is no longer needed
        //   }; // This line is no longer needed
          
        //   // Fill data for shapes in this group (up to 20 shapes max) // This line is no longer needed
        //   for (let j = 0; j < 20; j++) { // This line is no longer needed
        //     if (j < shapesInGroup.length) { // This line is no longer needed
        //       const shape = shapesInGroup[j]; // This line is no longer needed
        //       groupShapeData.positions.push(shape.position.x, shape.position.y); // This line is no longer needed
        //       groupShapeData.sizes.push(shape.size.width, shape.size.height); // This line is no longer needed
        //       groupShapeData.radii.push(shape.radius); // This line is no longer needed
        //       groupShapeData.roundnesses.push(shape.roundness); // This line is no longer needed
        //       groupShapeData.visibilities.push(shape.visible ? 1.0 : 0.0); // This line is no longer needed
        //       groupShapeData.zIndices.push(shape.zIndex); // This line is no longer needed
        //       groupShapeData.isHoverShape.push(shape.id === 'hover_shape' ? 1.0 : 0.0); // This line is no longer needed
        //     } else { // This line is no longer needed
        //       // Fill with default values for unused slots // This line is no longer needed
        //       groupShapeData.positions.push(0, 0); // This line is no longer needed
        //       groupShapeData.sizes.push(0, 0); // This line is no longer needed
        //       groupShapeData.radii.push(0); // This line is no longer needed
        //       groupShapeData.roundnesses.push(0); // This line is no longer needed
        //       groupShapeData.visibilities.push(0); // This line is no longer needed
        //       groupShapeData.zIndices.push(0); // This line is no longer needed
        //       groupShapeData.isHoverShape.push(0.0); // This line is no longer needed
        //     } // This line is no longer needed
        //   } // This line is no longer needed
          
        //   passUniforms[passName] = { // This line is no longer needed
        //     // Group shape data for blob merging // This line is no longer needed
        //     u_shapeCount: shapesInGroup.length, // This line is no longer needed
        //     u_shapePositions: groupShapeData.positions, // This line is no longer needed
        //     u_shapeSizes: groupShapeData.sizes, // This line is no longer needed
        //     u_shapeRadii: groupShapeData.radii, // This line is no longer needed
        //     u_shapeRoundnesses: groupShapeData.roundnesses, // This line is no longer needed
        //     u_shapeVisibilities: groupShapeData.visibilities, // This line is no longer needed
        //     u_shapeZIndices: groupShapeData.zIndices, // This line is no longer needed
        //     u_isHoverShape: groupShapeData.isHoverShape, // This line is no longer needed
        //     u_mergeRatio: controls.mergeRatio, // This line is no longer needed
            
        //     // Glass effect properties - using group tint // This line is no longer needed
        //     u_tint: [ // This line is no longer needed
        //       groupTint.r / 255, // This line is no longer needed
        //       groupTint.g / 255, // This line is no longer needed
        //       groupTint.b / 255, // This line is no longer needed
        //       groupTint.a, // This line is no longer needed
        //     ], // This line is no longer needed
        //     u_refThickness: controls.refThickness, // This line is no longer needed
        //     u_refFactor: controls.refFactor, // This line is no longer needed
        //     u_refDispersion: controls.refDispersion, // This line is no longer needed
        //     u_refFresnelRange: controls.refFresnelRange, // This line is no longer needed
        //     u_refFresnelHardness: controls.refFresnelHardness / 100, // This line is no longer needed
        //     u_refFresnelFactor: controls.refFresnelFactor / 100, // This line is no longer needed
        //     u_glareRange: controls.glareRange, // This line is no longer needed
        //     u_glareHardness: controls.glareHardness / 100, // This line is no longer needed
        //     u_glareConvergence: controls.glareConvergence / 100, // This line is no longer needed
        //     u_glareOppositeFactor: controls.glareOppositeFactor / 100, // This line is no longer needed
        //     u_glareFactor: controls.glareFactor / 100, // This line is no longer needed
        //     STEP: controls.step, // This line is no longer needed
        //   }; // This line is no longer needed
        // } // This line is no longer needed

        renderer.render(passUniforms);
      }

      // Performance monitoring and adaptation
      const frameTime = performance.now() - frameStart;
      stateRef.current.frameTimeHistory.push(frameTime);
      
      if (stateRef.current.frameTimeHistory.length > 60) {
          stateRef.current.frameTimeHistory.shift();
          
          const avgFrameTime = stateRef.current.frameTimeHistory.reduce((a, b) => a + b, 0) / 60;
          
          if (stateRef.current.performanceMode === 'auto') {
              adaptQualitySettings(avgFrameTime, stateRef.current.adaptiveQuality);
          }
      }
    };
    raf = requestAnimationFrame(render);

    return () => {
      canvasEl.removeEventListener('pointermove', onPointerMove);
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      canvasEl.removeEventListener('pointerup', onPointerUp);
      canvasEl.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('keydown', onKeyDown);
      if (raf) {
        cancelAnimationFrame(raf);
      }
      oitSystem?.dispose(); 
      displayPass?.dispose();
      renderer?.dispose();
    };
  }, [oitSystem, displayPass, gl, canvasInfo, controls]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={
          {
            ['--dpr']: canvasInfo.dpr,
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 1,
            display: 'block',
          } as CSSProperties
        }
      />
      <PerformanceCard />
    </>
  );
}

export default App;
