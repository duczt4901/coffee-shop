# Orange pouch: structured quad source — 2026-10-27

The runtime scene uses the rebuilt orange pouch, with the later softening pass
described below. Its editable source is
`orange-quad-source.obj`: 6,096 actual four-vertex faces, with UV coordinates,
smooth normals and three material groups. The OBJ contains no textures/MTL;
the runtime GLB retains the existing embedded PBR materials and artwork.

## Topology

- 6,098 vertices: 6,090 connect to four quad edges; eight cap corners connect
  to three. No vertex connects to more than four quad edges.
- 65 height rings, 84 vertices around the pouch; 30 columns on each broad face
  and 12 on each gusset. The two closing surfaces use quad grids, not fans.
- Height sampling concentrates rows at the bottom (17), shoulder (23) and seal
  (21), with seven in the middle. Band boundaries are shared, so these counts
  do not sum to 65. Columns also concentrate near the side transitions.
- The geometry follows the pre-decimation refined pouch guide. This is a
  retopology preserving its existing folds, not an additional wrinkle-sculpt pass.
- The positive gusset perimeter is ordered coherently; the former duplicated
  front endpoint no longer crosses the back-to-front side loop.

GLB stores the triangulated result: **12,192 triangles**, compared with 12,198
in the preceding reduction. The original 36,602-triangle orange pouch is still
the shape guide. Quad edges in the comparison viewer come directly from the
source faces. The separate “Tam giác GLB” mode shows the actual render triangles.

## Preservation and verification

`orange-quad-report.json` records counts, bounds and hashes;
`orange-quad-validation.json` records the independent geometry/preservation checks.

- Blue, green and every other mesh's accessor bytes are unchanged.
- Embedded image bytes, materials, textures, samplers and node transforms are
  unchanged. Orange UVs are resampled for the new grid, aligned to the existing
  label rectangle; the old UV/normal buffers themselves are not retained.
- Orange local bounds are identical. No degenerate triangles, open boundary
  edges or non-manifold edges were found.
- The strict non-coplanar intersection check found zero crossing pairs among
  7,849 candidate triangle pairs. It does not certify coplanar overlap.
- Front, quarter, side, shoulder and bottom-region comparisons were inspected
  in the browser. Material and clay views were also compared.
- The applied GLB was loaded on the existing homepage and the orange pouch was
  visually checked in its full scene. `orange-quad/homepage.png` records that view.
- Scene size: 6,208,608 → 6,207,080 bytes. Camera, lighting, AO, DPR and antialiasing
  settings are untouched. No measured FPS improvement is claimed.

## Rebuild and backup

Run `build-orange-quads.py <current-input.glb> <high-resolution-guide.glb> <output-dir>`
with Python and the existing NumPy installation. It writes the quad OBJ/JSON,
triangulated candidate and report, with closure/valence/degeneracy assertions.
The guide is the specific structured pre-decimation orange revision; this is not
a generic retopology utility for arbitrary models. Do not decimate the generated
mesh afterward: that destroys the controlled quad flow.

Immutable task artifacts live under:

`C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/`

- Input/rollback: `orange-quad/before.glb`, SHA-256
  `ec11425c10df48c5adcd048d61867442bea442424c4f0f7d8daed25e958aba4b`.
- Structured guide: `orange-third/before.glb`, SHA-256
  `ab83b0e750c5ee83dfa55ddb10ee2b39636ad03e4287967b07f7b0361c3b2d34`.
- Applied candidate: `orange-quad/candidate.glb`, SHA-256
  `6c35c0cac3d1aa7c7b83270ca28bc028e6b3c571b817fc39a4ce849305761a68`.
- Viewer and screenshots: `orange-quad/`; local viewer URL:
  `http://127.0.0.1:4178/quad`.

## Softer fold curvature — subsequent revision

`soften-orange-quads.py <before.glb> <quad-source.json> <source.obj> <output-dir>`
fits short vertical quadratic patches in the bottom and shoulder bands. It removes
abrupt inward/outward peaks while leaving the seal, cap surfaces, height coordinates,
quad connectivity and UV coordinates intact. It changes positions and recomputes
smooth normals at build time; there is no runtime smoothing or subdivision.

- Still 6,096 quads / 6,098 vertices / 12,192 render triangles.
- 3,024 vertices move; maximum displacement is 0.05349 mesh units (about 1.5% of
  pouch height); mean displacement across all vertices is 0.002905 units.
- Blue/green and all other geometry accessor bytes are unchanged. Textures,
  materials, indices, UVs and transforms are unchanged.
- No degenerate faces, open edges, non-manifold edges or new strict non-coplanar
  intersections were found. Material and clay comparisons were inspected.
- `orange-soft-report.json` and `orange-soft-validation.json` record this pass.
- The immutable input, input OBJ/JSON and candidate are in the task artifact
  root's `orange-soft/` folder. Softened asset SHA-256:
  `f654cdf689115f833a28ee50602547e65d7f94b4c50cc90e87dc6d0918a0a218`.
- `/quad` now shows the softened runtime asset; `/soft` compares both true quad
  sources before/after softening. The earlier `orange-quad/candidate.glb` remains
  the immutable pre-softening revision. No FPS benchmark was run for this edit.

## More pronounced natural folds — current revision

`shape-orange-folds.py <before.glb> <quad-source.json> <source.obj> <output-dir>`
adds rounded depressions with adjacent raised ridges: asymmetric diagonal folds
below the seal, two corner folds at the bottom and broader gusset buckles. The
middle stays comparatively flat. Fold strength tapers at the outer seam and
seal; the spatial deformation is continuous across face/gusset boundaries.

- Geometry is sculpted at build time. There is no added noise shader, runtime
  deformation, subdivision, lighting change or additional render pass.
- Same 6,096 quads / 6,098 vertices / 12,192 triangles and existing vertex valence.
  The existing UV coordinates, index buffers, material assignment, embedded images
  and label design/colors are retained. The artwork follows the pouch relief.
- 2,975 vertices move; maximum displacement is 0.16207 mesh units, about 4.6% of
  pouch height. Height coordinates, closing caps and the top seal stay fixed.
- Validation found zero degenerate faces, boundary/non-manifold edges and strict
  non-coplanar crossings in the edited region. The checks have the same coplanar
  limitation as earlier passes. No FPS benchmark was run.
- `orange-folds-report.json` and `orange-folds-validation.json` record this pass.
  The export code is shared with the softening pass; rebuilding the preceding
  softened revision produced its identical SHA-256 after that extraction.
- Immutable input/source/OBJ, candidate and visual comparisons are under the task
  artifact root's `orange-folds/` folder. Input SHA-256 is the softened hash above;
  current output SHA-256 is
  `ebad1da771e4649351584c7ab179f633685ff6c3b5352ca79978f958c7614687`.
- `/folds` compares the soft input with the sculpted result under identical light
  and camera settings. `/quad` shows the current runtime asset. The earlier
  `/soft` comparison remains a historical snapshot.
- Clay/material comparisons and the applied homepage scene were inspected;
  `orange-folds/clay-quarter.png`, `beauty-front.png` and `homepage.png` record them.

The later current scene also reuses this template for blue and green with their
own label materials and existing placement/height transforms. See the README's
“Three pouches sharing the folds template” section and `shared-folds-report.json`.
The orange OBJ is the common authoring template; it is not three separate copies.
