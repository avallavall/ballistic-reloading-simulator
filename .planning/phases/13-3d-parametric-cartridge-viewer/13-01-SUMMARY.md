---
phase: 13-3d-parametric-cartridge-viewer
plan: 01
subsystem: ui
tags: [three.js, pbr, lathe-geometry, hdr, 3d]

# Dependency graph
requires:
  - phase: 12-2d-svg-technical-drawings
    provides: ProfilePoint[] geometry engine and pure computation library pattern
provides:
  - ProfilePoint[] to Three.js LatheGeometry conversion (full + half revolution)
  - PBR material parameter definitions for brass, copper, lead, nickel, powder
  - getBulletMaterials for bullet-type-aware jacket/core material selection
  - Primer and powder fill cylinder geometries
  - Local HDR environment map for metallic reflections
affects: [13-02, 13-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [pure-computation-mesh-builder, pbr-material-params-not-instances]

key-files:
  created:
    - frontend/src/lib/geometry/mesh-builder.ts
    - frontend/src/lib/geometry/materials.ts
    - frontend/public/hdri/studio_small.hdr
  modified: []

key-decisions:
  - "MaterialParams are plain objects, not Three.js instances -- material creation deferred to R3F Canvas context"
  - "64 segments for full LatheGeometry, 32 for half -- balance between smoothness and polygon count"
  - "Poly Haven studio_small_09 1K HDR (CC0) stored locally to avoid CDN dependency"

patterns-established:
  - "PBR material params as plain data objects consumed by React components (parallels pure SVG computation pattern)"
  - "Axis mapping convention: ProfilePoint.y (radial) -> Vector2.x, ProfilePoint.x (axial) -> Vector2.y"

requirements-completed: [VIS3-01]

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 13 Plan 01: Mesh Builder and PBR Materials Summary

**LatheGeometry converters for ProfilePoint[] arrays with PBR material definitions for brass/copper/lead/nickel and studio HDR environment map**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T19:49:32Z
- **Completed:** 2026-02-28T19:51:18Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments
- Pure computation mesh-builder.ts with 4 exported geometry functions (profileToLatheGeometry, profileToHalfLatheGeometry, createPrimerGeometry, createPowderFillGeometry)
- PBR material parameter library with 5 material presets and bullet-type-aware material selection
- Local 1.5MB studio HDR environment map from Poly Haven (CC0 license) for metallic reflections

## Task Commits

Each task was committed atomically:

1. **Task 1: Create mesh-builder.ts and materials.ts** - `bcb1642` (feat)
2. **Task 2: Download HDR environment map** - `ca5bb04` (chore)

## Files Created/Modified
- `frontend/src/lib/geometry/mesh-builder.ts` - ProfilePoint[] to Three.js LatheGeometry conversion with correct axis mapping
- `frontend/src/lib/geometry/materials.ts` - PBR MaterialParams for brass, copper, lead, nickel, powder + getBulletMaterials + CUTAWAY_COLORS
- `frontend/public/hdri/studio_small.hdr` - 1K studio HDRI from Poly Haven for drei Environment component

## Decisions Made
- MaterialParams are plain parameter objects, NOT Three.js MeshStandardMaterial instances. Actual material creation must happen inside the R3F Canvas context in React components. This follows the project's established pattern of pure computation libraries.
- 64 segments for full revolution, 32 for half revolution -- provides smooth metallic surfaces without excessive polygon count.
- Used Poly Haven studio_small_09 1K HDR (CC0 license) stored as a local file to avoid runtime CDN dependency, as recommended by research.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- mesh-builder.ts and materials.ts ready for consumption by Plan 02 (CartridgeScene3D React component)
- HDR file available at /hdri/studio_small.hdr for drei Environment component
- All existing TypeScript compilation passes with zero errors

## Self-Check: PASSED

All 3 created files verified on disk. Both commit hashes (bcb1642, ca5bb04) confirmed in git log.

---
*Phase: 13-3d-parametric-cartridge-viewer*
*Completed: 2026-02-28*
