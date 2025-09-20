## Liquid Glass Studio

A real‑time WebGL2 "liquid glass" compositor built with React + Vite. Shapes are loaded from a dataset JSON and rendered in layered passes with blur, refraction, and glare effects. You can drag groups by z‑index, hover to spawn a merging bubble, and tweak appearance via the control panel.

### Features
- **Dataset‑driven shapes**: define shapes in `public/datasets/shapes.json`.
- **Layered rendering**: grouped by `zIndex` with per‑group tint and merged blobs.
- **Single-pass background blur**: optimized shape mask with vertical + horizontal blur.
- **Interactive**: drag shapes (grouped by `zIndex`), hover merge animation.
- **Controls**: refraction, glare, blur radius, tint, and background settings.

### Quick start
```bash
# Install
npm install
# or
pnpm install

# Dev server
npm run dev

# Build
npm run build

# Preview build
npm run preview
```

Open the app in your browser (the dev server prints the URL, usually `http://localhost:5173`).

### Dataset: defining shapes
Shapes are loaded at runtime from:
- `public/datasets/shapes.json`

Each item uses this schema:
```json
[
  {
    "id": "shape1",
    "position": { "x": 100, "y": 0 },
    "size": { "height": 200 },
    "zIndex": 0,
    "tint": [255, 0, 0]
  }
]
```
Notes:
- **width**: comes from the live control `shapeWidth` (same width for all shapes). Heights and positions come from the dataset.
- **DPR scaling**: `position.x`, `position.y`, and `size.height` are multiplied by device pixel ratio at load to keep visuals crisp on HiDPI screens.
- **tint**: `[r, g, b]` array format where `r/g/b` are `0‑255`. Alpha is controlled by the global `shapeAlpha` control.
- **zIndex**: shapes with the same value merge into a single "blob" layer and drag together.

### Controls & interactions
- **Mouse**:
  - Hover a shape: creates a small merge bubble that animates from its corner.
  - Drag: click a shape to drag the entire group with the same `zIndex`.
- **Keyboard**:
  - `1`, `2`, `3`…: select shapes by index (for logging/inspection).
  - `Space`: cycle selected shape.
  - `+` / `=`: increase selected shape `zIndex`.
  - `-`: decrease selected shape `zIndex` (not below `0`).

### Backgrounds
The background can be configured via the controls (images or videos). Video frames update the background texture each frame for refraction.

### Project structure (high level)
- `src/App.tsx`: renderer setup, dataset loading, event handling, uniforms.
- `src/utils/GLUtils.ts`: WebGL2 helpers, multipass renderer, textures.
- `src/utils/ShapeManager.ts`: shape store, hit‑testing, grouping, serialization.
- `src/shaders/*.glsl`: vertex + fragment shaders for bg, blur, main, and masks.
- `public/datasets/shapes.json`: the shapes dataset.

### Performance tips
- Keep the number of visible shapes moderate. Shapes in the same `zIndex` merge efficiently, but total count still matters.
- Blur radius impacts cost; try smaller values on low‑end devices.
- Large video backgrounds are expensive; prefer images or compressed/short clips.

### Large assets (videos)
Some video assets exceed GitHub’s recommended file size and may trigger warnings. If you plan to keep large media in the repo, consider Git LFS:
- `https://git-lfs.github.com`

### License
This project is licensed under the terms in `LICENSE`.
