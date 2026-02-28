# Phase 13: 3D Parametric Cartridge Viewer - Research

**Researched:** 2026-02-28
**Domain:** WebGL 3D rendering with React Three Fiber, parametric geometry, clipping planes
**Confidence:** HIGH

## Summary

Phase 13 adds an interactive 3D parametric cartridge viewer as a new tab on the existing `/drawings` page. The existing geometry engine already produces `ProfilePoint[]` arrays designed for Three.js `LatheGeometry` -- the core 3D mesh generation is a direct conversion from `{x, y}` to `Vector2` fed into `LatheGeometry`. The stack is already installed: `@react-three/fiber` 8.18.0, `@react-three/drei` 9.122.0, and `three` 0.170.0.

The primary technical challenges are: (1) stencil-based clipping plane cutaway with solid capping, which requires `stencil: true` in the renderer since three.js r163 disabled it by default; (2) code splitting the Three.js bundle via `next/dynamic` with `ssr: false` so non-3D pages load zero Three.js JavaScript; and (3) proper WebGL context disposal when leaving the 3D tab to prevent memory leaks after 20+ navigations.

**Primary recommendation:** Build pure geometry-generation functions (no React) that convert `ProfilePoint[]` to Three.js `LatheGeometry`, then wrap in R3F components. Use `next/dynamic` with `ssr: false` for code splitting. Enable `stencil: true` on the Canvas `gl` prop for cutaway rendering. Conditionally mount/unmount the `<Canvas>` component when switching tabs to ensure WebGL context disposal.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Realistic PBR metallic materials: brass case, copper/lead bullet (type-aware), nickel primer
- Bullet material varies by `bullet_type` field: FMJ = copper jacket, HP = copper with exposed lead core, solid copper = uniform copper
- HDR environment map for realistic reflections on metallic surfaces (~1-2MB HDR file)
- Toggle-able dimension labels in 3D space (HTML overlays via drei `<Html>`) showing key dimensions (case length, OAL, neck diameter), off by default
- Animated clip plane sliding along the longitudinal axis (smooth transition)
- Single toggle button to activate/deactivate cutaway
- Fixed longitudinal cut (classic engineering half-section), NOT user-rotatable
- Full internal structure revealed: case wall thickness, powder space with fill level (when load data available), bullet seating depth, primer pocket
- Solid colored cross-section faces per material zone (brass yellow for case wall, dark gray for powder space, copper for bullet) -- no hatching in 3D
- New "3D" tab added to existing `/drawings` page alongside cross-section/chamber/assembly tabs
- Reuses existing cartridge/rifle/bullet selector dropdowns and deep linking pattern
- Deep link support from simulation results: `/drawings?tab=3d&cartridge_id=...&bullet_id=...`
- Auto-load on tab select (no manual render button), show loading spinner while geometry builds
- WebGL context disposed immediately when leaving the 3D tab (ensures VIS3-05: no memory leak after 20+ navigations)
- Code-split: Three.js bundle only loaded when 3D tab is active (VIS3-04)
- Degradation tiers: Full (all from DB), Basic (some estimated, show info badge), Insufficient (no 3D canvas, show message), No WebGL (auto-redirect to 2D tab with toast)

### Claude's Discretion
- HDR environment map selection (studio vs outdoor, brightness level)
- Exact PBR material parameters (roughness, metalness values)
- Camera default position and orbit control limits
- Loading spinner design within the canvas
- Powder fill level visualization approach (color gradient, particle texture, or simple volume)
- Dimension label positioning algorithm in 3D space
- Clip plane animation easing and duration

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIS3-01 | User can view interactive 3D parametric cartridge model generated from DB dimensions | LatheGeometry from ProfilePoint[], PBR materials, R3F Canvas with dynamic import |
| VIS3-02 | User can rotate, zoom, and pan the 3D model | drei OrbitControls with enablePan/enableZoom/enableRotate |
| VIS3-03 | User can toggle cutaway half-section view showing internal structure | Three.js clipping plane with stencil capping (stencil: true on renderer) |
| VIS3-04 | 3D viewer loads via code splitting with no impact on other page load times | next/dynamic with ssr: false, conditional Canvas mount on 3D tab active |
| VIS3-05 | WebGL context properly disposed on page navigation (no memory leak after 20+ navigations) | Unmount Canvas component when leaving 3D tab; R3F auto-calls forceContextLoss on unmount |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | 0.170.0 | 3D engine: LatheGeometry, MeshStandardMaterial, Plane, clipping | **Already installed.** Only viable browser 3D engine |
| @react-three/fiber | 8.18.0 | React renderer for Three.js: Canvas, declarative scene graph | **Already installed.** Standard React-Three.js bridge |
| @react-three/drei | 9.122.0 | Helpers: OrbitControls, Html, Environment, useProgress | **Already installed.** Community standard R3F utilities |
| @types/three | 0.170.0 | TypeScript definitions for three.js | **Already installed.** |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/dynamic | (built-in) | Code splitting with `ssr: false` | Import the 3D viewer component only when 3D tab active |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| drei `<Environment>` presets | Custom HDR file via `<Environment files="...">` | Presets rely on CDN (not for production); local HDR file is reliable and controllable |
| drei `<Environment preset="studio">` | Local `/hdri/studio.hdr` file | Preset is CDN-dependent; local file ensures offline/production reliability |

**Installation:**
```bash
# No new packages needed -- all already in package.json
# Only need to download an HDR file to frontend/public/hdri/
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/
├── components/
│   └── drawings/
│       ├── DrawingViewer.tsx         # MODIFY: add 3D tab conditional render
│       ├── DrawingTabs.tsx           # MODIFY: add '3d' tab option
│       ├── CompletenessBanner.tsx    # REUSE: as-is for basic/insufficient tiers
│       ├── viewer3d/                # NEW: 3D viewer components
│       │   ├── CartridgeViewer3D.tsx # Main R3F Canvas scene (dynamically imported)
│       │   ├── CartridgeMesh.tsx     # Case mesh from LatheGeometry
│       │   ├── BulletMesh.tsx        # Bullet mesh from LatheGeometry
│       │   ├── PrimerMesh.tsx        # Primer cylinder mesh
│       │   ├── CutawayControls.tsx   # Clip plane toggle + animation
│       │   ├── DimensionLabels3D.tsx # drei Html overlays for dimensions
│       │   └── materials.ts         # PBR material definitions (pure, no React)
│       └── ...existing 2D drawings
├── lib/
│   └── geometry/
│       ├── bullet-geometry.ts       # EXISTING: generates ProfilePoint[]
│       ├── cartridge-geometry.ts    # EXISTING: generates ProfilePoint[]
│       ├── mesh-builder.ts          # NEW: ProfilePoint[] → LatheGeometry (pure, no React)
│       └── types.ts                 # EXISTING: ProfilePoint, GeometryResult
├── app/
│   └── drawings/
│       └── page.tsx                 # MODIFY: add tab='3d' to query param handling
└── public/
    └── hdri/
        └── studio_small.hdr         # NEW: HDR env map (~1-2MB)
```

### Pattern 1: ProfilePoint[] to LatheGeometry Conversion
**What:** Pure function converting existing geometry engine output to Three.js geometry
**When to use:** Every time a cartridge/bullet needs to be rendered in 3D
**Example:**
```typescript
// mesh-builder.ts (pure -- no React imports)
import * as THREE from 'three';
import { ProfilePoint } from './types';

export function profileToLatheGeometry(
  points: ProfilePoint[],
  segments: number = 64
): THREE.LatheGeometry {
  // LatheGeometry rotates around Y axis, with x = radial distance
  // Our ProfilePoint: x = axial, y = radial
  // Three.js LatheGeometry expects Vector2 where x = radial, y = axial
  const vectors = points.map(p => new THREE.Vector2(p.y, p.x));
  return new THREE.LatheGeometry(vectors, segments);
}
```
**Confidence:** HIGH -- LatheGeometry docs confirm Vector2 array with x > 0 constraint; our y values (radial distances) are always positive.

### Pattern 2: Conditional Canvas Mount for WebGL Lifecycle
**What:** Only mount the R3F `<Canvas>` when the 3D tab is active; unmount it when switching away
**When to use:** Essential for VIS3-05 (memory leak prevention)
**Example:**
```typescript
// DrawingViewer.tsx
const Viewer3DLazy = dynamic(
  () => import('./viewer3d/CartridgeViewer3D'),
  { ssr: false, loading: () => <Spinner /> }
);

// In render:
{activeTab === '3d' && (
  <Viewer3DLazy cartridge={cartridge} bullet={bullet} />
)}
```
**Confidence:** HIGH -- R3F auto-calls `renderer.forceContextLoss()` on Canvas unmount. Conditional rendering ensures the Canvas is fully unmounted when switching tabs.

### Pattern 3: Stencil-Based Cutaway with Clipping Plane
**What:** Use Three.js clipping plane + stencil buffer to render solid cross-section caps
**When to use:** Cutaway half-section toggle
**Example:**
```typescript
// Inside CartridgeViewer3D.tsx
<Canvas gl={{ stencil: true, antialias: true }}>
  {/* Scene content with clipping */}
</Canvas>

// CutawayControls.tsx
const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), []);

// On mesh materials:
<meshStandardMaterial
  clippingPlanes={cutawayActive ? [clipPlane] : []}
  clipShadows
  side={THREE.DoubleSide}
/>

// Cap plane for solid fill at clip boundary:
<mesh>
  <planeGeometry args={[100, 100]} />
  <meshStandardMaterial
    color={capColor}
    stencilWrite
    stencilFunc={THREE.NotEqualStencilFunc}
    stencilRef={0}
    side={THREE.DoubleSide}
  />
</mesh>
```
**Confidence:** MEDIUM -- The stencil approach is well-documented in Three.js's `webgl_clipping_stencil` example, but r163+ disabled stencil by default. R3F's `gl={{ stencil: true }}` should re-enable it. The integration of stencil ops in R3F's declarative model requires careful ordering. An alternative simpler approach (no stencil): create separate inner-wall geometries that are only visible when cutaway is active, avoiding stencil complexity entirely.

### Pattern 4: HDR Environment for PBR Reflections
**What:** Local HDR file loaded via drei `<Environment>` for metallic material reflections
**When to use:** Always in the 3D scene
**Example:**
```typescript
import { Environment } from '@react-three/drei';

// In scene:
<Environment files="/hdri/studio_small.hdr" />
```
**Confidence:** HIGH -- drei docs confirm `files` prop for local HDR. Must NOT use `preset` in production (CDN-dependent).

### Pattern 5: WebGL Detection and Graceful Fallback
**What:** Detect WebGL support before mounting Canvas; redirect to 2D tab if unsupported
**When to use:** When user selects 3D tab
**Example:**
```typescript
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

// Alternative: R3F Canvas has a `fallback` prop
<Canvas fallback={<div>WebGL not available</div>}>
```
**Confidence:** HIGH -- MDN-documented approach. R3F's Canvas `fallback` prop provides a built-in mechanism.

### Anti-Patterns to Avoid
- **Mounting Canvas globally and routing contents:** For this project, the 3D viewer is tab-local, not app-global. Mounting a persistent Canvas would waste resources on all other pages. Unmount on tab switch.
- **Using drei Environment presets in production:** Presets fetch from CDN (`polyhaven.com`), which may fail or be slow. Always use local files via `files` prop.
- **Creating geometry inside React components:** Geometry generation should be pure functions in `mesh-builder.ts`, consumed by React components. This follows the project's established pattern (pure computation libraries, no React imports).
- **Animating clip plane position in render loop:** Use R3F's `useFrame` hook for clip plane animation, not `requestAnimationFrame`.
- **Not disposing custom geometries:** Any `LatheGeometry` created with `useMemo` should be disposed in a cleanup effect, or use R3F's automatic disposal (which handles `args`-based geometries).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Camera orbit/zoom/pan | Custom mouse handlers | drei `<OrbitControls>` | Inertia, touch support, edge cases, damping |
| HDR loading + tone mapping | Custom RGBELoader pipeline | drei `<Environment files="...">` | Handles texture encoding, scene.environment, cleanup |
| HTML labels in 3D space | Manual CSS transform tracking | drei `<Html>` | Handles projection, occlusion, z-ordering |
| WebGL detection | Custom canvas probe | R3F Canvas `fallback` prop | Catches context creation failure automatically |
| Code splitting | Manual webpack config | `next/dynamic` with `ssr: false` | Framework-native, handles loading states |
| Geometry disposal | Manual traverse + dispose | R3F automatic disposal on unmount | R3F tracks resources created via JSX |

**Key insight:** R3F and drei already solve the hard problems (context lifecycle, resource disposal, camera controls, HTML-in-3D projection). The phase's unique value is the parametric geometry generation from existing `ProfilePoint[]` data and the cutaway visualization -- focus effort there.

## Common Pitfalls

### Pitfall 1: Stencil Buffer Disabled by Default (three.js >= r163)
**What goes wrong:** Cutaway cross-section caps render everywhere instead of only at the clip boundary, or don't render at all
**Why it happens:** Three.js r163 changed `stencil` default from `true` to `false` for performance. R3F's Canvas creates the renderer with its own defaults, which may or may not include `stencil: true`.
**How to avoid:** Explicitly pass `gl={{ stencil: true }}` to the R3F `<Canvas>` component
**Warning signs:** Cross-section caps visible on unclipped parts of the model, or clip plane cutting geometry but no solid fill visible

### Pitfall 2: LatheGeometry Axis Convention Mismatch
**What goes wrong:** Cartridge renders sideways or inside-out
**Why it happens:** Three.js `LatheGeometry` rotates around the **Y axis**, expecting `Vector2(radial, axial)`. Our `ProfilePoint` uses `{x: axial, y: radial}`. If passed directly without swapping, the geometry revolves around the wrong axis.
**How to avoid:** Map `ProfilePoint` to `Vector2(point.y, point.x)` -- radial becomes Three.js x, axial becomes Three.js y
**Warning signs:** Geometry looks like a flat disc or extends along wrong axis

### Pitfall 3: WebGL Context Limit Exhaustion
**What goes wrong:** Black canvas or "too many active WebGL contexts" after navigating back to the 3D tab multiple times (especially Safari, which limits to ~8-16 contexts)
**Why it happens:** Canvas components not properly unmounted, or multiple Canvas instances created without destroying previous ones
**How to avoid:** Unmount `<Canvas>` when leaving the 3D tab (conditional render, not display:none). R3F calls `forceContextLoss()` on unmount automatically. Use a single Canvas instance with `key` prop to force remount when data changes.
**Warning signs:** Console warning "THREE.WebGLRenderer: Context Lost", black rectangle where canvas should be

### Pitfall 4: Three.js SSR Crash
**What goes wrong:** "window is not defined" or "document is not defined" error during Next.js server-side rendering
**Why it happens:** Three.js accesses browser-only APIs (window, document, WebGL context) at import time
**How to avoid:** All Three.js-dependent components MUST be imported via `next/dynamic` with `ssr: false`. Never import `three` or `@react-three/fiber` in server components or at the top level of pages.
**Warning signs:** Build errors or SSR crashes mentioning `window`, `document`, or `WebGLRenderingContext`

### Pitfall 5: Geometry Re-creation on Every Render
**What goes wrong:** Jank, high GPU memory usage, constant geometry disposal/recreation
**Why it happens:** Creating `new LatheGeometry()` inside render function without memoization
**How to avoid:** Use `useMemo` with proper dependencies (cartridge/bullet data) to create geometries once. Dispose in cleanup when dependencies change.
**Warning signs:** Performance profiler shows continuous geometry allocation, low FPS

### Pitfall 6: HDR Environment Preset CDN Failure in Production
**What goes wrong:** Metallic materials appear black (no reflections) in production
**Why it happens:** drei `<Environment preset="studio">` fetches from `polyhaven.com` CDN, which may be blocked, rate-limited, or slow
**How to avoid:** Download HDR file, place in `public/hdri/`, use `<Environment files="/hdri/studio_small.hdr" />`
**Warning signs:** Materials look completely flat/black, network tab shows failed HDR request

## Code Examples

### Converting ProfilePoint[] to LatheGeometry
```typescript
// Source: Three.js docs (https://threejs.org/docs/pages/LatheGeometry.html)
// + project's geometry/types.ts ProfilePoint interface
import * as THREE from 'three';
import { ProfilePoint } from '@/lib/geometry/types';

/**
 * Convert profile points to Three.js LatheGeometry.
 * LatheGeometry revolves Vector2 points around the Y axis.
 * Our ProfilePoint: x = axial (along barrel), y = radial (from centerline).
 * Three.js Vector2 for lathe: x = radial distance, y = axial position.
 */
export function profileToLatheGeometry(
  points: ProfilePoint[],
  segments: number = 64
): THREE.LatheGeometry {
  const vectors = points.map(p => new THREE.Vector2(p.y, p.x));
  return new THREE.LatheGeometry(vectors, segments);
}

/**
 * Create a half-lathe geometry for cutaway interior visibility.
 * phiLength = PI creates a 180-degree revolution.
 */
export function profileToHalfLatheGeometry(
  points: ProfilePoint[],
  segments: number = 32
): THREE.LatheGeometry {
  const vectors = points.map(p => new THREE.Vector2(p.y, p.x));
  return new THREE.LatheGeometry(vectors, segments, 0, Math.PI);
}
```

### R3F Canvas with Stencil and Dynamic Import
```typescript
// CartridgeViewer3D.tsx
'use client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

export default function CartridgeViewer3D({ cartridge, bullet }: Props) {
  return (
    <Canvas
      gl={{ stencil: true, antialias: true }}
      camera={{ position: [0, 50, 100], fov: 45 }}
      fallback={<div className="text-slate-400 p-8">WebGL no disponible</div>}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />
      <Environment files="/hdri/studio_small.hdr" />
      <OrbitControls enablePan enableZoom enableRotate />
      {/* Scene meshes here */}
    </Canvas>
  );
}

// Dynamic import in DrawingViewer.tsx
import dynamic from 'next/dynamic';
const Viewer3DLazy = dynamic(
  () => import('./viewer3d/CartridgeViewer3D'),
  { ssr: false, loading: () => <Spinner size="lg" /> }
);
```

### PBR Material Definitions
```typescript
// materials.ts (pure -- no React)
export const MATERIALS = {
  brass: { color: '#B5A642', metalness: 0.85, roughness: 0.25 },
  copper: { color: '#B87333', metalness: 0.8, roughness: 0.3 },
  lead: { color: '#4A4A4A', metalness: 0.3, roughness: 0.7 },
  nickel: { color: '#C0C0C0', metalness: 0.9, roughness: 0.15 },
  powder: { color: '#2D2D2D', metalness: 0.0, roughness: 0.95 },
} as const;

export function getBulletMaterial(bulletType: string | null): typeof MATERIALS.copper {
  if (!bulletType) return MATERIALS.copper;
  const bt = bulletType.toLowerCase();
  if (bt.includes('solid') && bt.includes('copper')) return MATERIALS.copper;
  if (bt.includes('hp') || bt.includes('hollow')) return MATERIALS.copper; // jacket visible
  return MATERIALS.copper; // FMJ default
}
```

### drei Html Dimension Labels
```typescript
// Source: drei docs (https://drei.docs.pmnd.rs/misc/html)
import { Html } from '@react-three/drei';

function DimensionLabel({ position, label, value }: LabelProps) {
  return (
    <Html position={position} center distanceFactor={80}>
      <div className="bg-slate-900/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap border border-slate-600">
        {label}: {value.toFixed(2)} mm
      </div>
    </Html>
  );
}
```

### Clipping Plane Animation
```typescript
// Using R3F's useFrame for smooth animation
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

function useCutawayPlane(active: boolean, duration: number = 0.5) {
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 0, -1), 0));
  const targetConstant = active ? 0 : -999; // -999 = fully open (no clipping)

  useFrame((_, delta) => {
    const plane = planeRef.current;
    const speed = 1 / duration;
    plane.constant = THREE.MathUtils.lerp(
      plane.constant,
      targetConstant,
      Math.min(delta * speed * 5, 1)
    );
  });

  return planeRef;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `stencil: true` default | `stencil: false` default | three.js r163 (2024) | Must explicitly enable for cutaway caps |
| drei Environment presets (CDN) | Local HDR files recommended for production | Always true, but commonly overlooked | Presets fail in offline/restricted environments |
| Manual WebGL context cleanup | R3F auto `forceContextLoss()` on unmount | R3F v8+ | Just unmount Canvas; R3F handles cleanup |
| Separate WebGLRenderer creation | R3F Canvas `gl` prop passes options | R3F v8+ | `gl={{ stencil: true }}` is all that's needed |

**Deprecated/outdated:**
- `THREE.Geometry` (removed in r125): Use `THREE.BufferGeometry` only. `LatheGeometry` already returns `BufferGeometry`.
- drei preset CDN for production: Not recommended; use local files.

## Open Questions

1. **Stencil capping in R3F declarative model**
   - What we know: Three.js `webgl_clipping_stencil` example works with imperative API. R3F materials accept stencil props declaratively.
   - What's unclear: Whether the render order guarantees needed for stencil ops (back-face pass, front-face pass, cap pass) work correctly in R3F's declarative scene graph, or if manual render ordering is needed.
   - Recommendation: Start with the simpler approach first -- create explicit inner-wall geometry for the cutaway (no stencil needed). If visual quality is insufficient, implement stencil-based capping as an enhancement. The simpler approach generates two meshes: the outer shell (full lathe, clipped) and an inner shell (offset profile, only visible when cutaway is active).

2. **HDR file size vs quality tradeoff**
   - What we know: Poly Haven offers 1K (~500KB), 2K (~1-2MB), 4K (~4-8MB) studio HDRIs under CC0.
   - What's unclear: Whether 1K resolution provides sufficient reflection quality for the metallic materials at typical viewing distances.
   - Recommendation: Start with 1K (~500KB) for fast loading. If reflections look pixelated on the brass/copper surfaces, upgrade to 2K. Download from Poly Haven's studio category.

3. **Powder fill level visualization**
   - What we know: User wants powder space shown when load data is available, with fill level.
   - What's unclear: Best visual approach -- solid color cylinder at fill height, or gradient, or particle-like texture.
   - Recommendation: Simple cylinder mesh (dark gray, `MATERIALS.powder`) at the correct fill height inside the case. Height = (powder_charge_volume / case_internal_volume) * case_internal_height. This is visually clear and computationally trivial.

## Sources

### Primary (HIGH confidence)
- Three.js LatheGeometry docs: https://threejs.org/docs/pages/LatheGeometry.html -- Constructor, Vector2 array format, segments param
- R3F Canvas API docs: https://r3f.docs.pmnd.rs/api/canvas -- gl prop, camera, fallback, frameloop
- drei Environment docs: https://drei.docs.pmnd.rs/staging/environment -- files prop, presets, background modes
- drei Html docs: https://drei.docs.pmnd.rs/misc/html -- position, center, distanceFactor, occlude
- Three.js webgl_clipping_stencil example: https://threejs.org/examples/webgl_clipping_stencil.html -- Stencil capping pattern
- Three.js r163 release notes: https://github.com/mrdoob/three.js/releases/tag/r163 -- stencil: false breaking change

### Secondary (MEDIUM confidence)
- Three.js forum stencil capping issue (r170): https://discourse.threejs.org/t/clipping-plane-stencil-capping/74018 -- Confirmed stencil: true in constructor fixes r163+ issue
- R3F WebGL context cleanup (GitHub #514): https://github.com/pmndrs/react-three-fiber/issues/514 -- forceContextLoss on unmount behavior
- R3F Safari context limits (Discussion #2457): https://github.com/pmndrs/react-three-fiber/discussions/2457 -- Browser context limits (10-20)
- MDN WebGL detection: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/By_example/Detect_WebGL -- canvas.getContext('webgl2')
- Poly Haven studio HDRIs: https://polyhaven.com/hdris/studio -- CC0 licensed HDR files

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, versions confirmed in package.json and node_modules
- Architecture: HIGH -- follows established project patterns (pure computation libraries, dynamic imports, tab-based navigation)
- Pitfalls: HIGH -- stencil default change verified via official release notes; context lifecycle documented in R3F GitHub
- Cutaway implementation: MEDIUM -- stencil capping in R3F declarative model needs validation; simpler alternative available

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (stable stack, no expected breaking changes)
