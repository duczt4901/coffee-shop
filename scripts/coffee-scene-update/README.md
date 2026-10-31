# Coffee scene revision — 2026-10-26

Runtime asset: `public/images/3d/robusta-product-scene.glb`.
The development viewer and its dependencies live in `scripts/coffee-scene-update/viewer/`;
`check.cjs` serves them through its local browser routes. They are not deployed as public assets.
Unused model variants, old preview images and reports have been removed from `public/images/3d/`.
The homepage model section uses responsive framing and a scroll-driven camera tilt.
The camera starts at 30° elevation / +20° horizontal orbit when the canvas top reaches
the viewport bottom and settles to −15° elevation / −20° horizontal orbit when its
bottom reaches the viewport top; reverse scrolling retraces the same linear path.
Both angles share the existing scroll progress with no additional easing or damping.
Canvas fitting samples the two-axis path with each view's camera-right/up basis.
The current runtime uses DPR 1 without MSAA. The text retains
the existing typography in normal document flow, without a sticky scene or text reveal.

## Result

- File: 9,761,356 → 6,890,300 bytes (including the Paper 002 material maps).
- Rendered triangles: 465,276 → 134,310 (71.1% fewer).
- The initial optimization reduced embedded textures from 7,415,420 to 2,011,916 bytes.
  The subsequent material pass uses lossless front maps to preserve printed-label pixels.
- Still 44 instanced beans, three pouches and the supplied cup. No runtime decoder added.
- Orange positions, normals, UVs and indices are byte-identical to the previous scene.
- Blue/green have independent seeded corner and shoulder folds. Their meshes are
  reduced with material boundaries locked. Closure is checked after welding the
  coincident zipper rings for validation only; render UV/normal seams are retained.
- Yaw: orange −16°, blue +12°, green +4°. Small position offsets avoid an aligned row.
- Label designs and 1024×2048 resolution stay intact. JPEG quality 96, no chroma
  subsampling; measured RMS error is below 1.14/255 per channel. Pouch normal/roughness
  maps retain 512px resolution; the tiny beans use 512px color and 256px data maps.
- The unused circular studio cove is replaced by a two-triangle floor, retaining shadows.
- The pouch body uses the supplied ambientCG Paper 002 Color, NormalGL, and Roughness
  maps. Color receives an 18/255 lift and 25% desaturation: mean RGB changes from
  (195, 185, 179) to (211, 204, 199), retaining the original paper grain and warm tone.
- Paper normals use strength 0.18; roughness is moderated for semi-matte laminate.
  No displacement is applied to the approved pouch shape.
- The printed front rectangles remain on their original clean materials. Unprinted
  front triangles are reassigned to the body material; triangles touching the print
  boundary stay with the label. All label materials and image bytes remain unchanged.
  Position, normal, and UV buffers, triangle count, seals, props, camera, and layout stay intact.

## Lighting and label boundary revision

- Runtime camera uses the reference's 5.505° field of view as its framing reference
  and orbits above the front (+Z) axis. Camera-space box fitting provides a responsive reference
  before the close-up multiplier is applied.
- HDR/environment maps and ACES tone mapping are removed. Two directional lights
  retain the reference's warm/cool colors and 1:0.463 balance, with diffuse hemisphere
  fill replacing environment illumination. The warm key casts a 2048px PCF shadow.
- SSAO is the only visual postprocessing effect: 16 samples, 0.5 blend strength,
  50% drawing-buffer resolution. The output pass performs only sRGB conversion.
  The composer uses LDR targets with 4x MSAA for the beauty render; the default
  framebuffer disables redundant MSAA for the final fullscreen output. There is no bloom, film grain,
  sharpening, DOF, SSR or temporal accumulation. Rendering remains on demand.
- `fix-label-boundary.py` cuts front triangles at the exact printed UV rectangle.
  This replaces the old whole-triangle selection that left pale jagged patches
  next to the sticker. New vertices interpolate the existing surface; surface
  area, props and placements are preserved. Label image bytes and materials stay
  unchanged. Body roughness is approximately 0.61, retaining Paper002 maps.
- Boundary-fix GLB: 6,956,832 bytes. The boundary fix adds 1,222 vertices; unused replaced
  geometry buffers are discarded. `label-boundary-report.json` records the result.

## Lighter pouch and frontal camera — 2026-10-27

- Current GLB: 6,952,268 bytes. Embedded Paper002 body color has mean sRGB
  (239, 237, 234), shifted from (212, 204, 199). The adjustment retains 90% of
  the original color variation before JPEG encoding; the seals use (244, 243, 240).
- Labels, geometry, normal maps and roughness maps remain byte-identical.
  Pouch placements, lighting and the existing on-demand render lifecycle are retained.
- The camera uses the front (+Z) axis as its reference, with a 2/3 distance multiplier relative
  to a viewport-height reference: approximately 90% of the previous 0.6 close-up.
  Narrow screens limit the zoom to keep the complete product group within the width.
  Canvas height fits the projected bounds at both ends of the tilt, with 5% padding.
  Vertical FOV compensates for the canvas height so resizing it does not undo the zoom.
  The orbit now goes from 21° to 10° at the same distance, preserving the zoom.
  ScrollTrigger maps `top center` to `bottom center`, rendering only when the
  progress changes or the canvas resizes, with no continuous model render loop.
  The canvas extends through the section's page gutters to fill the available viewport width;
  text keeps its original page gutters.
- The WebGL canvas has a transparent background. Physical ground shadows are
  retained with ShadowMaterial; the page supplies the background color.
  The reduced AO settings cut its nominal sample workload to about 22% of the
  former 32-sample, 75%-resolution pass without reducing beauty-render resolution.
- The pre-adjustment GLB and verification report are saved outside the repository
  in the task's visualization directory as `coffee-before-front-off-white.glb`
  and `coffee-front-off-white-report.json`. Apply any future color adjustment
  from that backup to avoid cumulative JPEG recompression.

## Rebuild

### Geometry refinement — 2026-10-27

An earlier runtime revision includes a geometry-only refinement. See
`GEOMETRY-REFINEMENT.md` and `geometry-refinement-report.json` for the applied changes,
the immutable backup location, comparison images, preservation checks and limitations.

- Orange: 36,800 → 36,602 triangles; blue: 18,608 → 18,595; green: 18,638 → 18,618.
- Local shoulder/bottom/gusset-transition guide patches retain the original UV buffers,
  artwork, material definitions, transforms, silhouette bounds and non-bag geometry.
- Six print-boundary T-junction splits per bag close the welded boundary; 249 collapsed
  body triangles with zero UV area are removed. No mesh, primitive or draw call is added.
- Run `refine-geometry.py <before.glb> <candidate.glb> <report.json>` followed by
  `validate-refinement.py <before.glb> <candidate.glb> <validation.json>` with Python/NumPy.
  Start from the recorded immutable backup, never from an already-refined candidate.
- This asset revision does not alter homepage camera, lighting, AO, DPR or antialiasing.

### Orange bag at one-third density — 2026-10-27

- A later pass reduces only orange from 36,602 to 12,198 triangles and from 18,435 to
  6,144 vertices. Blue/green, props, artwork, materials and transforms stay unchanged.
- `reduce-orange.mjs` uses the existing meshoptimizer at build time with material/seam
  borders locked and normals/UVs weighted. No runtime decoder is added.
- See `ORANGE-REDUCTION.md` and `orange-reduction-report.json` for the backup, checks
  and fold-zone annotations. The proposed fold regions are viewer overlays only;
  this pass does not add wrinkles to the model.

### Orange pouch with structured quads — 2026-10-27 (current)

- The subsequent retopology replaces only orange with 6,096 real source quads
  (6,098 vertices), exported as 12,192 GLB triangles. It retains the one-third
  triangle budget and concentrates rows around folds, seals and side transitions.
- All quad vertices have degree four except eight cap corners of degree three.
  No source vertex has degree above four; render-triangle edges are a separate view.
- `orange-quad-source.obj` preserves the editable quad geometry outside public
  assets. The runtime scene keeps the original embedded materials and artwork.
- See `ORANGE-QUADS.md`, `orange-quad-report.json` and `orange-quad-validation.json`
  for rebuild inputs, preservation checks, comparison captures and limitations.
- A subsequent `soften-orange-quads.py` pass reduces sharp bottom/shoulder peaks
  without changing topology, UVs or render counts. The editable OBJ includes this
  pass; `orange-soft-report.json` and `orange-soft-validation.json` record it.
- The current `shape-orange-folds.py` pass then adds deeper, rounded diagonal and
  corner folds to the orange pouch. It shares the existing asset exporter and
  keeps the quad/UV layout, materials and render counts. See `ORANGE-QUADS.md`,
  `orange-folds-report.json` and `orange-folds-validation.json` for this revision.

### Three pouches sharing the folds template — current scene

- `share-pouch-folds.py <before.glb> <candidate.glb> <report.json>` replaces blue
  and green geometry with the orange folds template, sharing attribute/index
  accessors instead of storing three copies. Each pouch retains its own approved
  label material, texture, scene transforms and original displayed height.
- Heights stay 0.340 for orange and 0.282 for blue/green; the blue bag remains
  raised by 0.190. Positions and yaw angles are unchanged.
- Each bag now renders 12,192 triangles (6,096 source quads); three-bag triangles
  decrease from 49,405 to 36,576. Twelve newly unused geometry accessors/views
  are removed; the GLB shrinks from 6,207,108 to 5,180,044 bytes.
- The studio key rises from 3.8 to 4.2, fill drops from 1.759 to 0.85, and
  hemisphere fill drops from 2 to 0.95. Directions, colors, shadow map, AO, DPR,
  camera/orbit and render scheduling stay unchanged. This is the runtime homepage
  light setup; historical geometry comparison viewers retain their neutral lights.
- `shared-folds-report.json` records preservation/geometry checks and hashes;
  `shared-folds-validation.json` records serialized GLB, image/instance data,
  lighting and TypeScript/ESLint checks. The source quad OBJ remains the template.
- Immutable input/candidate and studio snapshots are in the task artifact root's
  `shared-folds/` folder. Current GLB SHA-256:
  `4c8cb4d02ec043899b42b2cd75c49784112d20878139aca6304fc1e34b90cf62`.
- The applied homepage was visually checked. No measured FPS claim is made.

### Coffee beans at approximately 500 triangles — current scene

- `reduce-beans.mjs <before.glb> <candidate.glb> <report.json> 500` uses the bundled
  meshoptimizer simplifier at build time. It locks UV borders and six bounding
  extrema, weights normal/UV attributes, and compacts retained vertex records.
- Bean templates 1/3/4/2 change from 1,042/1,112/1,112/4,454 triangles to
  506/500/500/510. All 44 instances, their transforms, eight draw groups, materials
  and original textures remain. The pouch templates, labels, lights and props
  are byte-identical to the preceding asset/configuration.
- Rendered bean triangles: 54,632 → 22,104 (−59.5%). Whole GLB scene triangles:
  99,208 → 66,680 (−32.8%). These counts include the source floor's two triangles;
  the homepage replaces that floor with its equivalent shadow plane.
- Unique bean vertices: 4,488 → 1,380. Geometry buffer bytes: 189,936 → 56,256
  (−70.4%). File bytes: 5,180,044 → 5,046,580 (−2.6%). Embedded bean textures
  remain 838,498 bytes, so the download reduction is modest compared with geometry.
- No degenerate faces, welded boundary/non-manifold edges or strict non-coplanar
  triangle crossings were found in the reduced beans. Their bounds are exact;
  retained vertex UV/normal records are copied without modification. Every
  non-bean accessor and instance-data view is unchanged.
- Cavity/texture comparisons were inspected on all four types. At extreme
  magnification, curved outlines have fewer segments and tiny surface features
  differ; at the homepage size the difference is subtle. Normal maps retain
  most of the visible skin grain. No measured GPU/FPS gain is claimed: texture,
  AO, pixel-shading and draw-call workloads remain.
- `bean-reduction-report.json` and `bean-reduction-validation.json` record counts,
  hashes and checks. Immutable input/candidate and comparison screenshots are in
  the task artifact root's `bean-reduction/` folder. Local close-up viewer:
  `http://127.0.0.1:4178/beans` (identical cameras/lights, without homepage AO).
- Current asset SHA-256:
  `eda367d2b77ccb12f4cf0a33e64057ed3721ef21a4bdc980eca726b0d31450a3`.

### Further bean reduction to 300 triangles — current runtime

- The same `reduce-beans.mjs` now accepts an explicit triangle budget (default
  300). Rebuild from the immutable pre-decimation guide, not the previous 500
  result, to avoid accumulating simplification error. Budget 500 reproduces the
  preceding output hash exactly.
- All four templates now have 300 triangles each: 44 beans render 13,200 triangles,
  down from 22,104 (−40.3% further; −75.8% from the original bean count).
- Scene triangles: 66,680 → 57,776. File bytes: 5,046,580 → 5,025,904. All 44 poses,
  materials, textures, pouch/label/prop accessor bytes and lighting are unchanged.
- Retained normals/UVs are exact records from the guide. Bounds are unchanged;
  no degenerate faces, welded open/non-manifold edges or strict crossings were
  found. Close-up inspection shows more polygonal outlines and small shading
  differences at extreme magnification. The homepage size is the intended use.
- `bean-reduction-300-report.json` distinguishes the high-resolution build guide
  from the preceding runtime comparison; `bean-reduction-300-validation.json`
  records preservation and topology checks. No hardware GPU/FPS benchmark.
- Immutable input, guide, candidate and screenshots: task artifact root's
  `bean-reduction-300/` folder. Viewer: `http://127.0.0.1:4178/beans300`.
- Current asset SHA-256:
  `f892c1180949d88ac19dd0c36077fbfa4a164503dc99ef356e357b85337076b3`.
- Bag-front material/lighting suggestions for the supplied white reference image
  are analysis only; this revision applies no such pouch changes.

### Neutral white product studio — current appearance

- `neutral-white-pouch.py <before.glb> <candidate.glb> <report.json>` adjusts only
  the existing body color image and pouch surface parameters. Original grain
  contrast is reduced to 45%, with a nearly neutral off-white mean around
  RGB (243.2, 243.2, 242.4), versus (238.8, 237.0, 233.8). The body retains subtle
  variation; the modified body image uses JPEG quality 94 without chroma subsampling.
- Body normal strength is 0.10, roughness factor 0.70 (approximately 0.565 after
  its existing map), specular factor 0.75. Label normal strength is reduced to
  0.12 and specular to 0.75; all three base-color artwork images are byte-identical.
  The seal becomes neutral off-white with quieter surface detail. Pouch material
  AO-map strengths decrease to 0.4.
- Runtime studio: neutral-white key 2.1 at (-0.45,0.7,0.85), neutral fill 1.25 at
  (0.6,0.6,0.9), white/warm-neutral hemisphere 1.15. Directions are multiplied by
  the existing scene-radius factor. A more frontal key and opposite fill reduce
  the old deep cross-shadow over the front artwork.
- SSAO retains 16 samples at half resolution, with opacity 0.30, radius 0.06 ×
  model radius and maxDistance 0.006. The same cached 2048 PCF shadow map uses
  radius 6 and normalBias 0.003 × model radius. Floor shadow opacity is 0.24.
- Decorative floating-bean objects no longer cast spots onto the artwork.
  Grounded beans and product objects retain contact/cast shadows.
- Geometry, UVs, vertex normals, transforms, pouch heights, three label designs,
  bean budgets, camera/orbit, DPR 1 and disabled MSAA stay unchanged. There is no
  HDR/environment map, additional light, texture map, postprocessing pass or
  per-frame animation. AO remains the only visual postprocessing effect.
- GLB bytes: 5,025,904 → 4,829,040. The body color image is the only changed image;
  all other image and accessor payload bytes are retained. Surface parameters
  change shading but not source artwork colors.
- `neutral-white-report.json` records material/texture hashes and preservation.
  `neutral-white-validation.json` records serialized-asset and source checks.
  The task artifact root's `white-studio/` folder contains immutable input,
  before/after source snapshots and homepage captures. TypeScript and targeted
  ESLint checks were run. No hardware GPU/FPS benchmark was performed.
- Current asset SHA-256:
  `d71e7716fa8610d406058557f90f4e68c04f84c482db51d157d8ad83b7b36e3a`.

The immutable input and earlier QA captures are saved outside the repository at:

`C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/25/01a17293-342c-7841-958e-5ba8d1e506bd/scene-variation-20261026/`

1. `python scripts/coffee-scene-update/prepare-textures.py <original.glb> <texture-output-directory>`
2. `node scripts/coffee-scene-update/update.mjs <original.glb> <texture-output-directory> <optimized.glb>`
3. `python scripts/coffee-scene-update/realistic-pouch.py <optimized.glb> <laminate.glb>`
4. `python scripts/coffee-scene-update/apply-paper002.py <laminate.glb> <Paper002_1K-JPG-directory> <output.glb>`
5. `python scripts/coffee-scene-update/check-structure.py <original.glb> <paper002.glb>`
6. `python scripts/coffee-scene-update/fix-label-boundary.py <paper002.glb> <output.glb>`
7. `node scripts/coffee-scene-update/check.cjs <output.glb> --final` (localhost:3000 running)

Start each build from the original input. The material pass consumes the fresh
optimized intermediate, not a previous material-pass output. The wrinkle seeds
are deterministic; folds do not change every time the page loads.

The Paper 002 maps were supplied from `C:/Users/Nguyen Viet Duc/Downloads/Paper002_1K-JPG/`.
`paper002-report.json` records source hashes, color adjustment, label preservation,
and front/body material separation. The runtime GLB embeds the processed maps and
does not depend on the Downloads directory.

`final-verification.json` records GLTFLoader reload, all eight views, topology counts
and the three placement angles. `structure-check.json` records geometry/label and
surface closure checks. Those reports predate the static section reset and Paper 002
pass; neither has been browser-tested or rebuilt since, per the user's request.

### Pressed pouch borders and matte laminate — 2026-10-31

- `flatten-pouch.py <before.glb> <candidate.glb> <report.json>` presses the shared
  pouch's side and bottom borders to 3.5% of their original depth. The transition
  retains an inflated center, subtle edge folds and rounded sealed corners.
- Body roughness factor is 0.90, multiplied by the existing roughness texture;
  seal and label factors are 0.95. Metalness remains 0 for the outer laminate,
  specular factor is 0.55, and body/label normal strengths are 0.08/0.10.
  Base-color factors darken the body slightly toward a cool off-white.
- All embedded textures, label artwork, UVs, triangle indices, transforms, beans,
  props, lights and camera framing metadata are preserved. No runtime work is added.
- `flat-pouch-report.json` records preservation and build hashes;
  `flat-pouch-validation.json` records closure, normals and triangle-crossing checks.
  `preview-flat-pouch.cjs` renders front, angled, back, side and full-scene views
  with the homepage lights and AO. Screenshots and the immutable pre-edit GLB are
  in the 2026-10-31 task artifact root's `flat-pouch/` directory. Rebuild from that
  `before.glb`, never from a previously flattened candidate.

### Original shape restored — 2026-10-31

The pressed-border geometry above was reverted at the user's request. All geometry
and vertex normals are byte-identical to `flat-pouch/before.glb`; the updated color
and matte laminate materials remain. `shape-restoration-report.json` records the
restoration checks and current asset hash. The flattening script is a historical
variant, not the current shape.

### Narrow corner seams, retained gussets — 2026-10-31

- `press-pouch-seams.py <before.glb> <candidate.glb> <report.json>` forms narrow
  two-ply flanges where the front/back faces meet the side gussets. Each strip is
  approximately 6.5 mm wide on the large pouch, with approximately 0.4 mm between
  its two layers. It folds back locally at the face edge, retaining the deep side.
- The strip is 30% wider than the first narrow-seam version. The smaller layer
  spacing and shorter root transition make the pressed edge sharper.
- Only five outer face stations and two adjacent side stations per corner are
  reshaped. Central faces, interior W-fold stations, end caps, height and all
  bounding extrema stay unchanged. The seam fades into the original top closure
  and bottom folds. The previous global side/bottom compression is not used.
- The existing matte materials, artwork, UVs, triangles, transforms, scene props,
  camera and lighting are unchanged. All three bags share the adjusted mesh.
- `pouch-seams-report.json` records construction and preservation checks;
  `pouch-seams-validation.json` checks all three bags for closure and crossings.
  Six browser renders include front, angled, back, side, full-scene and seam detail.
  Rebuild from the unpressed input in the task artifact root's `pouch-seams/before.glb`.
  The latest candidate, preceding version and captures are in `pouch-seams-sharper/`.

### Cup removed from the active scene — 2026-10-31

The `Cup_Provided_FBX` branch, including its coffee surface, is detached from
`Product_Display`. The three bags, sharper seams, beans, podium, materials and
stored camera framing are unchanged. Existing cup buffer data remains unused in
the GLB. `cup-removal-report.json` records the active-scene checks and asset hash;
the pre-edit asset, candidate and six render views are in the task artifact root's
`without-cup/` directory. No replacement phin model has been added yet.

### Optimized assembled phin integrated — 2026-10-31

- `optimize-phin.mjs <original.glb> <optimized.glb> <report.json>` welds geometric
  seams, simplifies with locked extrema, rebuilds 35-degree creased normals and
  removes unused UVs. The exploded arrangement is discarded; the assembled
  filter body, lid, plate and original glass remain; the internal press is removed.
  No runtime compression decoder is needed.
- Supplied file: 58,952,604 bytes and 1,007,728 triangles across two arrangements.
  `phin-vietnam-web.glb`: 2,205,332 bytes and 60,560 triangles in one assembled set.
  The retained components preserve their original Euler characteristics and have no
  welded boundary/non-manifold edges. Fine hole outlines are simplified.
- `add-phin.mjs <scene-without-phin.glb> <optimized-phin.glb> <candidate.glb> <report.json>`
  appends the filter and its original glass under `Vietnamese_Phin`, standing on the
  floor at a total height of 13.5 cm. The ceramic cup stays inactive. The internal
  press's 36,076 triangles are physically removed from the new phin payload.
  Combined GLB: 7,035,800 bytes.
  Existing bag/bean geometry, materials, placements and framing remain intact.
- `createPhinEnvironment` builds a small hidden RoomEnvironment PMREM once.
  Only phin materials receive it, at intensity 0.65. The environment
  render target is released on cleanup; bag materials retain their previous lighting.
- The supplied GLB declares minchou19 / CC BY 4.0. Attribution and adaptation notes
  remain in metadata and `public/images/3d/phin-vietnam-LICENSE.txt`.
- `phin-optimization-report.json`, `phin-topology-check.json`,
  `phin-integration-report.json` and `phin-integration-validation.json` record the
  reduction, topology, merge and load/render checks. TypeScript and targeted ESLint
  were checked. No new preview was generated for the final integration.
- Original Downloads file is untouched. Before-integration scene and intermediate
  variants are in the task artifact root's `phin-optimization/` directory. Rebuild
  the merge from `scene-before-phin.glb`, never a scene already containing the phin.
