// Type definitions
interface ControlRange {
  min: number;
  max: number;
  step: number;
  value: number;
}

interface ColorValue {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface PositionValue {
  x: number;
  y: number;
  xMax?: number;
  yMax?: number;
}

interface TintControl {
  value: ColorValue;
}

interface ShadowPositionControl {
  x: number;
  y: number;
  xMax: number;
  yMax: number;
}

interface BgTypeControl {
  contentValue: number;
}

interface ShapeSettings {
  shapeWidth: ControlRange;
  shapeRadius: ControlRange;
  shapeRoundness: ControlRange;
  shapeSqueeze: ControlRange;
  shapeCount: ControlRange;
  shapeSpacing: ControlRange;
  shapeDistribution: { value: 'grid' | 'random'; options: ['grid', 'random'] };
  shapeAlpha: ControlRange;
}

interface DebugSettings {
  step: ControlRange;
}

interface CanvasSettings {
  width: ControlRange;
  height: ControlRange;
}

interface Controls {
  refThickness: ControlRange;
  refFactor: ControlRange;
  refDispersion: ControlRange;
  refFresnelRange: ControlRange;
  refFresnelHardness: ControlRange;
  refFresnelFactor: ControlRange;
  glareRange: ControlRange;
  glareHardness: ControlRange;
  glareFactor: ControlRange;
  glareConvergence: ControlRange;
  glareOppositeFactor: ControlRange;
  glareAngle: ControlRange;
  
  mergeRatio: ControlRange;
  tint: TintControl;
  shadowExpand: ControlRange;
  shadowFactor: ControlRange;
  shadowPosition: ShadowPositionControl;
  bgType: BgTypeControl;
  shapeSettings: ShapeSettings;
  debugSettings: DebugSettings;
  canvasSettings: CanvasSettings;

  // Dithering and performance controls from the guide
  ditherStrength: ControlRange;
  ditherType: { value: number; options: { [key: string]: number } };
  maxShapesPerPass: ControlRange;
  enableDepthPrepass: { value: boolean };
  // Selective transparency controls
  enableSelectiveAlpha: { value: boolean };
  tintAlphaThreshold: ControlRange;
  effectComplexityThreshold: ControlRange;
}

// Removed per-shape tint controls from global config. Per-shape tints are defined per shape in App.tsx.

interface DefaultControls {
  refThickness: number;
  refFactor: number;
  refDispersion: number;
  refFresnelRange: number;
  refFresnelHardness: number;
  refFresnelFactor: number;
  glareRange: number;
  glareHardness: number;
  glareFactor: number;
  glareConvergence: number;
  glareOppositeFactor: number;
  glareAngle: number;
  step: number;
  shapeWidth: number;
  shapeHeight: number;
  shapeRadius: number;
  shapeRoundness: number;
  shapeSqueeze: number;
  shapeCount: number;
  shapeSpacing: number;
  shapeDistribution: 'grid' | 'random';
  maxShapesPerPass: number;
  enableDepthPrepass: boolean;
  ditherStrength: number;
  ditherType: number;
  shapeAlpha: number;
  // Additional properties used in App.tsx
  mergeRatio: number;
  tint: ColorValue;
  shadowExpand: number;
  shadowFactor: number;
  shadowPosition: { x: number; y: number };
  bgType: number;
  canvasWidth: number;
  canvasHeight: number;
  // Add new defaults
  enableSelectiveAlpha: boolean;
  tintAlphaThreshold: number;
  effectComplexityThreshold: number;
}

// Control configuration values
export const controlsConfig: Controls = {
  refThickness: {
    min: 1,
    max: 80,
    step: 0.01,
    value: 20,
  },
  refFactor: {
    min: 1,
    max: 4,
    step: 0.01,
    value: 1.4,
  },
  refDispersion: {
    min: 0,
    max: 50,
    step: 0.01,
    value: 7,
  },
  refFresnelRange: {
    min: 0,
    max: 100,
    step: 0.01,
    value: 30,
  },
  refFresnelHardness: {
    min: 0,
    max: 100,
    step: 0.01,
    value: 20,
  },
  refFresnelFactor: {
    min: 0,
    max: 100,
    step: 0.01,
    value: 20,
  },
  glareRange: {
    min: 0,
    max: 100,
    step: 0.01,
    value: 30,
  },
  glareHardness: {
    min: 0,
    max: 100,
    step: 0.01,
    value: 20,
  },
  glareFactor: {
    min: 0,
    max: 120,
    step: 0.01,
    value: 90,
  },
  glareConvergence: {
    min: 0,
    max: 100,
    step: 0.01,
    value: 50,
  },
  glareOppositeFactor: {
    min: 0,
    max: 100,
    step: 0.01,
    value: 80,
  },
  glareAngle: {
    min: -180,
    max: 180,
    step: 0.01,
    value: -45,
  },
  
  mergeRatio: {
    min: 0.01,
    max: 1.0,
    step: 0.01,
    value: 0.1,
  },
  tint: {
    value: { r: 255, b: 255, g: 255, a: 0 },
  },
  shadowExpand: {
    min: 2,
    max: 100,
    step: 0.01,
    value: 25,
  },
  shadowFactor: {
    min: 0,
    max: 100,
    step: 0.01,
    value: 15,
  },
  shadowPosition: {
    x: 0,
    y: -10,
    xMax: 20,
    yMax: 20,
  },
  bgType: {
    contentValue: 1,
  },
  shapeSettings: {
    shapeWidth: {
      min: 20,
      max: 800,
      step: 1,
      value: 200,
    },
    shapeRadius: {
      min: 1,
      max: 100,
      step: 0.1,
      value: 80,
    },
    shapeRoundness: {
      min: 2,
      max: 7,
      step: 0.01,
      value: 5,
    },
    shapeSqueeze: { value: 0.5, min: 0, max: 2, step: 0.01 },
    shapeCount: { value: 100, min: 1, max: 2000, step: 1 },
    shapeSpacing: { value: 10, min: 0, max: 100, step: 1 },
    shapeDistribution: { value: 'grid', options: ['grid', 'random'] },
    shapeAlpha: { value: 0.5, min: 0, max: 1, step: 0.01 },
  },
  debugSettings: {
    step: {
      value: 9,
      min: 0,
      max: 9,
      step: 1,
    },
  },
  canvasSettings: {
    width: {
      min: 100,
      max: 4000,
      step: 1,
      value: window.innerWidth,
    },
    height: {
      min: 100,
      max: 4000,
      step: 1,
      value: window.innerHeight,
    },
  },
  
  // Dithering controls
  ditherStrength: { value: 0.6, min: 0.0, max: 1.0, step: 0.01 }, // Reduced from 0.8
  ditherType: {
    value: 1, // Default to hash-based for better quality
    options: {
      'Smooth Blend': 0,  // No dithering
      'Minimal Dither': 1, // Hash with stability
      'Advanced Dither': 2 // Full quality
    }
  },

  // Selective transparency controls
  enableSelectiveAlpha: { value: true }, // Enable hybrid approach
  tintAlphaThreshold: { value: 0.9, min: 0.5, max: 1.0, step: 0.01 }, // Smooth tint threshold
  effectComplexityThreshold: { value: 0.3, min: 0.1, max: 0.8, step: 0.05 }, // When to use alpha testing

  // Performance optimization
  maxShapesPerPass: { value: 50, min: 20, max: 200, step: 10 },
  enableDepthPrepass: { value: false },
};

// Default control values (flattened for easy access)
export const defaultControls: DefaultControls = {
  refThickness: 30,
  refFactor: 1.6,
  refDispersion: 7,
  refFresnelRange: 5,
  refFresnelHardness: 5,
  refFresnelFactor: 10,
  glareRange: 5,
  glareHardness: 15,
  glareFactor: 70,
  glareConvergence: 50,
  glareOppositeFactor: 80,
  glareAngle: -45,
  mergeRatio: 0.01,
  tint: { r: 0, b: 255, g: 255, a: 0.6 },
  shadowExpand: 25,
  shadowFactor: 35,
  shadowPosition: { x: 0, y: 0 },
  bgType: 1,
  shapeWidth: 200,
  shapeRadius: 80,
  shapeRoundness: 5,
  step: 9,
  canvasWidth: window.innerWidth,
  canvasHeight: window.innerHeight,
  ditherStrength: 0.6,
  ditherType: 1,
  maxShapesPerPass: 50,
  enableDepthPrepass: false,
  shapeAlpha: 0.5,
  shapeHeight: 200,
  shapeSqueeze: 0.5,
  shapeCount: 100,
  shapeSpacing: 10,
  shapeDistribution: 'grid',
  enableSelectiveAlpha: true,
  tintAlphaThreshold: 0.9,
  effectComplexityThreshold: 0.3,
};
