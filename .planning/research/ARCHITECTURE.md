# Architecture Patterns: v1.3 Data Expansion + Visual Viewers

**Domain:** Internal ballistics simulator -- data expansion, 2D/3D visualization, community contributions, file upload
**Researched:** 2026-02-27
**Confidence:** HIGH (core patterns verified against official docs and existing codebase)

---

## Executive Summary

This document defines how six new feature areas integrate with the existing FastAPI + Next.js 14 architecture: (1) 3D parametric cartridge viewer, (2) 2D SVG technical drawings, (3) browser file upload/parsing, (4) community JSON contributions, (5) caliber-scoped parametric search, and (6) bullet database expansion. The architecture maximizes reuse of existing patterns (ChartTile, ComponentPicker, batch import endpoints, quality scoring) while introducing two new rendering subsystems (R3F Canvas and SVG drawing engine) that are purely frontend concerns with zero backend changes needed for rendering.

The critical architectural insight is that **all geometric data required for both 2D and 3D visualization already exists in the Cartridge and Bullet models**. The cartridge model has `case_length_mm`, `overall_length_mm`, `shoulder_diameter_mm`, `neck_diameter_mm`, `base_diameter_mm`, `rim_diameter_mm`, `bore_diameter_mm`, and `groove_diameter_mm`. The bullet model has `diameter_mm`, `length_mm`, and `weight_grains`. No new database columns are required for rendering -- only a frontend geometry engine that converts these dimensions to SVG paths and Three.js Vector2 profiles.

---

## Recommended Architecture

### High-Level Component Map

```
EXISTING (unchanged)                    NEW (v1.3)
================================       ================================
Backend:                                Backend:
  models/ (Bullet, Cartridge, ...)        (no new models)
  api/bullets.py (CRUD + import)          api/upload.py (CSV/JSON upload endpoint)
  api/cartridges.py (CRUD + import)       (extends existing import endpoints)
  api/simulate.py (/parametric)           (add cartridge_id filter to parametric)
  services/search.py                      (add cartridge_id->caliber_family join)
  core/quality.py                         (unchanged)

Frontend:                               Frontend:
  components/charts/ChartTile.tsx         components/viewers/CartridgeSvg.tsx
  components/pickers/ComponentPicker      components/viewers/ChamberSvg.tsx
  components/forms/SimulationForm         components/viewers/AssemblySvg.tsx
  components/ui/QualityBadge              components/viewers/CartridgeViewer3D.tsx
  hooks/useBullets.ts                     components/upload/FileDropzone.tsx
  hooks/useCartridges.ts                  components/upload/ImportPreview.tsx
  lib/api.ts                              lib/cartridge-geometry.ts
  lib/types.ts                            lib/bullet-geometry.ts
                                          hooks/useFileUpload.ts
                                          app/viewers/page.tsx
                                          app/import/page.tsx
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `lib/cartridge-geometry.ts` | Pure math: converts Cartridge dimensions to SVG path data and R3F Vector2 profile points | CartridgeSvg, ChamberSvg, AssemblySvg, CartridgeViewer3D |
| `lib/bullet-geometry.ts` | Pure math: converts Bullet dimensions to SVG ogive path and R3F profile | CartridgeSvg (seated bullet outline), CartridgeViewer3D |
| `CartridgeSvg.tsx` | Tab 1: SVG cross-section with dimension annotations | cartridge-geometry.ts, Cartridge data from API |
| `ChamberSvg.tsx` | Tab 2: Cartridge inside chamber with headspace/freebore annotations | cartridge-geometry.ts, Rifle/Cartridge data from API |
| `AssemblySvg.tsx` | Tab 3: Full assembly (cartridge + chamber + barrel) with harmonics overlay | cartridge-geometry.ts, SimulationResult (harmonics data) |
| `CartridgeViewer3D.tsx` | Interactive 3D model using React Three Fiber LatheGeometry | cartridge-geometry.ts, @react-three/fiber, @react-three/drei |
| `FileDropzone.tsx` | Drag-and-drop + file picker, client-side parsing, validation preview | useFileUpload hook, Papa Parse (CSV), JSON.parse |
| `ImportPreview.tsx` | Table preview of parsed rows with validation errors highlighted | FileDropzone (parsed data), existing import API |
| `useFileUpload.ts` | Hook: parse file, validate schema, call existing batch import endpoints | api.ts (importBullets, importCartridges) |
| `api/upload.py` | Backend: accepts multipart CSV/JSON, parses server-side, delegates to existing import logic | bullets.py/import, cartridges.py/import |

### Data Flow

#### 2D SVG Drawing Data Flow

```
[User selects cartridge in CRUD page or simulation result]
  |
  v
[Frontend fetches CartridgeResponse from GET /api/v1/cartridges/{id}]
  |
  v
[cartridge-geometry.ts: generateProfile(cartridge)]
  |  Input: { case_length_mm, base_diameter_mm, shoulder_diameter_mm,
  |           neck_diameter_mm, rim_diameter_mm, overall_length_mm,
  |           bore_diameter_mm }
  |  Output: { outerPath: SVGPathData, innerPath: SVGPathData,
  |            dimensions: DimensionLine[], viewBox: string }
  |
  v
[CartridgeSvg renders <svg> with <path> + dimension <line> + <text>]
```

**Key insight:** The geometry engine is a pure function with no side effects. Given cartridge dimensions, it produces deterministic SVG path data. This means the same engine serves both the standalone viewer page and the simulation results page (Assembly tab).

#### 3D Viewer Data Flow

```
[Same CartridgeResponse data as SVG]
  |
  v
[cartridge-geometry.ts: generateLatheProfile(cartridge)]
  |  Output: THREE.Vector2[] (profile points for revolution)
  |
  v
[CartridgeViewer3D: <Canvas><latheGeometry args={[points, 64]} /></Canvas>]
  |
  v
[OrbitControls for rotation/zoom, Drei helpers for lighting]
```

**Why LatheGeometry:** A cartridge is a body of revolution -- its cross-section rotated 360 degrees around the central axis produces the 3D shape. LatheGeometry takes an array of Vector2 points defining the half-profile and revolves them. This is computationally trivial (no mesh loading, no external assets, sub-millisecond generation) and produces perfectly parametric geometry that updates instantly when dimensions change.

#### File Upload Data Flow

```
[User drops CSV/JSON file on FileDropzone]
  |
  v
[Client-side: Papa Parse (CSV) or JSON.parse (JSON)]
  |  Validates schema: required columns present, types correct
  |  Shows preview table with row-level validation highlights
  |
  v
[User clicks "Importar" -> POST /api/v1/bullets/import]
  |  Body: BulletImportRequest { bullets: BulletCreate[] }
  |  Query: ?mode=skip|overwrite|merge
  |
  v
[Existing import_bullets() handler processes batch]
  |  Returns: ImportResult { created, updated, skipped, errors }
  |
  v
[ImportPreview shows results, TanStack Query invalidates cache]
```

**Why client-side parsing:** The existing import endpoints (`POST /bullets/import`, `POST /cartridges/import`) already accept JSON arrays. The browser can parse CSV to JSON client-side using Papa Parse, validate field names/types, and show the user a preview before sending. This means NO new backend endpoint is needed -- only a new frontend component. For very large files (10k+ rows), a server-side CSV parser endpoint could be added later, but the initial scope (500 bullets) is trivially handled client-side.

#### Community JSON Contribution Format

```
[Contributor creates JSON file following schema]
  |  Example: sierra_matchking_308.json
  |  {
  |    "format_version": "1.0",
  |    "contributor": "username",
  |    "source": "Sierra catalog 2025",
  |    "bullets": [
  |      {
  |        "name": "Sierra MatchKing 168gr HPBT",
  |        "manufacturer": "Sierra",
  |        "weight_grains": 168,
  |        "diameter_mm": 7.823,
  |        "length_mm": 31.39,
  |        "bc_g1": 0.462,
  |        "bc_g7": 0.223,
  |        "sectional_density": 0.253,
  |        "material": "copper_jacketed_lead",
  |        "bullet_type": "match",
  |        "base_type": "hollow_point_boat_tail",
  |        "model_number": "2200",
  |        "data_source": "manufacturer"
  |      }
  |    ]
  |  }
  |
  v
[User uploads via Import page OR submits PR to data/ directory]
  |
  v
[Validated against BulletCreate Pydantic schema on import]
```

**Why JSON over YAML/TOML:** The existing import pipeline already validates `BulletCreate` Pydantic schemas from JSON. Adding a wrapper format with metadata (format_version, contributor, source) is trivial. The browser can validate the schema client-side before upload. No new serialization library needed.

#### Caliber-Scoped Parametric Search

```
[Current: POST /simulate/parametric iterates ALL 208 powders]
  |
  v
[v1.3: Add cartridge_id to ParametricSearchRequest]
  |  cartridge_id is already a required field
  |  BUT currently iterates ALL powders regardless of cartridge
  |
  v
[New: Filter powders by caliber compatibility BEFORE simulation loop]
  |  SELECT * FROM powders WHERE caliber_families @> '{.308}'
  |  OR: use burn_rate_relative ranges appropriate for caliber bore volume
  |
  v
[Result: 30-50 powders instead of 208 -> 4-7x speedup]
```

**Architectural choice:** The filter should be a query parameter (`caliber_filter=true`) on the existing endpoint, not a new endpoint. This preserves backward compatibility -- omitting the parameter gives the existing behavior. The filtering logic belongs in a new service function `filter_powders_for_caliber(cartridge, powders) -> filtered_powders` that uses bore volume and charge density heuristics to exclude obviously incompatible powders (e.g., pistol powders for .300 Win Mag).

---

## New Components: Detailed Specifications

### 1. Cartridge Geometry Engine (`lib/cartridge-geometry.ts`)

This is the architectural cornerstone -- a pure TypeScript module with zero dependencies that converts database dimensions to renderable geometry.

```typescript
// lib/cartridge-geometry.ts

interface CartridgeDimensions {
  case_length_mm: number;
  overall_length_mm: number;
  base_diameter_mm: number | null;     // fallback: groove_diameter_mm + 2
  shoulder_diameter_mm: number | null;  // fallback: linear interpolation
  neck_diameter_mm: number | null;      // fallback: bore_diameter_mm + 0.5
  rim_diameter_mm: number | null;       // fallback: base_diameter_mm
  bore_diameter_mm: number;
  groove_diameter_mm: number;
}

interface BulletDimensions {
  diameter_mm: number;
  length_mm: number | null;  // fallback: estimate from weight + density
  weight_grains: number;
}

interface SVGProfileResult {
  outerPath: string;       // SVG path "d" attribute for case exterior
  innerPath: string;       // SVG path "d" attribute for case interior (powder chamber)
  bulletPath: string;      // SVG path "d" attribute for seated bullet ogive
  dimensions: DimensionLine[];  // annotation lines with values
  viewBox: string;         // computed viewBox for proper scaling
  centerX: number;         // axis of symmetry X position
}

interface DimensionLine {
  x1: number; y1: number;
  x2: number; y2: number;
  label: string;           // e.g., "51.18 mm"
  side: 'top' | 'bottom' | 'left' | 'right';
}

// For 3D: generates Vector2 profile for LatheGeometry
interface LatheProfile {
  points: [number, number][];  // [radius, height] pairs for revolution
  segments: number;            // recommended segment count (64 default)
}

export function generateSvgProfile(
  cartridge: CartridgeDimensions,
  bullet?: BulletDimensions,
  options?: { showBullet?: boolean; scale?: number }
): SVGProfileResult;

export function generateLatheProfile(
  cartridge: CartridgeDimensions,
  bullet?: BulletDimensions
): LatheProfile;

// Fallback estimation for missing dimensions
export function estimateMissingDimensions(
  partial: Partial<CartridgeDimensions>
): CartridgeDimensions;
```

**Why fallbacks matter:** Of the 53 cartridges in the database, not all have `shoulder_diameter_mm`, `neck_diameter_mm`, `base_diameter_mm`, and `rim_diameter_mm` populated. The geometry engine must gracefully degrade: if shoulder diameter is missing, assume a straight-walled case; if neck diameter is missing, estimate from bore diameter + typical brass thickness (0.3-0.4mm). This means every cartridge can render *something*, but cartridges with complete data render accurately. The quality badge system already signals data completeness.

### 2. SVG Technical Drawings (3 Tab Components)

#### Tab 1: CartridgeSvg -- Cross-Section

Renders the cartridge case in half-section (cut along axis of symmetry) with dimension annotations.

```typescript
// components/viewers/CartridgeSvg.tsx
interface CartridgeSvgProps {
  cartridge: Cartridge;
  bullet?: Bullet;
  showBullet?: boolean;     // toggle seated bullet
  showDimensions?: boolean; // toggle dimension lines
  className?: string;
  expanded?: boolean;       // full-page modal mode
}
```

Visual elements:
- Case exterior outline (solid stroke, fill with brass-colored gradient)
- Case interior (dashed line showing powder chamber)
- Seated bullet (if provided, with ogive and base)
- Dimension lines: case length, overall length, base diameter, shoulder diameter, neck diameter, rim diameter
- Color scheme: matches dark theme (slate background, white/blue dimension lines, amber fill for brass)

**SVG generation approach:** Inline SVG with React (not an external library). The cartridge profile is a simple polygon: rim -> base -> body -> shoulder taper -> neck -> mouth -> (bullet ogive) -> return. Each segment is a line or quadratic bezier. SVG is the right choice over Canvas because:
1. DOM elements are individually inspectable and styleable with Tailwind
2. Dimension annotations are native `<text>` elements (crisp at any zoom)
3. Dark mode theming via CSS variables
4. Export to PNG via the existing html2canvas pipeline in ChartTile

#### Tab 2: ChamberSvg -- Cartridge in Chamber

Adds the chamber (rifle) context around the cartridge:

```typescript
interface ChamberSvgProps {
  cartridge: Cartridge;
  rifle: Rifle;
  bullet?: Bullet;
  showFreebore?: boolean;
  showHeadspace?: boolean;
}
```

Visual elements:
- Steel chamber walls (darker fill)
- Cartridge seated inside chamber
- Headspace gap annotation
- Freebore region annotation (gap between bullet and rifling)
- Leade angle indication
- Barrel bore extending right

#### Tab 3: AssemblySvg -- Full Assembly with Harmonics

Extends Tab 2 with simulation data overlay:

```typescript
interface AssemblySvgProps {
  cartridge: Cartridge;
  rifle: Rifle;
  bullet?: Bullet;
  simulationResult?: SimulationResult;  // for harmonics overlay
  showHarmonics?: boolean;
}
```

Visual elements:
- Full barrel length (scaled appropriately)
- Cartridge in chamber (from Tab 2)
- If simulation result available:
  - Barrel deflection curve (exaggerated sine wave along barrel)
  - OBT node markers
  - Muzzle position indicator
  - Color-coded by OBT match status

### 3. 3D Cartridge Viewer (`CartridgeViewer3D.tsx`)

```typescript
interface CartridgeViewer3DProps {
  cartridge: Cartridge;
  bullet?: Bullet;
  showBullet?: boolean;
  showCutaway?: boolean;   // half-section view
  showWireframe?: boolean;
}
```

**Implementation approach:**

```tsx
'use client';

import dynamic from 'next/dynamic';

// CRITICAL: R3F Canvas must not render on server
const CartridgeViewer3DInner = dynamic(
  () => import('./CartridgeViewer3DInner'),
  { ssr: false }
);

export default function CartridgeViewer3D(props: CartridgeViewer3DProps) {
  return <CartridgeViewer3DInner {...props} />;
}
```

Inner component:

```tsx
// components/viewers/CartridgeViewer3DInner.tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { generateLatheProfile } from '@/lib/cartridge-geometry';

function CartridgeMesh({ cartridge, bullet, showCutaway }: {...}) {
  const profile = useMemo(
    () => generateLatheProfile(cartridge, bullet),
    [cartridge, bullet]
  );

  const points = useMemo(
    () => profile.points.map(([r, h]) => new THREE.Vector2(r, h)),
    [profile]
  );

  // Full revolution or half for cutaway
  const phiLength = showCutaway ? Math.PI : Math.PI * 2;

  return (
    <mesh>
      <latheGeometry args={[points, 64, 0, phiLength]} />
      <meshStandardMaterial
        color="#c4a35a"    // brass
        metalness={0.6}
        roughness={0.3}
        side={showCutaway ? THREE.DoubleSide : THREE.FrontSide}
      />
    </mesh>
  );
}

export default function CartridgeViewer3DInner({ cartridge, bullet, showCutaway }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 120], fov: 45 }}
      style={{ height: 400, background: '#0f172a' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <CartridgeMesh cartridge={cartridge} bullet={bullet} showCutaway={showCutaway} />
      <OrbitControls enablePan enableZoom enableRotate />
    </Canvas>
  );
}
```

**Why LatheGeometry over ExtrudeGeometry or loaded models:**
1. Cartridges are bodies of revolution -- LatheGeometry is the mathematically correct primitive
2. Zero external assets (no GLTF/OBJ files to load or host)
3. Parametric: changing any dimension re-renders instantly (useMemo recalculates profile)
4. Sub-1ms generation time for 64-segment revolution
5. Tiny bundle footprint (no model loading code needed)

**SSR handling:** React Three Fiber Canvas MUST use `dynamic import` with `ssr: false` in Next.js. The Canvas accesses `window` and `document` directly. The existing codebase uses `'use client'` directives but does not have any components that require `ssr: false`, so this is a new pattern. Wrap the import in a single `CartridgeViewer3D.tsx` facade component.

**next.config.js change required:**

```js
// next.config.js
const nextConfig = {
  transpilePackages: ['three'],
  // ... existing config
};
```

### 4. File Upload Components

#### FileDropzone

```typescript
interface FileDropzoneProps {
  accept: '.csv' | '.json' | '.csv,.json';
  onParsed: (data: ParsedImportData) => void;
  entityType: 'bullet' | 'cartridge';
}

interface ParsedImportData {
  rows: Record<string, unknown>[];
  headers: string[];
  errors: ValidationError[];
  sourceFormat: 'csv' | 'json';
  fileName: string;
}
```

**Implementation pattern:**
- Native HTML5 drag-and-drop (no library needed for simple drop zone)
- `<input type="file" accept=".csv,.json" />` as hidden element
- `FileReader.readAsText()` for client-side reading
- Papa Parse for CSV: `Papa.parse(text, { header: true, dynamicTyping: true })`
- JSON: `JSON.parse(text)` with try/catch
- Schema validation: map column names to BulletCreate/CartridgeCreate fields
- Show validation errors per-row before upload

**Why not react-dropzone:** The drop zone here is simple (single file, known types). Adding a library for a `<div onDragOver onDrop>` wrapper is unnecessary. HTML5 drag-and-drop events are sufficient.

**Why Papa Parse for CSV:** It is the established standard (11k+ GitHub stars), handles edge cases (quoted fields, escaped commas, BOM markers), and has zero dependencies. The alternative (manual CSV parsing) is error-prone.

#### ImportPreview

```typescript
interface ImportPreviewProps {
  data: ParsedImportData;
  onImport: (mode: 'skip' | 'overwrite' | 'merge') => void;
  isImporting: boolean;
  result?: ImportResult;
}
```

Renders a preview table showing:
- Parsed rows with validated fields
- Red highlighting on rows with validation errors
- Column mapping indicators (detected vs expected)
- Import mode selector (Skip / Overwrite / Merge)
- Summary: "X filas validas, Y con errores"
- Import button and result feedback

### 5. Community JSON Contribution Format

#### Schema Definition

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["format_version", "type", "items"],
  "properties": {
    "format_version": { "const": "1.0" },
    "type": { "enum": ["bullets", "cartridges"] },
    "contributor": { "type": "string" },
    "source": { "type": "string" },
    "source_url": { "type": "string", "format": "uri" },
    "items": {
      "type": "array",
      "items": { "$ref": "#/$defs/bullet_or_cartridge" }
    }
  }
}
```

**Integration with existing pipeline:**
The community JSON format wraps the existing `BulletCreate` / `CartridgeCreate` schemas. The `items` array contains objects that match the existing Pydantic schemas exactly. This means:
1. Frontend: strips the wrapper metadata, sends `items` to existing `POST /bullets/import`
2. Backend: zero changes needed for the import logic
3. Validation: existing Pydantic schema validation catches bad data
4. Quality scoring: existing `compute_bullet_quality_score()` auto-computes quality

**Contribution workflow (no auth needed):**
1. User creates JSON file following the schema
2. Uploads via Import page in the browser
3. Client-side validates against JSON Schema before send
4. `POST /bullets/import?mode=skip` processes the batch
5. Result shows created/skipped/errors

Alternative for GitHub-native contributions:
1. Place JSON files in `backend/seed/community/bullets/` directory
2. Backend seed script auto-imports on startup
3. Contributors can submit PRs adding their JSON files

### 6. Caliber-Scoped Parametric Search

**Current bottleneck:** The parametric search iterates all 208 powders, running ~10 simulations per powder (2,080 total simulations). With 500+ bullets and caliber-specific search, this is fine but could be faster.

**Scoping strategy:**

```python
# In simulate.py run_parametric_search():

# NEW: optional caliber filter
if req.caliber_filter:
    # Heuristic: filter by burn rate appropriateness for bore volume
    case_volume_cm3 = cartridge_row.case_capacity_grains_h2o * _GRAINS_H2O_TO_CM3
    bore_area_m2 = (cartridge_row.bore_diameter_mm * 0.001) ** 2 * 3.14159 / 4

    # Small bore (< 6.5mm) -> exclude slowest powders
    # Large bore (> 8mm) -> exclude fastest powders
    # Filter by relative burn rate range
    if cartridge_row.bore_diameter_mm < 6.5:
        all_powders = [p for p in all_powders if p.burn_rate_relative > 30]
    elif cartridge_row.bore_diameter_mm > 8.0:
        all_powders = [p for p in all_powders if p.burn_rate_relative < 180]
```

**Schema change:**

```python
class ParametricSearchRequest(BaseModel):
    # ... existing fields ...
    caliber_filter: bool = Field(
        default=False,
        description="Filter powders by caliber appropriateness"
    )
```

This is a minor, backward-compatible extension. Frontend sends `caliber_filter: true` from the search page.

---

## Integration Points with Existing Components

### Existing Components Reused (No Modifications)

| Component | How Reused in v1.3 |
|-----------|-------------------|
| `ChartTile.tsx` | Wraps SVG viewers -- provides PNG export, expand-to-modal, dark theme border |
| `ChartModal.tsx` | Full-screen modal for expanded SVG/3D views |
| `ComponentPicker.tsx` | Used in viewer page to select cartridge/bullet/rifle for visualization |
| `QualityBadge.tsx` | Shows data quality on imported records in ImportPreview |
| `api.ts` request() | HTTP client for upload API calls |
| `quality.py` | Auto-scores uploaded bullet/cartridge records |
| `search.py` | Fuzzy search on expanded bullet database (no changes needed) |
| `pagination.py` | Server-side pagination for 500+ bullets (already works) |

### Existing Components Modified

| Component | Modification | Reason |
|-----------|-------------|--------|
| `Sidebar.tsx` | Add 2 nav items: "Visor Tecnico" (viewers page), "Importar Datos" (upload page) | Navigation to new features |
| `types.ts` | Add `CommunityContribution` interface, extend `ParametricSearchInput` with `caliber_filter` | TypeScript types for new features |
| `api.ts` | Add `uploadBulletFile()`, `uploadCartridgeFile()` functions that wrap existing import endpoints | Upload convenience functions |
| `package.json` | Add `three`, `@react-three/fiber`, `@react-three/drei`, `papaparse`, `@types/three`, `@types/papaparse` | New dependencies |
| `next.config.js` | Add `transpilePackages: ['three']` | Three.js SSR transpilation |
| `ParametricSearchRequest` (backend schema) | Add `caliber_filter: bool = False` | Caliber scoping |

### New Pages

| Page Route | Purpose | Key Components |
|------------|---------|----------------|
| `/viewers` | Technical drawing viewer with tabs + 3D model | CartridgeSvg, ChamberSvg, AssemblySvg, CartridgeViewer3D, ComponentPicker |
| `/import` | File upload page for CSV/JSON bullet/cartridge data | FileDropzone, ImportPreview |

### New Backend Files

| File | Purpose |
|------|---------|
| `backend/app/api/upload.py` (optional) | Server-side CSV parsing endpoint for large files. Not needed for MVP -- client-side parsing handles 500 rows trivially |
| `backend/seed/community/` | Directory for community-contributed JSON data files |
| `backend/seed/community/schema.json` | JSON Schema for community contribution format validation |
| `backend/seed/bullets/expanded/` | 500+ bullet seed data organized by manufacturer |

### New Frontend Files

| File | Purpose |
|------|---------|
| `frontend/src/lib/cartridge-geometry.ts` | Pure geometry engine: cartridge dimensions -> SVG paths + R3F profiles |
| `frontend/src/lib/bullet-geometry.ts` | Pure geometry engine: bullet dimensions -> ogive SVG path + R3F profile |
| `frontend/src/components/viewers/CartridgeSvg.tsx` | Tab 1: SVG cross-section |
| `frontend/src/components/viewers/ChamberSvg.tsx` | Tab 2: Cartridge in chamber |
| `frontend/src/components/viewers/AssemblySvg.tsx` | Tab 3: Full assembly + harmonics |
| `frontend/src/components/viewers/CartridgeViewer3D.tsx` | Facade with `ssr: false` dynamic import |
| `frontend/src/components/viewers/CartridgeViewer3DInner.tsx` | Actual R3F Canvas + LatheGeometry |
| `frontend/src/components/viewers/ViewerTabs.tsx` | Tab navigation: Seccion / Recamara / Ensamblaje / 3D |
| `frontend/src/components/upload/FileDropzone.tsx` | Drag-and-drop file upload zone |
| `frontend/src/components/upload/ImportPreview.tsx` | Preview table with validation |
| `frontend/src/components/upload/ColumnMapper.tsx` | CSV column to schema field mapping UI |
| `frontend/src/hooks/useFileUpload.ts` | Upload hook with parsing and API mutation |
| `frontend/src/app/viewers/page.tsx` | Viewer page with tab layout |
| `frontend/src/app/import/page.tsx` | Import page with dropzone + preview |

---

## Patterns to Follow

### Pattern 1: Pure Geometry Engine (Separation of Concerns)

**What:** All coordinate math lives in pure TypeScript functions in `lib/`. Components only render; they never compute geometry.

**When:** Always, for all SVG and 3D geometry generation.

**Why:** Testable without React, reusable across SVG and 3D, no coupling to rendering framework.

```typescript
// lib/cartridge-geometry.ts
export function generateSvgProfile(dims: CartridgeDimensions): SVGProfileResult {
  const scale = 5; // 1mm = 5px
  const centerY = 0;

  // Base to shoulder taper
  const baseR = (dims.base_diameter_mm ?? dims.groove_diameter_mm + 2) / 2 * scale;
  const shoulderR = (dims.shoulder_diameter_mm ?? baseR * 0.9) / 2 * scale;
  const neckR = (dims.neck_diameter_mm ?? dims.bore_diameter_mm + 0.5) / 2 * scale;

  // Build SVG path
  const pathParts: string[] = [];
  // ... coordinate calculations ...

  return {
    outerPath: pathParts.join(' '),
    innerPath: '...',
    bulletPath: '...',
    dimensions: [],
    viewBox: `0 0 ${dims.overall_length_mm * scale + 80} ${baseR * 2 + 60}`,
    centerX: baseR + 30,
  };
}
```

### Pattern 2: Dynamic Import for Heavy Client Components

**What:** Use `next/dynamic` with `ssr: false` for any component that imports Three.js or accesses browser-only APIs.

**When:** CartridgeViewer3D, any future WebGL components.

```typescript
// components/viewers/CartridgeViewer3D.tsx
import dynamic from 'next/dynamic';
import Spinner from '@/components/ui/Spinner';

const CartridgeViewer3DInner = dynamic(
  () => import('./CartridgeViewer3DInner'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center bg-slate-900 rounded-lg">
        <Spinner size="lg" />
      </div>
    ),
  }
);
```

### Pattern 3: Reuse Existing Import Pipeline

**What:** Browser upload parses files client-side, then sends the same JSON shape that the existing batch import endpoints accept.

**When:** All file upload features (bullets, cartridges, community JSON).

**Why:** Zero new backend validation code. All Pydantic validators, quality scoring, and collision handling already work.

```typescript
// hooks/useFileUpload.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';

export function useFileUpload(entityType: 'bullet' | 'cartridge') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      mode,
    }: {
      file: File;
      mode: 'skip' | 'overwrite' | 'merge';
    }) => {
      const text = await file.text();
      let items: Record<string, unknown>[];

      if (file.name.endsWith('.csv')) {
        const result = Papa.parse(text, { header: true, dynamicTyping: true });
        items = result.data;
      } else {
        const parsed = JSON.parse(text);
        // Support both community format (items) and raw arrays
        items = parsed.items ?? parsed.bullets ?? parsed.cartridges ?? parsed;
      }

      // Send to existing import endpoint
      const key = entityType === 'bullet' ? 'bullets' : 'cartridges';
      const endpoint = `/${key}/import`;
      const response = await fetch(`${API_PREFIX}${endpoint}?mode=${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: items }),
      });

      return response.json();
    },
    onSuccess: () => {
      const key = entityType === 'bullet' ? 'bullets' : 'cartridges';
      queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}
```

### Pattern 4: Graceful Degradation for Incomplete Data

**What:** Render what you can with available dimensions; show "Datos incompletos" badge for estimated geometry.

**When:** SVG and 3D viewers when cartridge has null dimension fields.

```typescript
// Fallback estimates for common missing fields
const TYPICAL_BRASS_THICKNESS_MM = 0.35;
const TYPICAL_RIM_OVERSIZE_MM = 1.0;

export function estimateMissingDimensions(
  cart: Partial<CartridgeDimensions>
): CartridgeDimensions {
  const bore = cart.bore_diameter_mm!;
  const groove = cart.groove_diameter_mm!;

  return {
    ...cart,
    base_diameter_mm: cart.base_diameter_mm
      ?? groove + 2 * TYPICAL_BRASS_THICKNESS_MM + 1.0,
    neck_diameter_mm: cart.neck_diameter_mm
      ?? bore + 2 * TYPICAL_BRASS_THICKNESS_MM,
    shoulder_diameter_mm: cart.shoulder_diameter_mm ?? null,
    rim_diameter_mm: cart.rim_diameter_mm
      ?? (cart.base_diameter_mm ?? groove + 3.0),
  } as CartridgeDimensions;
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Server-Side SVG Generation

**What:** Generating SVG on the backend (e.g., with svgwrite/cairo in Python) and sending it to the frontend as a string.

**Why bad:** Introduces server load for a purely presentational concern, prevents React state management (hover, toggle dimensions, animation), makes the SVG non-interactive, and couples rendering to API latency.

**Instead:** Generate SVG entirely client-side from the cartridge dimension data that already comes from the API. The geometry engine runs in the browser with zero network overhead.

### Anti-Pattern 2: Loading External 3D Model Files

**What:** Creating GLTF/OBJ models for each cartridge and loading them from the server.

**Why bad:** Requires a 3D modeling pipeline, hosting static assets, per-cartridge model files (53+ files and growing), and load times for model download. The models would not be parametric -- changing a dimension requires re-modeling.

**Instead:** Use LatheGeometry with parametric Vector2 profiles. The geometry is generated from database dimensions in sub-1ms, zero network requests, zero static assets.

### Anti-Pattern 3: New Backend Endpoints for Rendering Data

**What:** Creating `/api/v1/cartridges/{id}/geometry` or `/api/v1/cartridges/{id}/svg` endpoints.

**Why bad:** The existing `GET /api/v1/cartridges/{id}` already returns ALL the dimensions needed. Adding rendering-specific endpoints couples the API to the frontend's rendering implementation.

**Instead:** Frontend reads the standard CartridgeResponse and computes geometry client-side.

### Anti-Pattern 4: Separate Upload API from Import API

**What:** Creating `POST /api/v1/upload/bullets` separately from the existing `POST /api/v1/bullets/import`.

**Why bad:** Duplicates validation logic, collision handling, quality scoring. Two code paths to maintain.

**Instead:** Client-side parsing produces the same JSON shape, sends to the existing import endpoint. If server-side CSV parsing is needed later, the CSV parser endpoint should transform to `BulletImportRequest` and delegate to the existing import function internally.

---

## Dependency Graph and Build Order

```
Phase 1: Foundation (no visual output yet)
  [1a] cartridge-geometry.ts ---- Pure math, testable independently
  [1b] bullet-geometry.ts ------- Pure math, testable independently
  [1c] Bullet seed data expansion (500+ JSON files)
  [1d] next.config.js + package.json deps (three, papaparse, R3F)

Phase 2: 2D SVG Drawings (depends on 1a, 1b)
  [2a] CartridgeSvg.tsx ---------- Tab 1: cross-section
  [2b] ChamberSvg.tsx ------------ Tab 2: chamber (depends on 2a)
  [2c] AssemblySvg.tsx ----------- Tab 3: assembly (depends on 2b)
  [2d] ViewerTabs.tsx ------------ Tab container
  [2e] /viewers page.tsx --------- Viewer page with component picker

Phase 3: 3D Viewer (depends on 1a, 1b, 1d)
  [3a] CartridgeViewer3DInner.tsx - R3F Canvas + LatheGeometry
  [3b] CartridgeViewer3D.tsx ------ Dynamic import wrapper
  [3c] Add 3D tab to ViewerTabs --- (depends on 2d, 3b)

Phase 4: File Upload (depends on 1d for papaparse)
  [4a] FileDropzone.tsx ---------- Drag-drop + parse
  [4b] ImportPreview.tsx --------- Preview table + validation
  [4c] useFileUpload.ts ---------- Hook wrapping existing import API
  [4d] /import page.tsx ---------- Upload page
  [4e] Community JSON schema ----- schema.json + documentation

Phase 5: Caliber-Scoped Search (backend, depends on 1c for data)
  [5a] Backend: add caliber_filter to ParametricSearchRequest
  [5b] Backend: powder filtering logic in simulate.py
  [5c] Frontend: toggle in parametric search form

Phase 6: Integration + Polish
  [6a] Sidebar nav updates
  [6b] Add SVG viewer link on cartridge detail/CRUD pages
  [6c] Add 3D viewer preview on simulation results page
  [6d] Seed data import script for 500+ bullets
```

**Critical path:** 1a -> 2a -> 2b -> 2c (SVG viewer) and 1a -> 3a -> 3b (3D viewer) can run in parallel with 4a -> 4b -> 4d (upload) since they share no dependencies.

**Why this order:**
1. Geometry engine first because both 2D and 3D depend on it
2. 2D SVG before 3D because SVG is simpler, validates the geometry engine, and provides immediate visual value
3. Upload before caliber search because upload enables data expansion (500+ bullets) which makes caliber scoping valuable
4. Caliber search last because it is a minor backend optimization that becomes important only with more data

---

## Scalability Considerations

| Concern | At 500 bullets | At 5,000 bullets | At 50,000 bullets |
|---------|---------------|-----------------|-------------------|
| List page performance | Server-side pagination handles trivially | Same (pg_trgm index helps) | May need partial index on caliber_family |
| Import time | < 1s for 500-row JSON batch | ~5s, acceptable | Need streaming/chunked import |
| Parametric search | ~2s (208 powders x 10 sims) | Same (searches powders, not bullets) | Same |
| SVG rendering | Instant (single cartridge) | N/A (renders one at a time) | N/A |
| 3D rendering | Instant (LatheGeometry) | N/A | N/A |
| Bundle size (3D) | +~200KB (three.js tree-shaken) | Same | Same |
| Community JSON files | 10-20 files | 50+ files | Need DB migration from seed files |

**Bundle size impact of Three.js:**
- `three` base: ~150KB gzipped (tree-shaken via Next.js)
- `@react-three/fiber`: ~30KB gzipped
- `@react-three/drei` (partial import): ~20KB gzipped
- Total: ~200KB gzipped, loaded only on `/viewers` page via dynamic import
- **Not loaded on simulation or CRUD pages** -- code splitting keeps other pages unaffected

---

## New Dependencies

### Frontend

| Package | Version | Purpose | Size Impact |
|---------|---------|---------|-------------|
| `three` | ^0.170.0 | 3D rendering engine | ~150KB gz (code-split) |
| `@react-three/fiber` | ^9.0.0 | React renderer for Three.js | ~30KB gz |
| `@react-three/drei` | ^10.0.0 | Helpers (OrbitControls, lights) | ~20KB gz (tree-shaken) |
| `@types/three` | ^0.170.0 | TypeScript types | Dev only |
| `papaparse` | ^5.4.0 | CSV parsing | ~7KB gz |
| `@types/papaparse` | ^5.3.0 | TypeScript types | Dev only |

### Backend

No new Python dependencies required. Existing `pydantic`, `sqlalchemy`, and `fastapi` handle all backend changes.

---

## Sources

- [React Three Fiber Installation](https://r3f.docs.pmnd.rs/getting-started/installation) -- Official setup guide for Next.js integration (HIGH confidence)
- [React Three Fiber GitHub](https://github.com/pmndrs/react-three-fiber) -- Source code and examples (HIGH confidence)
- [@react-three/drei shapes](https://github.com/pmndrs/drei/blob/master/src/core/shapes.tsx) -- LatheGeometry, ExtrudeGeometry wrappers (HIGH confidence)
- [Three.js LatheGeometry docs](https://threejs.org/docs/#api/en/geometries/LatheGeometry) -- Profile points and segment parameters (HIGH confidence)
- [react-three-next starter](https://github.com/pmndrs/react-three-next) -- Official Next.js + R3F starter template (HIGH confidence)
- [Papa Parse](https://react-papaparse.js.org/) -- CSV parser documentation (HIGH confidence)
- [SVG in React](https://refine.dev/blog/react-svg/) -- Inline SVG component patterns (MEDIUM confidence)
- [2D Graphics with React and SVG](https://vivekrajagopal.dev/blog/2023/May/react-svg-graphics/) -- Engineering drawing approaches (MEDIUM confidence)
- Existing codebase analysis (backend models, API endpoints, frontend components) -- PRIMARY source for integration points (HIGH confidence)
