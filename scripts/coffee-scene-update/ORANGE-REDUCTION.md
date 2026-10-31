# Orange bag reduction — 2026-10-27

Applied to `public/images/3d/robusta-product-scene.glb`.

- Orange triangles: 36,602 → 12,198 (33.33% retained).
- Orange vertices: 18,435 → 6,144.
- GLB bytes: 6,949,460 → 6,208,608.
- Existing meshoptimizer simplifies the three material groups with locked borders and normal/UV attribute weights. Six extrema are pinned; bounds remain exact. Retained vertex positions/normals/UVs are exact source records; indices use 16 bits.
- Embedded images, materials, samplers, transforms, blue/green bags and props remain unchanged. No extra draw call, runtime decoder or dependency.
- Welded topology check: 0 boundary edges, 0 non-manifold edges; 0 degenerate triangles. Three.js viewer loads both assets and preserves label readability in the checked view.
- Thin-triangle percentage increases with simplification; this is a count-reduction pass, not a claim of cleaner editable quad topology. Close-up surfaces may expose coarser facets. No FPS benchmark performed.

## Fold zones

1. Shoulders under the zipper: short oblique folds, gentle transitions.
2. Body-to-side-gusset: light vertical relief, interrupted rather than repetitive waves.
3. Bottom corners: short diagonal tension folds, keeping the standing seam stable.

Keep the central printed label relatively calm. The rings are SVG annotations in the viewer only; no new wrinkles were applied to the GLB.

Viewer: http://127.0.0.1:4178/orange

Backup: C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/orange-third/before.glb

Source command: `node scripts/coffee-scene-update/reduce-orange.mjs <before.glb> <candidate.glb> <report.json>`.
