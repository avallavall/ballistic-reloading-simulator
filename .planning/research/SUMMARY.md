# Project Research Summary

**Project:** Simulador de Balistica de Precision v1.3 — Data Expansion + Visual Viewers
**Domain:** Internal ballistics simulator — bullet database expansion, 2D/3D visualization, community contributions, browser file upload
**Researched:** 2026-02-27
**Confidence:** HIGH

## Executive Summary

v1.3 adds two major capability areas to the existing FastAPI + Next.js ballistics simulator: a visual layer (2D SVG technical drawings and a 3D parametric cartridge viewer) and a data layer (500+ bullet database, community JSON contributions, browser file upload, and caliber-scoped parametric search). The critical architectural insight is that all geometry needed for both 2D and 3D visualization already exists in the Cartridge and Bullet database models — no new backend schema changes are required for rendering. The geometry engine lives entirely in the frontend as a pure TypeScript module that converts database dimensions into SVG path data and Three.js LatheGeometry profiles, with zero API changes and zero new server round-trips for rendering.

The recommended approach is to build features in four sequential-but-overlapping phases: (1) foundation — geometry engine, npm deps, seed data expansion; (2) 2D SVG viewers — three tabs providing immediate visual value with zero new WebGL risk; (3) 3D viewer using React Three Fiber v8 (the only version compatible with the project's React 18.3.1); and (4) upload UI and caliber-scoped search as the data pipeline. Every 3D component must be isolated behind `next/dynamic` with `ssr: false` — this is non-negotiable given Next.js App Router's server-first rendering model. Data contribution features carry a safety risk that must be addressed explicitly: community-uploaded bullet data could produce dangerously incorrect simulation results if not gated with low quality scores and prominent warning banners before user-facing simulation.

The stack additions are minimal and well-matched: React Three Fiber v8.17.10 and @react-three/drei v9.117.0 are the exact versions required for React 18 compatibility (v9/v10 require React 19), Three.js 0.170.0 provides the LatheGeometry primitive ideal for axisymmetric cartridge solids, and PapaParse 5.5.3 handles browser-side CSV parsing with Web Worker support. The entire Three.js bundle (~220KB gzipped) is code-split at the route level via dynamic import, so existing simulation, dashboard, and CRUD pages are completely unaffected in load time. No backend dependencies change for this milestone.

## Key Findings

### Recommended Stack

The existing stack (FastAPI 0.115.6, SQLAlchemy 2.0.36, Next.js 14.2.15, React 18.3.1, TanStack Query 5.59.0, Recharts 2.13.0, Tailwind 3.4.13) requires no changes. v1.3 adds exactly five new npm packages to the frontend and zero backend packages.

**Core technologies (new):**
- `three` ^0.170.0: 3D rendering engine — LatheGeometry is the correct primitive for axisymmetric cartridge solids; parametric from DB dimensions, sub-1ms generation
- `@react-three/fiber` ^8.17.10: React renderer for Three.js — must use v8.x; v9 requires React 19 (project uses 18.3.1); verified via npm registry API
- `@react-three/drei` ^9.117.0: R3F helpers (OrbitControls, Environment, Center) — must use v9.x to match fiber v8; v10.x requires fiber v9 and React 19
- `papaparse` ^5.5.3: Browser-side CSV parsing with Web Worker support — handles edge cases (BOM, embedded delimiters, semicolons for European users) that manual parsing misses; 18KB gzipped
- `@types/three` ^0.170.0 and `@types/papaparse` ^5.3.15: TypeScript types (dev-only)

**Version compatibility is firm:** R3F v8 + drei v9 + React 18 is the only compatible combination for this project. This was verified against the npm registry API for all peer dependency declarations.

**What not to add:** No D3.js (overkill for SVG dimension lines), no react-papaparse (adds opinionated drag-and-drop UI), no react-dropzone (simple file input suffices), no SheetJS (only CSV is needed, not Excel), no new PostgreSQL indexes beyond the existing `ix_bullets_caliber` B-tree (already satisfies caliber-scoped filter queries at current scale).

### Expected Features

**Must have (table stakes):**
- 2D cartridge cross-section with dimension labels — GRT ships this as a core feature; all required fields already exist in the Cartridge model; missing = feature feels broken
- Bullet database with 300+ entries covering popular calibers — at 127 bullets the database has gaps in hunting and mil-spec ammo; 300 is the minimum credibility threshold, 500+ is the v1.3 target
- Caliber-scoped parametric search — current implementation tests H1000 against .223 Rem; caliber-inappropriate powders must be filtered before the simulation loop
- Browser CSV/JSON upload UI — batch import endpoints already exist but have no frontend; a file picker with preview table is expected for any "import" feature
- Dimension labels that read from the actual database record — hardcoded SVG dimensions that diverge from cartridge data destroy user trust immediately
- 3D model with orbit controls — a 3D viewer that cannot rotate is worthless; OrbitControls from drei is a single component

**Should have (differentiators):**
- 3D parametric cartridge model from DB dimensions — no reloading tool offers interactive 3D; uses LatheGeometry with a profile derived from case_length, base_diameter, shoulder_diameter, neck_diameter, OAL, and bullet dimensions; procedurally generated, not a pre-made mesh
- 2D chamber cross-section (Tab 2) showing cartridge seated with headspace gap and freebore — GRT has this in expert mode
- 2D full assembly with harmonics overlay (Tab 3) — connects harmonics analysis to a visual representation; no existing tool does this in a browser
- Community JSON contribution format with schema versioning — lower friction than raw CRUD, enables data growth without authentication infrastructure
- Quality badge differentiating manufacturer/community/estimated data — extends the existing quality_score system

**Defer to v1.4:**
- CSV column mapping UI — strict format for v1.3; column mapping adds meaningful UX complexity; defer
- Interactive dimension editing on 3D model — impressive demo feature but niche utility
- Bullet profile shape in 2D SVG — needs 4-5 additional optional DB fields (bearing_surface_mm, boat_tail_length_mm, meplat_diameter_mm, ogive_type)
- Chamber dimension fields on Rifle model (freebore_mm, throat_angle_deg) — required for precise Tab 2; defaults/estimates from CIP standards suffice for v1.3

**Anti-features explicitly excluded:**
- CAD-quality 3D with thread detail and primer flash hole geometry (massive complexity for zero simulation value)
- Pre-built GLTF/OBJ mesh files per cartridge (defeats parametric approach, requires asset pipeline)
- Scraping manufacturer websites for bullet data (legal risk, brittle)
- Authentication for community contributions (premature; no community exists yet)
- External ballistics trajectory in 3D (different physics domain; handoff to Applied Ballistics tools)
- Wildcat cartridge designer (explicitly out of scope per PROJECT_PLAN.md)

### Architecture Approach

All rendering is computed client-side from CartridgeResponse and BulletResponse data that existing API endpoints already return. A pure TypeScript geometry engine (`lib/cartridge-geometry.ts` and `lib/bullet-geometry.ts`) converts database dimensions to SVG path strings and Three.js Vector2 profiles with zero side effects — testable without React and reusable across both 2D and 3D subsystems. The browser upload flow parses files client-side via PapaParse, validates against known schemas, and POSTs structured JSON to the existing `/api/v1/bullets/import` and `/api/v1/cartridges/import` endpoints — adding zero new backend validation code.

**Major components:**
1. `lib/cartridge-geometry.ts` — pure math module: converts Cartridge dimensions to SVG path data and R3F LatheGeometry Vector2 profile; serves all four viewer components; handles graceful degradation when dimension fields are null with three tiers (full, basic, insufficient-data message)
2. `components/viewers/CartridgeSvg.tsx` / `ChamberSvg.tsx` / `AssemblySvg.tsx` — three SVG tabs rendering from geometry engine output; inline React SVG with `vector-effect="non-scaling-stroke"` on dimension lines; Tab 3 overlays harmonics data from simulation results
3. `components/viewers/CartridgeViewer3D.tsx` — facade with `next/dynamic` + `ssr: false`; inner component creates R3F Canvas with LatheGeometry (64 segments), OrbitControls, and environment lighting; `frameloop="demand"` prevents battery drain; Canvas kept mounted (CSS display:none) across tab switches to avoid WebGL context churn
4. `components/upload/FileDropzone.tsx` + `ImportPreview.tsx` — drag-and-drop file picker with PapaParse CSV parsing (`worker: true` option), validation preview with row-level error highlighting, collision detection, and import mode selection before calling existing import endpoints
5. Caliber-scoped parametric search — backend-only: add `caliber_filter: bool = False` to `ParametricSearchRequest`; filter powders by `burn_rate_relative` range appropriate for bore diameter before the simulation loop; reduces tested powders from 208 to ~30-50 for a 4-7x speedup
6. Bullet seed data (500+ entries) — manual compilation from Sierra, Hornady, Berger, Nosler, Lapua public spec pages; organized as JSON files under `backend/seed/bullets/expanded/`

**Patterns to follow:**
- Pure geometry engine: all coordinate math in `lib/`, components only render
- `next/dynamic` + `ssr: false`: all Three.js imports isolated from SSR module graph
- Existing import pipeline reuse: client-side parsing produces the same JSON shape the existing endpoints consume; zero new backend validation code
- Graceful degradation: three rendering tiers based on dimension completeness; quality badge signals which tier applies

**Anti-patterns to avoid:**
- Server-side SVG generation (couples rendering to API latency, prevents interactivity)
- Loading GLTF/OBJ model files (not parametric, requires asset pipeline, 53+ files to maintain)
- New backend endpoints for rendering data (existing CartridgeResponse has all geometry data needed)
- Separate upload endpoint from existing import endpoint (duplicates validation, collision handling, and quality scoring)

### Critical Pitfalls

1. **R3F SSR crash on Next.js App Router** — Three.js requires `window`, `document`, and WebGL APIs that crash Node.js during server-side rendering. Error: `ReferenceError: window is not defined` at build or first request. Use `next/dynamic` with `ssr: false` for ALL components that import from `@react-three/fiber` or `@react-three/drei`. This is mandatory. Keep all Three.js imports isolated inside the dynamically-loaded component tree so static analysis during SSR never touches them. Also add `transpilePackages: ['three']` to next.config.js.

2. **Community data poisoning** — A user can upload bullet JSON with subtly wrong BC or weight values that pass schema validation (values within physical plausibility ranges) but produce dangerously incorrect simulation results. A .308 175gr SMK with bc_g1=0.605 instead of 0.505 would appear valid but give systematically wrong external ballistics. Community data must default to `quality_level = 'danger'` (score <= 35/100) regardless of field completeness, and every simulation using community-sourced components must show a prominent red warning banner. Never allow community uploads to overwrite manufacturer data.

3. **SVG rendering crashes on NULL dimensions** — Many existing cartridges have `shoulder_diameter_mm`, `neck_diameter_mm`, `base_diameter_mm`, and `rim_diameter_mm` as NULL (all nullable fields). Attempting to render dimension lines at NaN coordinates produces invisible or overlapping SVG elements. Implement three degradation tiers in the geometry engine: full drawing (all dims present), basic drawing (only core dims: case_length, overall_length, bore_diameter), and a message "Dimensiones insuficientes para el dibujo tecnico" with an edit link for the third tier.

4. **R3F memory leak on page navigation** — The WebGLRenderer and WebGL context are not fully released on Canvas unmount due to known R3F issues (GitHub #514, #2655). After 8-16 page visits the browser hits the WebGL context limit; the tab crashes or the canvas goes black. Use CSS `display: none` to hide the Canvas across tab switches instead of conditional rendering; explicitly call `gl.forceContextLoss(); gl.dispose()` on full page unmount. Test with 20 navigations before considering the implementation complete.

5. **Three.js bundle bloat across all pages** — Adding Three.js without code splitting adds 400-600KB gzipped to every page's load time. The `next/dynamic` + `ssr: false` pattern (required for pitfall 1) also provides route-level code splitting. Verify with `@next/bundle-analyzer` that the Three.js chunk does NOT appear in the shared/common bundle. Also use `frameloop="demand"` on Canvas and import only specific drei helpers (no `import * from '@react-three/drei'`).

## Implications for Roadmap

The dependency graph from the research dictates the following four-phase structure. The geometry engine is the critical path dependency for both 2D and 3D work. Upload and caliber-scoped search are independent of visualization and can run in parallel with later phases. Data expansion must precede caliber-scoped search to make the filtering valuable.

### Phase 1: Foundation and Data Expansion

**Rationale:** All downstream work depends on this. The geometry engine must exist before any viewer component is written — both 2D and 3D depend on it. npm dependencies must be installed before any Three.js or PapaParse code can run. The expanded bullet database must exist before caliber-scoped search is meaningful. The community JSON schema must be defined before building the upload UI.
**Delivers:** 500+ bullets in the database organized as JSON seed files by manufacturer, geometry engine library (`lib/cartridge-geometry.ts`, `lib/bullet-geometry.ts`) with full test coverage, all new npm packages installed and verified, `next.config.js` updated with `transpilePackages: ['three']`, community JSON schema definition with `schema_version` field
**Addresses:** Bullet database 300+ (table stakes), caliber-scoped search prerequisite data, community JSON format (differentiator)
**Avoids:** Unit confusion grains/grams pitfall — compile data with explicit unit validation and sectional density cross-check; define the JSON contribution schema before building the UI so the format is stable when the upload UI ships

### Phase 2: 2D SVG Technical Drawings

**Rationale:** SVG is simpler than 3D, validates the geometry engine against real cartridge data with immediate visual feedback, and provides meaningful user value with zero new WebGL risk. Building SVG first catches geometry engine errors cheaply: a bad shoulder angle in 2D directly predicts LatheGeometry artifacts in 3D. SVG also has no SSR or memory leak risk.
**Delivers:** Three-tab viewer page (`/viewers`): Tab 1 cross-section with labeled dimensions, Tab 2 cartridge-in-chamber with headspace/freebore, Tab 3 full assembly with harmonics overlay; sidebar navigation link; PNG export via existing `XMLSerializer` pattern; three degradation tiers for incomplete data
**Addresses:** 2D cartridge cross-section (table stakes), dimension accuracy from DB (table stakes), 2D chamber cross-section (differentiator), harmonics visualization in assembly view (differentiator)
**Avoids:** NULL dimension crash — three degradation tiers implemented in geometry engine from Phase 1; SVG text scaling — fixed viewBox coordinate system; SVG stroke scaling — `vector-effect="non-scaling-stroke"` on all dimension annotation lines

### Phase 3: 3D Parametric Cartridge Viewer

**Rationale:** Depends on the geometry engine (Phase 1) and benefits from validation of profile point ordering against the already-visible 2D cross-section (Phase 2). The 3D viewer adds the highest visual impact and the most technical risk. Placing it third means users have a working 2D viewer as fallback if 3D issues arise during integration.
**Delivers:** Interactive 3D cartridge model as Tab 4 on the viewer page; orbit controls (rotate/zoom/pan); cutaway half-section mode; environment lighting; `frameloop="demand"` for battery efficiency; Canvas mounted-but-hidden for tab switches; explicit WebGL disposal on page unmount; bundle size verified with `@next/bundle-analyzer`
**Addresses:** 3D parametric model (differentiator), orbit controls (table stakes for any 3D viewer)
**Avoids:** SSR crash — `next/dynamic` + `ssr: false` from the first commit of 3D code; memory leak — hidden-not-unmounted pattern across tabs, explicit `gl.forceContextLoss()` on page unmount tested with 20 navigations; bundle bloat — code splitting verified, Three.js chunk isolated from shared bundle; battery drain — `frameloop="demand"` on Canvas; LatheGeometry artifacts — programmatic profile builder with monotonically-increasing Y coordinates, smooth Bezier interpolation at shoulder-neck junction

### Phase 4: Browser Upload and Caliber-Scoped Search

**Rationale:** Upload and caliber-scoped search are independent of visualization work and of each other. Upload directly enables the community contribution workflow. Caliber-scoped search becomes valuable after Phase 1 delivers the 500+ bullet database. Both features have lower technical risk than the 3D viewer.
**Delivers:** File upload page (`/import`) with drag-and-drop zone, PapaParse CSV parsing with `worker: true`, strict-format preview table with row-level validation and collision detection, import mode selection (skip/overwrite), import results summary; caliber-scoped filter on the existing parametric search endpoint (`caliber_filter: bool = False` field, backward-compatible); updated sidebar with "Importar Datos" link; updated dedup key to composite `(name, manufacturer, diameter_mm)` via Alembic migration before bulk bullet import; quality score formula updated for community data (unverified community = max 35/100)
**Addresses:** Browser CSV/JSON upload UI (table stakes), community JSON contribution format (differentiator), quality badge for contributed data (differentiator), caliber-scoped parametric search (table stakes)
**Avoids:** Data poisoning — community data defaults to danger quality score, prominent red warning banner on all simulations using community components; UI thread blocking — PapaParse `worker: true`; file size abuse — reject files > 5MB before parsing; upload rate limiting — 5 uploads per hour per IP via existing slowapi pattern; column mapping errors — strict format for v1.3, column mapper deferred to v1.4; bullet duplicate collision at scale — composite unique constraint migration before importing 500+ records

### Phase Ordering Rationale

- Phase 1 first because the geometry engine is a shared dependency of Phases 2 and 3, and data expansion is a prerequisite for caliber-scoped search to provide value
- Phase 2 before Phase 3 because SVG validates the geometry engine cheaply before 3D adds WebGL complexity; errors in profile point ordering visible in 2D predict LatheGeometry geometry issues before they become harder to debug
- Phase 3 after 2D because the 3D viewer carries the most SSR and memory leak risk; having a working 2D viewer means users have value even if 3D integration encounters issues
- Phase 4 in parallel with Phases 2 and 3 where resources allow — upload and caliber search have no dependency on the visualization work

### Research Flags

Phases requiring careful attention during implementation:

- **Phase 3 (3D Viewer):** Highest technical risk. Implement a standalone proof-of-concept Canvas component in isolation first, verify with bundle analyzer that Three.js is code-split correctly, then integrate into the viewer page. Test memory with 20 page navigations before merging. Do not proceed to integration until the isolated PoC works correctly.
- **Phase 4 (Community Data):** The data poisoning risk is the most critical safety concern in the milestone. The quality score formula revision (`compute_bullet_quality_score()` in `backend/app/core/quality.py`) and the simulation warning banner need explicit review before the upload feature goes live. Verify the formula change does not alter existing quality scores for the 208 powders and 127 bullets.

Phases with standard, well-documented patterns (lower risk):

- **Phase 1 (Foundation):** JSON seed data import is an established pattern in this codebase. The geometry engine is pure math with no framework dependencies — testable with simple unit tests. npm installation with explicit version pinning is deterministic.
- **Phase 2 (2D SVG):** Inline React SVG is well-documented. The geometry engine handles all coordinate math; the SVG components only render. Graceful degradation tiers are straightforward conditional rendering using React's existing patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Version compatibility verified via npm registry API. R3F v8.17.10 peer deps confirmed: react>=18.0, three>=0.133. Drei v9.117.0 peer deps confirmed: @react-three/fiber>=8.0, react>=18.0. No backend changes needed — verified against existing codebase. |
| Features | HIGH | Table stakes derived from GRT competitive analysis (docs/grtools_analysis.md) and SAAMI/CIP documentation. Differentiators have clear implementation paths using existing model fields. Deferred items have explicit dependency reasons (missing DB fields, UX complexity). |
| Architecture | HIGH | Geometry engine pattern is standard pure function approach. Dynamic import SSR pattern is documented in official Next.js and R3F documentation. Existing import pipeline reuse verified by reading existing endpoint code (bullets.py, cartridges.py). LatheGeometry for revolution bodies is mathematically correct and documented in Three.js official docs. |
| Pitfalls | HIGH | R3F SSR crash and memory leak pitfalls verified against official R3F docs and open GitHub issues (#514, #2655). SVG scaling pitfalls verified against MDN vector-effect documentation and CSS-Tricks. Data poisoning risk derived from analysis of existing quality score system and Pydantic validation ranges. LatheGeometry point ordering verified from Three.js documentation. |

**Overall confidence:** HIGH

### Gaps to Address

- **Shoulder angle estimation:** The geometry engine needs fallback logic for `shoulder_angle_deg` (nullable, not yet in Cartridge model). Research suggests estimating from the shoulder/neck diameter ratio, but the exact formula needs empirical validation against known cartridges (.308 Win, 6.5 Creedmoor, .223 Rem) to verify visual accuracy before shipping the 2D viewer.
- **Bullet length estimation for 3D:** Many bullets have `length_mm = null`. The 3D model requires a length for the ogive section. The geometry engine must estimate from weight and density, but the estimation formula needs calibration against the 127 existing bullets before expanding to 500+. Verify the 3D model produces visually reasonable results for the known bullets first.
- **Quality score formula for community data:** The research recommends community unverified = max 35/100. The exact formula change to `compute_bullet_quality_score()` must be specified without breaking existing quality scores for the 208 powders and 127 bullets currently in the database. Run the formula against all existing records before and after the change to confirm no regressions.
- **Caliber-scoped filter thresholds:** The bore diameter cutoffs (< 6.5mm, > 8mm) and burn rate range heuristics are approximations. Validate against the existing 22 powders and seed calibers (.308 Win, .223 Rem, 6.5 Creedmoor, .300 Win Mag) before applying to the full database. Adjust thresholds if known-correct powders are filtered out.
- **Bullet dedup key migration:** Changing the unique constraint from `name` alone to `(name, manufacturer, diameter_mm)` requires an Alembic migration. Verify the existing 127 bullets have no conflicts under the new composite key before running the migration. A pre-migration audit query will surface any issues.

## Sources

### Primary (HIGH confidence)
- [@react-three/fiber npm registry](https://www.npmjs.com/package/@react-three/fiber) — v8.17.10 peer deps: react>=18.0, three>=0.133; v9.x requires React 19
- [@react-three/drei npm registry](https://www.npmjs.com/package/@react-three/drei) — v9.117.0 peer deps: react>=18.0, @react-three/fiber>=8.0; v10.x requires fiber v9
- [React Three Fiber performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls) — SSR crash, memory leaks, object creation in render
- [React Three Fiber scaling](https://r3f.docs.pmnd.rs/advanced/scaling-performance) — frameloop="demand", disposal, hidden vs unmounted pattern
- [R3F GitHub issue #2655](https://github.com/pmndrs/react-three-fiber/issues/2655) — WebGLRenderer leak on unmount
- [R3F GitHub issue #514](https://github.com/pmndrs/react-three-fiber/issues/514) — original memory leak documentation
- [Three.js LatheGeometry docs](https://threejs.org/docs/#api/en/geometries/LatheGeometry) — point ordering, phiLength for cutaway
- [Next.js dynamic import](https://nextjs.org/docs/pages/building-your-application/optimizing/lazy-loading) — ssr:false pattern for browser-only components
- [PapaParse documentation](https://www.papaparse.com/) — Web Worker support (`worker: true`), streaming parsing, auto-delimiter detection
- [SAAMI Cartridge & Chamber Drawings](https://saami.org/technical-information/cartridge-chamber-drawings/) — official dimension specifications
- Existing codebase — `backend/app/api/bullets.py`, `backend/app/schemas/cartridge.py`, `backend/app/core/quality.py`, `frontend/package.json` — primary source for integration points

### Secondary (MEDIUM confidence)
- [SVG viewBox — Sara Soueidan](https://www.sarasoueidan.com/blog/svg-coordinate-systems/) — coordinate systems and responsive scaling
- [How to Scale SVG — CSS-Tricks](https://css-tricks.com/scale-svg/) — `vector-effect="non-scaling-stroke"` for engineering drawings
- [GRT Community calibration workflow](https://forum.accurateshooter.com/threads/gathering-data-for-powder-model-development-gordons-reloading-tool.4072119/) — how GRT crowdsources powder data; 35,000 registered users
- [Berger Quick Reference Sheets](https://bergerbullets.com/pdf/Quick-Reference-Sheets.pdf) — bullet dimensions including OAL, base-to-ogive, BC G1/G7
- [G1 vs G7 BCs — Kestrel](https://kestrelmeters.com/pages/g1-g7-ballistic-coefficients-what-s-the-difference) — G7 always lower than G1 for boat-tail bullets; diagnostic for swapped values
- [docs/grtools_analysis.md](../../docs/grtools_analysis.md) — competitive feature analysis and roadmap priorities
- [CIP TDCC Tables](https://www.cip-bobp.org/en/tdcc) — European cartridge dimension standards

### Tertiary (LOW confidence)
- [Data Quality in Crowdsourcing — arXiv](https://arxiv.org/abs/2404.17582v2) — spammer detection and anomaly-based quality assessment patterns (academic, not domain-specific)
- Caliber burn-rate range table in FEATURES.md — heuristic derived from common reloading practice; needs empirical validation against known loads before production use

---
*Research completed: 2026-02-27*
*Ready for roadmap: yes*
