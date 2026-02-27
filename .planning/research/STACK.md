# Technology Stack: v1.3 Data Expansion + Visual Viewers

**Project:** Simulador de Balistica de Precision v1.3
**Researched:** 2026-02-27

## Recommended Stack

v1.3 introduces 3 new frontend dependencies for 3D rendering and 1 for CSV parsing. The backend requires no new dependencies. This is the first milestone that adds significant new npm packages since v1.0.

### Existing Core (Unchanged)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| FastAPI | 0.115.6 | REST API | Unchanged |
| SQLAlchemy | 2.0.36 (async) | ORM | Unchanged |
| asyncpg | 0.30.0 | PostgreSQL driver | Unchanged |
| PostgreSQL | 16 | Database | Unchanged -- existing indexes sufficient |
| Alembic | 1.14.1 | Migrations | Unchanged -- no schema changes needed |
| Pydantic | 2.10.4 | Validation | Unchanged |
| Next.js | 14.2.15 | React framework | Unchanged |
| React | 18.3.1 | UI library | Unchanged -- constrains R3F to v8.x |
| TanStack Query | 5.59.0 | Data fetching | Unchanged |
| Recharts | 2.13.0 | Charts | Unchanged |
| Tailwind CSS | 3.4.13 | Styling | Unchanged |
| Lucide React | 0.447.0 | Icons | Unchanged |

### New Frontend Dependencies

| Library | Version | Purpose | Why This Version |
|---------|---------|---------|------------------|
| `three` | ^0.170.0 | Three.js 3D engine | Required peer dep for R3F. v0.170 is stable, well within R3F v8's `>=0.133` requirement. Avoids bleeding-edge v0.183 which may have breaking changes with R3F v8. |
| `@react-three/fiber` | ^8.17.10 | React renderer for Three.js | **Must use v8.x for React 18.** v9.x requires React >=19 which we do not use. v8.17.10 is the latest v8 release, peer deps: `react>=18.0`, `three>=0.133`. |
| `@react-three/drei` | ^9.117.0 | R3F helper components (OrbitControls, etc.) | **Must use v9.x for R3F v8.** v10.x requires `@react-three/fiber>=9` and `react>=19`. v9.117.0 is the latest v9 release, peer deps: `react>=18.0`, `@react-three/fiber>=8.0`. |
| `papaparse` | ^5.5.3 | CSV parsing in browser | Fastest in-browser CSV parser. Web Worker support for large files. Auto-delimiter detection. Handles malformed input gracefully. Our chrono import already does server-side CSV parsing with Python's `csv` module, but the upload UI needs client-side preview/validation before sending to the batch import endpoint. |
| `@types/three` | ^0.170.0 | TypeScript types for Three.js | Match the `three` version for correct type definitions. |
| `@types/papaparse` | ^5.3.15 | TypeScript types for PapaParse | Last published types version, compatible with PapaParse 5.x. |

### No New Backend Dependencies

The backend already has everything needed:
- **python-multipart** (0.0.20) -- already installed for file upload (used by chrono import and GRT powder import)
- **Python stdlib `csv`** -- already used in chrono.py for CSV parsing
- **Python stdlib `json`** -- already used for fixture loading and batch import payloads
- **FastAPI `UploadFile`** -- already used in chrono.py and powders.py batch import

The browser upload UI will parse CSV/JSON client-side (PapaParse + native JSON.parse), then POST structured JSON to the existing `/api/v1/bullets/import` and `/api/v1/cartridges/import` batch endpoints. No new server-side file handling needed.

### No New Database Changes

Caliber-scoped parametric search optimization does NOT require new indexes or schema changes:
- `ix_bullets_caliber` B-tree index on `bullets.caliber_family` already exists (migration 006)
- The parametric search endpoint currently queries `SELECT * FROM powders` (all powders). Caliber scoping means filtering the bullet/cartridge selection in the UI, not changing the powder query. The existing indexes handle this efficiently at 500-1000 records.

## Integration Architecture

### 3D Viewer: React Three Fiber + Next.js 14

**Critical pattern:** Three.js accesses `window`, `document`, and WebGL APIs that do not exist during server-side rendering. In Next.js 14's App Router, all components are Server Components by default. The Canvas component MUST be loaded client-side only.

**Required pattern:**
```typescript
// components/viewers/CartridgeViewer3D.tsx
'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

// ... component code
```

**Page integration:**
```typescript
// app/cartridges/[id]/page.tsx (or wherever the viewer lives)
import dynamic from 'next/dynamic';

const CartridgeViewer3D = dynamic(
  () => import('@/components/viewers/CartridgeViewer3D'),
  { ssr: false, loading: () => <div>Cargando modelo 3D...</div> }
);
```

The `dynamic()` + `{ ssr: false }` pattern prevents Next.js from attempting to render the Canvas on the server. The `'use client'` directive is also needed on the component file because it uses React hooks (useFrame, useThree from R3F).

### 3D Geometry: LatheGeometry for Cartridge Profile

Cartridge cases and bullets are **rotationally symmetric** (axisymmetric solids). Three.js `LatheGeometry` is the exact primitive for this -- it takes a 2D profile (array of `Vector2` points) and revolves it around the Y-axis to create a 3D solid.

**Available cartridge dimensions from the database (Cartridge model):**
- `case_length_mm` -- overall case length
- `base_diameter_mm` -- diameter at the base
- `shoulder_diameter_mm` -- diameter at the shoulder
- `neck_diameter_mm` -- diameter at the neck
- `rim_diameter_mm` -- rim diameter
- `overall_length_mm` -- cartridge OAL (case + bullet)
- `bore_diameter_mm` / `groove_diameter_mm` -- bore dimensions

**Available bullet dimensions (Bullet model):**
- `diameter_mm` -- bullet diameter
- `length_mm` -- bullet length (nullable -- may need estimation)

These dimensions are sufficient to construct a parametric cross-section profile with 8-12 control points (rim, base, body, shoulder, neck, bullet base, ogive, tip) and revolve it into a 3D mesh.

**Key drei helpers to use:**
- `OrbitControls` -- rotate/zoom/pan the model
- `Environment` -- realistic lighting without manual light setup
- `Center` -- auto-center the mesh in the viewport
- `MeshDistortMaterial` or standard `meshStandardMaterial` -- surface rendering

### 2D SVG Technical Drawings: Pure Inline SVG (No Library)

**Recommendation: Do NOT add an SVG library.** Use React's native JSX SVG support.

React renders `<svg>`, `<line>`, `<path>`, `<text>`, `<g>` elements directly in JSX. Technical drawings with dimension lines, hatching, and annotations are straightforward with inline SVG -- they are just calculated coordinates and paths.

**Why no library:**
- SVG engineering drawings are mostly straight lines, arcs, and text labels
- The viewBox coordinate system maps directly to mm dimensions
- No complex path generation (unlike D3 charts)
- React's declarative SVG is more maintainable than imperative canvas
- Zero bundle size cost
- Full TypeScript support via React's built-in SVG types

**Implementation approach:**
```typescript
// viewBox in mm coordinates, matching the physical cartridge dimensions
<svg viewBox="0 0 120 50" className="w-full h-auto">
  <g transform="translate(10, 25)">
    {/* Cartridge profile path */}
    <path d={profilePath} fill="none" stroke="white" strokeWidth="0.3" />
    {/* Dimension lines */}
    <DimensionLine from={[0, 15]} to={[45, 15]} label="45.0mm" />
    {/* Hatching for cross-section */}
    <pattern id="hatch" ...>...</pattern>
  </g>
</svg>
```

The 3 tabs (cross-section, chamber, full assembly with harmonics) share the same dimension calculation utilities but render different views. Cross-section adds hatching patterns. Chamber adds the chamber outline around the cartridge. Full assembly adds the barrel representation and harmonic node markers from the simulation result.

### CSV/JSON Upload: Client-Side Parsing + Existing Batch Endpoints

**Upload flow:**
1. User selects file (CSV or JSON) via `<input type="file">`
2. Frontend reads file with `FileReader` API
3. If CSV: PapaParse parses to array of objects with header detection
4. If JSON: native `JSON.parse()` -- no library needed
5. Frontend shows preview table with validation feedback
6. On confirm: POST structured JSON to existing `/api/v1/bullets/import` or `/api/v1/cartridges/import`
7. Import result (created/updated/skipped/errors) displayed

**Why PapaParse instead of manual CSV parsing:**
- Handles edge cases: quoted fields, embedded commas, newlines in values, BOM markers
- Auto-detects delimiters (comma, semicolon, tab -- important for European users who use semicolons)
- Web Worker support if files are large (500+ bullet spreadsheets)
- Header row detection and dynamic typing
- 18KB gzipped -- minimal size for robust parsing

**Why NOT react-papaparse:**
- react-papaparse is a React wrapper that adds drag-and-drop UI components
- We already have our own UI patterns (dark theme, Tailwind) and do not want opinionated UI from a wrapper
- Using raw `papaparse` gives us the parser without the UI opinions
- Smaller dependency footprint

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| 3D rendering | React Three Fiber v8 | Raw Three.js | R3F provides declarative JSX syntax that matches our React patterns. Raw Three.js requires imperative scene management, manual cleanup on unmount, and duplicates what R3F solves. |
| 3D rendering | React Three Fiber v8 | Babylon.js | Babylon is a full game engine (2MB+). We need a parametric cartridge model, not a game. Three.js is smaller and R3F's ecosystem (drei) provides ready-made controls. |
| 3D rendering | R3F v8 + drei v9 | R3F v9 + drei v10 | v9/v10 require React 19. Our project uses React 18. Upgrading React would cascade to Next.js, TanStack Query, and other deps. Not worth the risk for one feature. |
| 3D geometry | LatheGeometry | Load GLTF/OBJ models | Pre-made models cannot be parametric. Every cartridge has different dimensions. LatheGeometry generates meshes from dimensional data at runtime -- exactly what we need. |
| 3D geometry | LatheGeometry | ExtrudeGeometry + Shape | ExtrudeGeometry is for 2D shapes extruded linearly. Cartridges are revolved profiles, not extrusions. LatheGeometry is the geometrically correct primitive. |
| 2D drawings | Inline SVG (no library) | D3.js | D3 is 80KB+ and designed for data visualization (charts, maps, force graphs). Technical drawings with fixed geometry are simpler than D3's domain. Adding D3 for dimension lines is massive overkill. |
| 2D drawings | Inline SVG | Konva / react-konva | Canvas-based, not SVG. Loses resolution independence, cannot be exported as SVG, harder to style with CSS. SVG technical drawings are the industry standard for engineering drawings. |
| 2D drawings | Inline SVG | svg.js or Snap.svg | Imperative SVG manipulation libraries designed for pre-React era. React's JSX SVG support is declarative and more idiomatic. Adding a library adds complexity with zero benefit. |
| CSV parsing | PapaParse | Manual parsing (split/regex) | CSV has many edge cases (quoted fields, embedded delimiters, encoding). Our chrono import already has a fragile manual parser. PapaParse handles all edge cases for 18KB. |
| CSV parsing | PapaParse | SheetJS (xlsx) | SheetJS supports Excel files which we do not need. 200KB+ library. PapaParse is focused on CSV/TSV which matches our use case. |
| CSV parsing | PapaParse (client-side) | Server-side only (existing pattern) | The upload UI needs instant preview/validation before sending to server. Round-tripping to the server for preview adds latency and complexity. Parse locally, validate locally, then batch import. |
| Caliber search | Existing B-tree index | Composite index (caliber_family, quality_score) | At 500-1000 bullets, PostgreSQL optimizes simple B-tree lookups in microseconds. A composite index saves nothing measurable but adds maintenance. |
| Caliber search | Existing pg_trgm + B-tree | Materialized view per caliber | Over-engineering. The query is `WHERE caliber_family = '.308'` with an existing index. A materialized view adds stale-data risks and refresh complexity for zero performance gain at this scale. |

## Installation

```bash
# Frontend -- new packages for v1.3
cd frontend
npm install three@^0.170.0 @react-three/fiber@^8.17.10 @react-three/drei@^9.117.0 papaparse@^5.5.3
npm install -D @types/three@^0.170.0 @types/papaparse@^5.3.15

# Backend -- no new packages
# (requirements.txt unchanged)
```

**Expected bundle size impact:**
- `three` -- ~150KB gzipped (tree-shakeable, only LatheGeometry/MeshStandardMaterial/etc. imported)
- `@react-three/fiber` -- ~40KB gzipped
- `@react-three/drei` -- tree-shakeable, OrbitControls/Center/Environment ~15KB
- `papaparse` -- ~18KB gzipped
- **Total new JS: ~220KB gzipped** (loaded only on pages with 3D viewer or upload UI, via code splitting)

Next.js 14 code-splits by route. The Three.js bundle only loads when the user navigates to a page with the 3D viewer. The upload page loads PapaParse only when visited. Dashboard, simulation, ladder test, and CRUD pages are unaffected.

## Version Compatibility Matrix

| Package | Version | React Req | Three.js Req | Notes |
|---------|---------|-----------|--------------|-------|
| `@react-three/fiber` | 8.17.10 | >=18.0 | >=0.133 | Last v8 release. Verified via npm registry. |
| `@react-three/drei` | 9.117.0 | >=18.0 | >=0.137 | Last v9 release. Verified via npm registry. Peer dep: `@react-three/fiber>=8.0`. |
| `three` | 0.170.0 | n/a | n/a | Stable release. Well within both R3F and drei requirements. |
| `papaparse` | 5.5.3 | n/a | n/a | No framework dependency. Works in any JS environment. |
| React | 18.3.1 | -- | -- | Existing. Satisfies all peer deps. |
| Next.js | 14.2.15 | 18.x | -- | Existing. `dynamic()` + `ssr: false` handles R3F. |

**Confidence:** HIGH. Version requirements verified via npm registry API (`registry.npmjs.org`). R3F v8.17.10 peerDependencies confirmed: `react>=18.0`, `three>=0.133`, `react-dom>=18.0`. Drei v9.117.0 peerDependencies confirmed: `react>=18.0`, `@react-three/fiber>=8.0`, `three>=0.137`.

## What NOT to Add

These were considered and explicitly rejected:

| Library | Reason Not Needed |
|---------|-------------------|
| `react-papaparse` | Wrapper adds opinionated drag-and-drop UI. We use raw `papaparse` + our own UI. |
| `@react-three/postprocessing` | No post-processing effects needed for a technical cartridge viewer. |
| `leva` (GUI controls) | Debug panel library. Our UI already has form controls for dimensional parameters. |
| `react-dropzone` | Our upload UI is a simple file input + preview table. Dropzone adds 10KB for a feature we can build with `<input type="file" accept=".csv,.json">` and an `onDrop` handler. |
| `zustand` | R3F v8 depends on zustand internally but we do not need it for our own state. TanStack Query handles server state; React useState handles local state. |
| `D3.js` | Overkill for SVG dimension lines. Recharts already handles chart rendering. |
| `svg.js` / `Snap.svg` | Pre-React imperative SVG libraries. React JSX SVG is sufficient. |
| `Elasticsearch` | Still overkill at 500-1000 records. pg_trgm + B-tree indexes handle this trivially. |
| New PostgreSQL indexes | `ix_bullets_caliber` already exists. No new indexes needed. |

## Sources

- [@react-three/fiber npm registry](https://www.npmjs.com/package/@react-three/fiber) -- v9.5.0 latest (React 19), v8.17.10 latest for React 18 [HIGH confidence, verified via registry API]
- [@react-three/drei npm registry](https://www.npmjs.com/package/@react-three/drei) -- v10.7.7 latest (React 19), v9.117.0 latest for React 18 [HIGH confidence, verified via registry API]
- [Three.js npm registry](https://www.npmjs.com/package/three) -- v0.183.1 latest [HIGH confidence, verified via registry API]
- [PapaParse npm registry](https://www.npmjs.com/package/papaparse) -- v5.5.3 latest [HIGH confidence]
- [React Three Fiber installation guide](https://r3f.docs.pmnd.rs/getting-started/installation) -- SSR patterns, version pairing rules
- [Three.js LatheGeometry docs](https://threejs.org/docs/#api/en/geometries/LatheGeometry) -- 2D profile revolution for axisymmetric solids
- [Next.js dynamic import](https://nextjs.org/docs/pages/building-your-application/optimizing/lazy-loading) -- `ssr: false` pattern for Three.js
- [PostgreSQL pg_trgm documentation](https://www.postgresql.org/docs/16/pgtrgm.html) -- existing fuzzy search capability
