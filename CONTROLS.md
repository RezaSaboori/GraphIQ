# Liquid Glass Studio - Controls Documentation

This document provides a comprehensive overview of all available controls in the Liquid Glass Studio application. All controls are defined in `src/controlsConfig.js` and can be modified there.

## Table of Contents

- [Refraction Controls](#refraction-controls)
- [Glare Controls](#glare-controls)
- [Blur Controls](#blur-controls)
- [Tint Controls](#tint-controls)
- [Shadow Controls](#shadow-controls)
- [Background Controls](#background-controls)
- [Shape Settings](#shape-settings)
- [Animation Settings](#animation-settings)
- [Debug Settings](#debug-settings)
- [Modifying Controls](#modifying-controls)

---

## Refraction Controls

These controls affect the glass refraction effect, creating the liquid glass appearance.

### `refThickness` - Thickness
- **Range:** 1 - 80
- **Default:** 20
- **Step:** 0.01
- **Description:** Controls the thickness of the glass effect. Higher values create a more pronounced refraction effect.

### `refFactor` - Refraction Factor
- **Range:** 1 - 4
- **Default:** 1.4
- **Step:** 0.01
- **Description:** Multiplies the refraction strength. Higher values create stronger bending of light.

### `refDispersion` - Dispersion Gain
- **Range:** 0 - 50
- **Default:** 7
- **Step:** 0.01
- **Description:** Controls the chromatic dispersion effect (rainbow colors). Higher values create more pronounced color separation.

### `refFresnelRange` - Fresnel Size
- **Range:** 0 - 100
- **Default:** 30
- **Step:** 0.01
- **Description:** Controls the size of the Fresnel reflection effect. Higher values make the reflection more prominent.

### `refFresnelHardness` - Fresnel Hardness
- **Range:** 0 - 100
- **Default:** 20
- **Step:** 0.01
- **Description:** Controls the sharpness of the Fresnel reflection transition. Higher values create sharper edges.

### `refFresnelFactor` - Fresnel Intensity
- **Range:** 0 - 100
- **Default:** 20
- **Step:** 0.01
- **Description:** Controls the intensity of the Fresnel reflection. Higher values make the reflection more visible.

---

## Glare Controls

These controls manage the glare and highlight effects on the glass surface.

### `glareRange` - Glare Size
- **Range:** 0 - 100
- **Default:** 30
- **Step:** 0.01
- **Description:** Controls the size of the glare effect. Higher values create larger glare spots.

### `glareHardness` - Glare Hardness
- **Range:** 0 - 100
- **Default:** 20
- **Step:** 0.01
- **Description:** Controls the sharpness of the glare edges. Higher values create more defined glare boundaries.

### `glareFactor` - Glare Intensity
- **Range:** 0 - 120
- **Default:** 90
- **Step:** 0.01
- **Description:** Controls the brightness/intensity of the glare effect. Higher values create brighter glares.

### `glareConvergence` - Glare Convergence
- **Range:** 0 - 100
- **Default:** 50
- **Step:** 0.01
- **Description:** Controls how the glare converges toward the center. Higher values create more focused glare.

### `glareOppositeFactor` - Glare Opposite Side
- **Range:** 0 - 100
- **Default:** 80
- **Step:** 0.01
- **Description:** Controls the glare intensity on the opposite side of the light source.

### `glareAngle` - Glare Angle
- **Range:** -180 - 180
- **Default:** -45
- **Step:** 0.01
- **Description:** Controls the angle of the glare effect in degrees. Negative values rotate counterclockwise.

---

## Blur Controls

### `blurRadius` - Blur Radius
- **Range:** 1 - 200
- **Default:** 1
- **Step:** 1
- **Description:** Controls the radius of the Gaussian blur effect applied to the background. Higher values create more blur.

---

## Tint Controls

### `tint` - Tint
- **Type:** RGBA Color Object
- **Default:** `{ r: 255, g: 255, b: 255, a: 0 }`
- **Description:** Applies a color tint to the glass effect. The alpha channel controls the tint intensity.

---

## Shadow Controls

### `shadowExpand` - Shadow Expand
- **Range:** 2 - 100
- **Default:** 25
- **Step:** 0.01
- **Description:** Controls how much the shadow expands beyond the shape boundaries.

### `shadowFactor` - Shadow Intensity
- **Range:** 0 - 100
- **Default:** 15
- **Step:** 0.01
- **Description:** Controls the darkness/intensity of the shadow effect.

### `shadowPosition` - Shadow Position
- **Type:** 2D Vector `{ x, y }`
- **Default:** `{ x: 0, y: -10 }`
- **Range:** x: -20 to 20, y: -20 to 20
- **Description:** Controls the offset position of the shadow relative to the shape.

---

## Background Controls

### `bgType` - Background Type
- **Type:** Integer
- **Default:** 0
- **Description:** Selects the background type:
  - `0`: Grid pattern
  - `1`: Bars pattern
  - `2`: Half pattern
  - `3`: Tahoe Light image
  - `4`: Buildings image
  - `5`: Text image
  - `6`: Tim Cook image
  - `7`: UI image
  - `8`: Fish video
  - `9`: Traffic video
  - `10`: Flower video
  - `11`: Custom upload

---

## Shape Settings

### `shapeWidth` - Width
- **Range:** 20 - 800
- **Default:** 200
- **Step:** 1
- **Description:** Controls the width of the glass shape in pixels.

### `shapeHeight` - Height
- **Range:** 20 - 800
- **Default:** 200
- **Step:** 1
- **Description:** Controls the height of the glass shape in pixels.

### `shapeRadius` - Radius (%)
- **Range:** 1 - 100
- **Default:** 80
- **Step:** 0.1
- **Description:** Controls the corner radius as a percentage of the shape size.

### `shapeRoundness` - SuperEllipse Factor
- **Range:** 2 - 7
- **Default:** 5
- **Step:** 0.01
- **Description:** Controls the SuperEllipse roundness factor. Higher values create more rounded corners.


### `showShape1` - Show 2nd Shape
- **Type:** Boolean
- **Default:** true
- **Description:** Toggles the visibility of the second shape for blob effects.

---

## Animation Settings

### `springSizeFactor` - Animation Morph
- **Range:** 0 - 50
- **Default:** 10
- **Step:** 0.01
- **Description:** Controls the spring animation intensity for shape morphing effects.

---

## Debug Settings

### `step` - Show Step
- **Range:** 0 - 9
- **Default:** 9
- **Step:** 1
- **Description:** Controls which rendering step to display for debugging purposes:
  - `0-8`: Various intermediate rendering steps
  - `9`: Final composite result

---

## Modifying Controls

To modify any control values, edit the `src/controlsConfig.js` file:

```javascript
// Example: Change the default thickness
export const controlsConfig = {
  refThickness: {
    min: 1,
    max: 80,
    step: 0.01,
    value: 25, // Changed from 20 to 25
  },
  // ... other controls
};

// Example: Change the default controls
export const defaultControls = {
  refThickness: 25, // Changed from 20 to 25
  // ... other controls
};
```

### Important Notes:

1. **Both objects must be updated**: When changing a control value, update both the `controlsConfig` object (for the UI constraints) and the `defaultControls` object (for the actual values).

2. **Value constraints**: The `value` in `controlsConfig` should be within the `min` and `max` range.

3. **Type consistency**: Ensure the data types match between the configuration and default values (numbers, booleans, objects).

4. **Restart required**: Changes to the controls configuration require restarting the development server to take effect.

---

## Control Categories Summary

| Category | Controls | Purpose |
|----------|----------|---------|
| **Refraction** | 6 controls | Glass refraction and Fresnel effects |
| **Glare** | 6 controls | Light glare and highlight effects |
| **Blur** | 1 control | Background blur effects |
| **Tint** | 1 control | Color tinting |
| **Shadow** | 3 controls | Shadow positioning and intensity |
| **Background** | 1 control | Background type selection |
| **Shape** | 6 controls | Shape dimensions and properties |
| **Animation** | 1 control | Spring animation effects |
| **Debug** | 1 control | Rendering step visualization |

**Total: 26 controls** across 9 categories
