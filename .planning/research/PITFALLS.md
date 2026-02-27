# Domain Pitfalls: v1.3 Data Expansion + Visual Viewers

**Domain:** Adding 500+ bullet database, community JSON contributions, browser upload UI, caliber-scoped search, 2D SVG technical drawings, and 3D parametric cartridge viewer to existing Next.js 14 + FastAPI ballistics simulator
**Researched:** 2026-02-27
**Confidence:** HIGH (React Three Fiber pitfalls verified against official docs + GitHub issues; SVG and upload patterns verified against community experience; domain-specific pitfalls verified against existing codebase analysis)

---

## Critical Pitfalls

Mistakes that cause rewrites, broken pages, or major degradation of existing functionality.

### Pitfall 1: React Three Fiber SSR Crash on Next.js App Router

**What goes wrong:** Importing `@react-three/fiber` or `@react-three/drei` in a Next.js 14 page component causes a server-side rendering crash. Three.js depends on browser APIs (`window`, `document`, `WebGL`, `requestAnimationFrame`) that do not exist in Node.js. The error is `ReferenceError: window is not defined` or `ReferenceError: document is not defined` during the build or initial server render.
**Why it happens:** Next.js 14 App Router defaults to Server Components. Even with `'use client'` directive, the component still runs through SSR on initial page load. Three.js and React Three Fiber assume a browser environment unconditionally.
**Consequences:** Build failure. If it passes build, the page crashes on first request. The entire application may fail to deploy if the 3D component is imported statically anywhere in the module graph that SSR touches.
**Prevention:**
- Use `next/dynamic` with `ssr: false` for ALL components that import from `@react-three/fiber` or `@react-three/drei`. This is mandatory, not optional.
  ```tsx
  const CartridgeViewer3D = dynamic(
    () => import('@/components/viewers/CartridgeViewer3D'),
    { ssr: false, loading: () => <Spinner /> }
  );
  ```
- Create the 3D viewer as a self-contained component file that is NEVER imported by any Server Component or page-level module directly. Only import through `dynamic()`.
- Do NOT put `import { Canvas } from '@react-three/fiber'` in any file that might be statically analyzed during SSR. Keep all Three.js imports isolated in the dynamically-loaded component tree.
- Add a loading fallback via the `loading` option so users see a placeholder (spinner or static 2D silhouette) while the 3D canvas loads.
**Detection:** Build step fails with `window is not defined`. Or page shows a blank white screen with a console error referencing Three.js internals.

### Pitfall 2: React Three Fiber Bundle Size Bloat (400KB+ gzipped)

**What goes wrong:** Adding `three`, `@react-three/fiber`, and `@react-three/drei` increases the JavaScript bundle by 400-600KB gzipped. For a page that is primarily data tables and charts, this destroys Time to Interactive and First Contentful Paint for ALL pages, not just the 3D viewer page.
**Why it happens:** Three.js is a large library (~150KB gzipped alone). Drei adds more. If these are included in a shared chunk or loaded eagerly, every page load pays the cost even when the user never visits the 3D viewer.
**Consequences:** Dashboard and simulation pages load 2-3x slower. Mobile users on slow connections may see 5-10 second load times. Lighthouse scores drop significantly.
**Prevention:**
- Use `next/dynamic` with `ssr: false` (from Pitfall 1) -- this also enables code splitting. The Three.js chunk only loads when the user navigates to the 3D viewer page.
- Use the `frameloop="demand"` prop on `<Canvas>` so the render loop only runs when the scene changes (user rotates/zooms), not continuously at 60fps. This saves battery and CPU on idle.
- Import ONLY the drei helpers you actually use. Do NOT `import * from '@react-three/drei'`. Instead: `import { OrbitControls, Environment } from '@react-three/drei'`.
- Monitor bundle with `@next/bundle-analyzer` after adding the dependency. Verify that the Three.js chunk is isolated from the main bundle.
- Consider whether `@react-three/drei` is even necessary. For a simple parametric cartridge model (LatheGeometry + a few meshes), vanilla R3F with Three.js primitives may suffice. Drei is a convenience library with significant weight.
**Detection:** Run `npx @next/bundle-analyzer` and check if three.js appears in the shared/common chunk rather than a route-specific chunk.

### Pitfall 3: React Three Fiber Memory Leaks on Page Navigation

**What goes wrong:** When users navigate away from the 3D viewer page (e.g., back to the simulation page), the Three.js WebGLRenderer, textures, and geometries are not properly disposed. Each visit to the 3D viewer page allocates a new WebGL context. After 8-16 visits, the browser hits the WebGL context limit and the canvas goes black or the tab crashes.
**Why it happens:** React Three Fiber's `<Canvas>` component creates a WebGLRenderer. When the component unmounts (page navigation), R3F attempts automatic disposal but has known issues (GitHub issues #514, #2655) where the renderer and WebGL context are not fully released. Next.js App Router aggressively mounts/unmounts page components on navigation.
**Consequences:** Browser tab memory grows by 50-200MB per 3D page visit. After multiple navigations, WebGL context is lost or the tab crashes. Users see a black rectangle instead of the 3D model.
**Prevention:**
- Implement explicit cleanup in a `useEffect` return function or via R3F's `onCreated` callback:
  ```tsx
  <Canvas onCreated={(state) => {
    // Store reference for cleanup
    canvasStateRef.current = state;
  }}>
  ```
  And on unmount: `state.gl.forceContextLoss(); state.gl.dispose();`
- Use R3F's built-in disposal: set `dispose={null}` on objects you want to manage manually, and call `.dispose()` explicitly on geometries and materials.
- Test the memory leak by navigating to and from the 3D page 20 times. Use Chrome DevTools Memory tab to verify heap size returns to baseline.
- Consider keeping the Canvas mounted but hidden (`visible={false}`) instead of unmounting/remounting. This avoids the expensive re-initialization of WebGL context, materials, and geometries. R3F documentation explicitly recommends this pattern: "think twice before you mount/unmount things."
**Detection:** Chrome DevTools > Performance Monitor > JS Heap Size grows monotonically with page navigations. Or `WebGL: CONTEXT_LOST_WEBGL` error in console.

### Pitfall 4: SVG Technical Drawing Renders Blank When Cartridge Dimensions Are NULL

**What goes wrong:** The 2D SVG technical drawing component attempts to render dimension lines for `shoulder_diameter_mm`, `neck_diameter_mm`, `base_diameter_mm`, and `rim_diameter_mm`. But in the current database, these fields are nullable (added as extended fields in v1.2). Many cartridges have NULL values for these dimensions. The SVG component either crashes with a NaN coordinate, renders invisible paths at position 0, or shows a malformed drawing with overlapping labels.
**Why it happens:** The cartridge schema has these as optional fields:
- `shoulder_diameter_mm: float | None`
- `neck_diameter_mm: float | None`
- `base_diameter_mm: float | None`
- `rim_diameter_mm: float | None`
Of the 53 pre-loaded cartridges, the extended dimension coverage depends on data source quality. Cartridges with `data_source='manual'` may lack these entirely.
**Consequences:** The SVG drawing looks broken for most cartridges. Users see partial drawings or NaN-position elements. The feature appears buggy even though the data is simply incomplete.
**Prevention:**
- Design the SVG component to gracefully degrade. Define three rendering tiers:
  1. **Full drawing**: All dimensions present -- render complete cross-section with all dimension lines.
  2. **Basic drawing**: Only core dimensions (`case_length_mm`, `overall_length_mm`, `bore_diameter_mm`, `groove_diameter_mm`, `case_capacity_grains_h2o`) -- render simplified profile with available dimensions.
  3. **Minimal drawing**: Show a text message "Dimensiones insuficientes para el dibujo tecnico" with a link to edit the cartridge.
- Gate the 3D viewer similarly: if critical dimensions are missing, show the 2D basic drawing instead of attempting a malformed 3D model.
- Use the existing `quality_score` system as a proxy: cartridges with `quality_level == 'danger'` (score < 40) likely lack extended dimensions. Show a warning badge next to the drawing tab.
- Pre-check all required dimensions before rendering. Map each drawing tier to a minimum set of non-null fields.
**Detection:** Load the SVG component with a cartridge that has `shoulder_diameter_mm = null`. If the drawing renders without errors, the graceful degradation works.

### Pitfall 5: Bullet Data Unit Confusion -- Grains vs Grams, G1 vs G7

**What goes wrong:** When expanding the bullet database to 500+ entries from manufacturer specs, data entry errors mix up grains and grams for `weight_grains` (1 grain = 0.0648 grams, so a 168gr bullet entered as 168g would be 2593 grains). Similarly, BC values are entered with the wrong drag model (G1 value stored in `bc_g7` field or vice versa), producing wildly inaccurate external ballistics predictions.
**Why it happens:** Different manufacturers present data differently:
- Sierra publishes velocity-dependent G1 BCs (multiple values for different speed ranges) but also provides G7.
- Hornady publishes single G7 BCs prominently, with G1 as secondary.
- Berger publishes G1 and G7 side by side.
- Some European manufacturers (Lapua) use metric weight (grams) while listing BCs.
- The Pydantic schema validates `weight_grains` range as `gt=0, le=1000` -- a 168g entry (= 2593 grains) would be REJECTED by validation, but a 10.9g entry stored as 10.9 grains would PASS (appearing to be a very light bullet).
**Consequences:** Simulation produces physically impossible results. A bullet entered at 10.9 grains instead of 168 grains has 15x less mass, producing absurdly high velocities and low pressures. The solver may diverge or produce negative pressures.
**Prevention:**
- Add validation rules specific to `weight_grains` that cross-reference `diameter_mm`:
  - `.224` caliber: weight typically 40-90 grains. Flag values outside 30-100.
  - `.308` caliber: weight typically 110-230 grains. Flag values outside 80-250.
  - General: if `weight_grains < 20`, almost certainly a gram value entered by mistake. Warn and suggest conversion.
- Add a `weight_unit` field to the import/upload schema (default: grains) with auto-conversion: if unit is "grams", multiply by 15.4324 before storing.
- For BC values: G7 BCs are always lower than G1 for the same bullet (typically G7 ~ 0.5 * G1 for boat-tail bullets). If `bc_g7 > bc_g1`, the values are likely swapped. Add a validation warning.
- During bulk import, compute sectional density from `weight_grains` and `diameter_mm` and cross-check against the provided `sectional_density` value. Discrepancy > 5% indicates a unit error.
- Display the computed sectional density alongside the entered value in the upload preview so users can visually spot errors.
**Detection:** Run a post-import audit query: `SELECT * FROM bullets WHERE weight_grains < 30 AND diameter_mm > 6.0` (impossible: a .243+ caliber bullet cannot weigh less than 30 grains). Also check: `SELECT * FROM bullets WHERE bc_g7 > bc_g1` (G7 should always be lower than G1).

### Pitfall 6: Community JSON Upload Enables Data Poisoning

**What goes wrong:** A user uploads a JSON file containing 500 bullets with subtly wrong data -- burn rate coefficients that are 10% off, BC values inflated by 20%, or incorrect SAAMI max pressures. The data passes schema validation (all values within allowed ranges) but produces dangerously wrong simulation results. Another user trusts this community data and develops loads based on overpressure-safe simulations that are actually 15% over SAAMI.
**Why it happens:** Schema validation only checks physical plausibility ranges (e.g., `bc_g1 > 0 and bc_g1 < 2.0`). It cannot detect that a .308 175gr SMK should have bc_g1 ~= 0.505, not 0.605. The existing `data_source` field would be set to "community" but there is no verification pipeline.
**Consequences:** Safety risk. Users may develop loads that exceed SAAMI maximum pressures based on incorrect community-contributed data. This is the most dangerous pitfall in the entire milestone.
**Prevention:**
- Community-contributed data MUST default to `quality_level = 'danger'` (quality_score < 40) regardless of completeness. The quality score formula should heavily penalize `data_source='community'` (e.g., source tier weight = 10/30 vs 30/30 for manufacturer data).
- Display a prominent red warning banner on any simulation that uses community-sourced components: "Este componente usa datos de la comunidad no verificados. Valide los resultados con datos del fabricante antes de desarrollar cargas."
- Implement a cross-validation check on upload: compare submitted BC and weight values against known bullets with similar `diameter_mm` and `weight_grains`. Flag outliers (> 2 standard deviations from mean for that caliber class).
- Do NOT allow community-uploaded data to overwrite manufacturer or GRT data. The existing `import_bullets` endpoint already protects `data_source='manual'` records -- extend this to protect `data_source='manufacturer'` as well.
- Add a `verified` boolean field (default false). Only admin/verified users can set `verified = true`. Unverified data always shows a red badge.
- Rate-limit uploads: max 100 bullets per upload, max 3 uploads per hour per IP. The existing slowapi rate limiting pattern extends naturally here.
**Detection:** Run periodic anomaly detection: for each caliber family, compute mean and stddev of bc_g1 and weight_grains. Flag records that are > 2 sigma from the mean as `needs_review`.

---

## Moderate Pitfalls

### Pitfall 7: SVG Dimension Text Becomes Unreadable at Different Zoom Levels

**What goes wrong:** SVG dimension labels (e.g., "51.18 mm") are rendered at a fixed font size in the SVG coordinate system. When the SVG is scaled to fit a small container (mobile), the text becomes microscopic. When the SVG is zoomed in for detail, the text becomes comically large and overlaps other elements.
**Why it happens:** SVG text elements scale with the viewBox. Unlike CSS, there is no built-in way to set "fixed screen-size text" in SVG. The viewBox maps the entire coordinate system proportionally.
**Prevention:**
- Use a fixed viewBox (e.g., `viewBox="0 0 1000 400"`) and design all dimensions relative to this coordinate space. Do not use pixel or mm units in the SVG.
- For print quality, ensure the viewBox aspect ratio matches common paper sizes (A4 landscape = ~1.414:1). The SVG will scale to fill the container while preserving aspect ratio with `preserveAspectRatio="xMidYMid meet"`.
- For dimension text readability across zoom levels, consider two approaches:
  1. **Preferred:** Render dimension labels as HTML overlay elements positioned absolutely over the SVG, using CSS font-size (screen-space, not SVG-space). This requires tracking SVG element positions in React state.
  2. **Simpler:** Use a sufficiently large font size in SVG space (e.g., 14px in a 1000-unit viewBox) and accept that it scales. Test at minimum container width (320px mobile) and maximum (1920px desktop).
- For the print tab/export, render a separate high-resolution SVG with larger text optimized for A4 paper (stroke-width and font-size tuned for 300 DPI print).
**Detection:** Render the SVG drawing on a 320px-wide mobile viewport. If any dimension text is smaller than 8px effective screen size, it is unreadable.

### Pitfall 8: SVG Stroke Width Scaling Distorts Engineering Drawings

**What goes wrong:** Engineering drawings have precise stroke widths: dimension lines are thin (0.25mm), object outlines are thick (0.7mm), centerlines are dashed. When the SVG scales responsively, all strokes scale proportionally. On a small screen, thin lines disappear entirely. On a large screen, they look cartoonishly thick.
**Why it happens:** SVG default behavior scales everything with the viewport, including stroke thickness. This is correct for illustrations but wrong for engineering/technical drawings where line weights have semantic meaning.
**Prevention:**
- Use `vector-effect="non-scaling-stroke"` on SVG elements where you want pixel-consistent stroke widths. This CSS property makes strokes render at a fixed screen-pixel width regardless of viewBox scaling.
- Apply this selectively: dimension lines and annotations should use non-scaling strokes, but the cartridge profile outline should scale normally (it represents a physical object).
- Define stroke widths as CSS classes for easy theming:
  ```css
  .dim-line { stroke-width: 1px; vector-effect: non-scaling-stroke; }
  .object-outline { stroke-width: 2; } /* scales with viewBox */
  .centerline { stroke-width: 1px; stroke-dasharray: 8 4; vector-effect: non-scaling-stroke; }
  ```
- Test with Chrome DevTools device emulation at 320px and 1920px widths.
**Detection:** Zoom the browser to 200% and 50%. Dimension lines should remain consistently visible at both zoom levels.

### Pitfall 9: Browser File Upload Blocks UI Thread on Large CSV Files

**What goes wrong:** A user uploads a CSV with 5000 bullet entries. The browser parses the entire file synchronously on the main thread. During parsing (which takes 2-5 seconds for large files), the UI freezes -- no spinner, no progress, no cancel button. The user thinks the app crashed and refreshes, losing progress.
**Why it happens:** `FileReader.readAsText()` is asynchronous for I/O, but the subsequent CSV parsing (`text.split('\n').map(...)`) runs synchronously on the main thread. For files > 1MB, this blocks the event loop.
**Prevention:**
- Use PapaParse with the `worker: true` option. This offloads CSV parsing to a Web Worker, keeping the UI responsive. PapaParse supports streaming parsing for large files.
  ```ts
  Papa.parse(file, {
    worker: true,
    header: true,
    chunk: (results, parser) => {
      // Process chunk, update progress
      setProgress(results.meta.cursor / file.size * 100);
    },
    complete: (results) => setData(results.data),
    error: (err) => setError(err.message),
  });
  ```
- For JSON files, use streaming JSON parsing or at minimum do the validation in chunks. For files under 500KB (typical for 500 bullets), synchronous parsing is acceptable but still show a loading spinner.
- Set a file size limit on the frontend: reject files > 5MB with a clear error message before attempting to parse. 500 bullets in CSV is approximately 50-100KB. A 5MB file likely contains 25,000+ rows which is beyond the scope of this feature.
- Validate the file extension AND the content. A `.csv` file that is actually binary will cause the parser to hang or produce garbage.
**Detection:** Upload a 10,000-row CSV and observe whether the UI remains responsive (spinner animates, cancel button works).

### Pitfall 10: CSV Column Header Mismatch Silently Produces Wrong Data

**What goes wrong:** A user uploads a CSV where the column header is "Weight (g)" (grams) but the import code expects "weight_grains" (grains). The parser maps the values directly without unit conversion. All 500 bullets are imported with weights in grams stored as grains (e.g., 10.9 stored as 10.9 grains instead of the correct 168.2 grains).
**Why it happens:** The upload parser uses header-based column matching. Different data sources use different headers:
- "Weight (gr)" vs "weight_grains" vs "Bullet Weight" vs "Peso (g)"
- "BC G1" vs "bc_g1" vs "G1 BC" vs "Ballistic Coefficient"
- Some sources put the unit in the header, some do not.
**Prevention:**
- Implement a column mapping preview step in the upload UI. After parsing, show the user:
  1. Detected columns from the file.
  2. A dropdown for each field mapping: "Weight (g)" -> [weight_grains / weight_grams / skip].
  3. A preview of the first 5 rows with the mapped values.
  4. Explicit unit selection for weight (grains/grams) and length (mm/inches).
- Do NOT silently guess. Always require explicit user confirmation of column mappings.
- Pre-populate the mappings with fuzzy matching (e.g., "Weight" matches `weight_grains`, "BC" matches `bc_g1`) but let the user override.
- After mapping, show computed sectional density for the first few rows as a sanity check. If SD values look wrong (outside 0.10-0.45 range), highlight them in red.
**Detection:** Upload a CSV with "Weight (g)" header and verify the preview step correctly identifies the unit ambiguity and prompts the user.

### Pitfall 11: LatheGeometry Cartridge Profile Requires Precise Point Ordering

**What goes wrong:** The 3D parametric cartridge model uses Three.js `LatheGeometry` to revolve a 2D cross-section profile around an axis. The profile points must be ordered from bottom to top (or vice versa) with monotonically increasing Y coordinates. If points are out of order, or if the profile crosses itself (e.g., at the shoulder-neck junction where the diameter decreases), the geometry self-intersects, producing visual artifacts: inside-out faces, z-fighting, and holes in the mesh.
**Why it happens:** LatheGeometry takes an array of `Vector2` points and rotates them around the Y axis. The points define a cross-section contour. A cartridge profile is complex: base (wide) -> body (slight taper) -> shoulder (narrow rapidly) -> neck (narrow) -> bullet ogive (widens then narrows to tip). Any error in the point sequence produces a mangled mesh.
**Consequences:** The 3D model looks like a crumpled mess. Faces render inside-out (visible as dark patches). The model may be entirely hollow or have floating geometry fragments.
**Prevention:**
- Build the profile programmatically from cartridge dimensions, not from a manually-defined point array. Create a `buildCartridgeProfile(cartridge, bullet)` function that generates the `Vector2[]` array from database dimensions in guaranteed order:
  ```
  1. Start at centerline (y=0, x=0) -- base center
  2. Move to rim edge (x = rim_diameter_mm / 2)
  3. Move up to base (x = base_diameter_mm / 2)
  4. Move up body with taper to shoulder
  5. Transition shoulder -> neck (x = neck_diameter_mm / 2)
  6. Neck to case mouth (x = neck_diameter_mm / 2)
  7. Bullet base (x = diameter_mm / 2)
  8. Bullet ogive curve (parametric, ~10 points)
  9. Bullet tip (x = 0 or small meplat)
  ```
- For the shoulder transition, use a Bezier or arc interpolation with 8-16 intermediate points to create a smooth curve. Straight lines between shoulder and neck create an unrealistic angular appearance.
- Set `side: THREE.DoubleSide` on the material as a safety net against inside-out faces, but fix the geometry rather than relying on this.
- Add a visual test: render the model for `.308 Win`, `6.5 Creedmoor`, `.223 Rem`, and `.300 Win Mag` (the four validated calibers) and visually verify each one.
**Detection:** Rotate the 3D model 360 degrees. If any dark patches or holes appear, the profile points are in wrong order or the geometry self-intersects.

### Pitfall 12: Caliber-Scoped Search Without Proper Index Degrades Parametric Search Performance

**What goes wrong:** The parametric search endpoint (`POST /simulate/parametric`) currently iterates ALL powders. Adding caliber-scoped search (filter by caliber family) requires efficient querying. Without a proper index on `caliber_family`, adding a WHERE clause to the bullets query causes a sequential scan on 500+ rows, which compounds when the parametric search inner loop also queries bullets per powder.
**Why it happens:** The current `caliber_family` column on bullets has no index. With 127 bullets this was not noticeable. At 500+, each query adds milliseconds that multiply in the parametric search loop.
**Consequences:** Parametric search with caliber filter takes 2-3x longer than without. Users notice the slowdown especially on the powder search page.
**Prevention:**
- Add a B-tree index on `bullets.caliber_family` in the Alembic migration that expands the bullet database:
  ```python
  op.create_index('ix_bullets_caliber_family', 'bullets', ['caliber_family'])
  ```
- Also add a composite index on `bullets(caliber_family, diameter_mm)` for queries that filter by both.
- The existing pg_trgm GIN index on `bullets.name` is for fuzzy search and does NOT help with exact `caliber_family` filtering. These are separate query patterns requiring separate indexes.
- For the parametric search endpoint, pre-filter bullets by caliber family BEFORE entering the powder iteration loop. Do not query bullets inside the loop.
- Consider a materialized view or cached lookup for caliber->bullet mappings if the parametric search becomes a bottleneck.
**Detection:** Run `EXPLAIN ANALYZE SELECT * FROM bullets WHERE caliber_family = '.308'` on the database. If it shows `Seq Scan` instead of `Index Scan`, the index is missing.

---

## Minor Pitfalls

### Pitfall 13: 3D Viewer Continuous Render Loop Drains Battery

**What goes wrong:** The React Three Fiber `<Canvas>` component defaults to a continuous render loop at 60fps (`frameloop="always"`). Even when the user is not interacting with the 3D model, the GPU is rendering 60 frames per second of an unchanged scene. On laptops and mobile devices, this drains battery noticeably.
**Prevention:**
- Set `frameloop="demand"` on the Canvas component. This renders only when `invalidate()` is called.
- OrbitControls from drei automatically calls `invalidate()` when the user rotates/zooms, so interaction still works smoothly.
- Call `invalidate()` when the cartridge data changes (new simulation selected) to trigger a re-render.
- Test on a laptop: with `frameloop="demand"`, GPU usage should drop to near zero when the model is idle.

### Pitfall 14: SVG Export/Print Loses Dark Theme Styling

**What goes wrong:** The existing chart export uses `html2canvas` for PNG export with dark theme styling. The SVG technical drawings, if exported or printed directly, may lose the dark background and render with invisible dark lines on a white print page.
**Prevention:**
- Design the SVG with a separate print stylesheet. Use CSS `@media print` to invert colors: dark lines on white background for print, light lines on dark background for screen.
- For SVG download, offer two variants: "Descargar para pantalla" (dark theme) and "Descargar para impresion" (light theme, A4 optimized).
- The existing `html2canvas` pattern for chart export does not apply to SVG. Use the native SVG serialization: `new XMLSerializer().serializeToString(svgElement)` to create a downloadable `.svg` file.

### Pitfall 15: Community JSON Schema Drift Over Time

**What goes wrong:** The community contribution JSON format is defined once and published. Over time, the backend schema evolves (new fields added, validation rules tightened). Old community JSON files that were valid under v1.3 schema fail to import under v1.4 schema. Contributors are confused by validation errors on files they previously shared successfully.
**Prevention:**
- Include a `schema_version` field in the community JSON format (e.g., `"schema_version": "1.3"`).
- Implement backward-compatible parsing: if `schema_version < current`, apply migrations/defaults for missing fields before validation.
- Publish a JSON Schema (RFC draft-07 or later) alongside the format so contributors can validate their files before uploading.
- Document the format clearly with examples. Include a sample JSON file in the repository.

### Pitfall 16: 3D Model State Desync When Switching Between Tabs

**What goes wrong:** The 2D/3D viewer has 3 tabs (cross-section, chamber, full assembly). If the 3D tab uses a React Three Fiber Canvas and the user switches to a 2D SVG tab and back, the Canvas may re-mount (creating a new WebGL context) or the camera position may reset to default, losing the user's zoom/rotation state.
**Prevention:**
- Keep the Canvas mounted across tab switches. Use CSS `display: none` to hide it instead of conditional rendering (`{activeTab === '3d' && <Canvas>}`). This preserves WebGL context and camera state.
- Store camera position in a ref. If remount is unavoidable, restore camera position from the ref on mount.
- The R3F official documentation explicitly warns against conditional mounting: "Conditionally rendering components causes expensive re-initialization of buffers and materials. Use visibility flags instead."

### Pitfall 17: Bullet Duplicate Detection Inadequate for 500+ Records

**What goes wrong:** The existing bullet import uses `name.lower()` as the dedup key (from `import_bullets` endpoint). With 500+ bullets, name collisions increase: "175gr SMK" could refer to Sierra 175gr MatchKing in .30 caliber or .284 caliber. The import either rejects valid bullets or overwrites the wrong record.
**Prevention:**
- Change the dedup key from `name` alone to `(name, manufacturer, diameter_mm)` triple. This is the natural business key for bullets.
- The existing `UniqueConstraint` on `name` alone (in `Bullet.__tablename__`) should be changed to a composite constraint: `UniqueConstraint("name", "manufacturer", "diameter_mm")`. This requires an Alembic migration.
- In the import preview UI, show potential collisions with their full details (manufacturer, caliber, weight) so users can choose to skip, overwrite, or rename.

### Pitfall 18: 3D Viewer Fails to Create Objects with useMemo

**What goes wrong:** Per the R3F official pitfalls documentation, creating Three.js objects (geometries, materials, vectors) inside render functions without memoization causes garbage collection overhead and performance degradation. Creating a new `LatheGeometry` on every render is especially expensive because it involves computing vertex normals and UVs.
**Prevention:**
- Memoize the LatheGeometry with `useMemo`, keyed on the cartridge dimensions:
  ```tsx
  const geometry = useMemo(() => {
    const points = buildCartridgeProfile(cartridge, bullet);
    return new THREE.LatheGeometry(points, 64);
  }, [cartridge.id, bullet.id]);
  ```
- Memoize materials similarly. Do not create `new THREE.MeshStandardMaterial()` in the render function.
- Never create `new THREE.Vector3()` inside `useFrame`. Reuse vector instances via refs.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|-------------|---------------|----------|------------|
| Bullet data expansion (500+ records) | Unit confusion grains/grams (#5) | CRITICAL | Cross-validation, unit selector in import, SD cross-check |
| Community JSON contribution | Data poisoning (#6) | CRITICAL | Default low quality score, red warning banners, outlier detection |
| Browser upload UI (CSV/JSON) | UI thread blocking (#9) | MODERATE | PapaParse with worker:true, file size limit |
| Browser upload UI (CSV/JSON) | Column mapping errors (#10) | MODERATE | Interactive column mapping preview step |
| 2D SVG technical drawings | NULL dimension crash (#4) | CRITICAL | Graceful degradation tiers, quality score gating |
| 2D SVG technical drawings | Text scaling (#7) | MODERATE | Fixed viewBox, non-scaling-stroke, print stylesheet |
| 2D SVG technical drawings | Stroke width (#8) | MODERATE | vector-effect="non-scaling-stroke" on dimension lines |
| 2D SVG technical drawings | Print export (#14) | MINOR | @media print stylesheet, light/dark variants |
| 3D parametric model (R3F) | SSR crash (#1) | CRITICAL | next/dynamic with ssr:false, isolated component tree |
| 3D parametric model (R3F) | Bundle bloat (#2) | CRITICAL | Code splitting via dynamic import, minimal drei imports |
| 3D parametric model (R3F) | Memory leaks (#3) | CRITICAL | Explicit disposal, hidden-not-unmounted pattern |
| 3D parametric model (R3F) | LatheGeometry artifacts (#11) | MODERATE | Programmatic profile builder, smooth interpolation |
| 3D parametric model (R3F) | Battery drain (#13) | MINOR | frameloop="demand" |
| 3D parametric model (R3F) | Tab switch desync (#16) | MINOR | CSS display:none instead of conditional render |
| 3D parametric model (R3F) | Object creation overhead (#18) | MINOR | useMemo for geometry/materials |
| Caliber-scoped search | Missing index (#12) | MODERATE | B-tree index on caliber_family, pre-filter before loop |
| Bullet dedup at scale | Name-only collision (#17) | MODERATE | Composite unique on (name, manufacturer, diameter_mm) |
| Community JSON format | Schema drift (#15) | MINOR | schema_version field, backward-compat parsing |

## Integration Risks with Existing System

### Risk: 3D Dependencies Conflict with Existing Build

The current `frontend/package.json` has 11 dependencies. Adding `three`, `@react-three/fiber`, and potentially `@react-three/drei` adds 3 large dependencies with deep transitive dependency trees. Verify there are no version conflicts with existing React 18.3.1 and Next.js 14.2.15. R3F v8 requires React >= 18 (satisfied). Three.js has no React dependency conflicts. But drei may pull in additional packages (troika-three-text, etc.) that could conflict.

**Mitigation:** Run `npm install --dry-run three @react-three/fiber @react-three/drei` and check for peer dependency warnings before committing.

### Risk: Upload Endpoint Conflicts with Existing Rate Limiting

The existing rate limiting uses slowapi keyed by IP. Adding a new upload endpoint that accepts multi-MB files needs careful rate limiting: too strict (1/min) prevents legitimate bulk uploads; too loose (unlimited) enables abuse. The existing chrono import endpoint accepts `UploadFile` but is not rate-limited. The new bullet/cartridge upload should follow the same pattern but with explicit limits.

**Mitigation:** Rate-limit upload endpoints at 5/hour per IP (generous for legitimate use, prevents bulk abuse). Separate from simulation rate limits.

### Risk: Quality Score Formula Needs Revision for Community Data

The existing quality score formula weights `data_source` at 30% and field completeness at 70%. Community-contributed data that is fully complete would score 70/100 (yellow badge), which may give false confidence. For safety-critical ballistics data, community data should score lower regardless of completeness until verified.

**Mitigation:** Add a `verified` tier to the quality scoring: community unverified = max 35/100 (red), community verified = max 70/100 (yellow), manufacturer = max 100/100 (green). This requires updating `compute_bullet_quality_score()` in `backend/app/core/quality.py`.

---

## Sources

- [React Three Fiber Performance Pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls) -- Official R3F documentation on common mistakes (HIGH confidence)
- [React Three Fiber Scaling Performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance) -- Official R3F performance optimization guide (HIGH confidence)
- [R3F WebGLRenderer leak on unmount - GitHub #2655](https://github.com/pmndrs/react-three-fiber/issues/2655) -- Memory leak documentation (HIGH confidence)
- [R3F WebGLRenderer leak - GitHub #514](https://github.com/pmndrs/react-three-fiber/issues/514) -- Original memory leak issue (HIGH confidence)
- [react-three-next starter](https://github.com/pmndrs/react-three-next) -- Official R3F + Next.js integration template (HIGH confidence)
- [Three.js LatheGeometry docs](https://threejs.org/docs/#api/en/geometries/LatheGeometry) -- LatheGeometry API and point ordering (HIGH confidence)
- [Papa Parse](https://www.papaparse.com/) -- CSV parser with Web Worker support (HIGH confidence)
- [SVG viewBox explained - Sara Soueidan](https://www.sarasoueidan.com/blog/svg-coordinate-systems/) -- SVG coordinate systems and scaling (HIGH confidence)
- [How to Scale SVG - CSS-Tricks](https://css-tricks.com/scale-svg/) -- SVG responsive scaling patterns (HIGH confidence)
- [PostgreSQL GIN Index Guide - pganalyze](https://pganalyze.com/blog/gin-index) -- GIN index performance characteristics (HIGH confidence)
- [G1 vs G7 Ballistic Coefficients - Kestrel](https://kestrelmeters.com/pages/g1-g7-ballistic-coefficients-what-s-the-difference) -- BC model differences and confusion (HIGH confidence)
- [G1 vs G7 - AccurateShooter](https://bulletin.accurateshooter.com/2013/01/g1-vs-g7-ballistic-coefficients-what-you-need-to-know/) -- Velocity dependence and manufacturer variation (MEDIUM confidence)
- [Engineering Drawing Dimension Lines in SVG - Observable](https://observablehq.com/@shreshthmohan/engineering-drawing-style-dimension-lines-using-the-marke) -- SVG dimension line implementation (MEDIUM confidence)
- [SVG Arrows in React - Productboard](https://www.productboard.com/blog/how-we-implemented-svg-arrows-in-react-the-basics-1-3/) -- React SVG arrow component patterns (MEDIUM confidence)
- [Data Quality in Crowdsourcing - arXiv](https://arxiv.org/abs/2404.17582v2) -- Spammer detection and data quality assessment (MEDIUM confidence)
- Existing codebase analysis of `backend/app/api/bullets.py` import endpoint
- Existing codebase analysis of `backend/app/schemas/cartridge.py` nullable dimension fields
- Existing codebase analysis of `frontend/package.json` current dependency tree
