---
phase: 11-foundation-and-data-expansion
plan: 02
subsystem: ui
tags: [three.js, react-three-fiber, geometry, svg, typescript, cartridge, bullet, ogive]

# Dependency graph
requires:
  - phase: none
    provides: "Standalone geometry library, no prior phase dependencies"
provides:
  - "ProfilePoint and GeometryResult type interfaces for 2D/3D consumers"
  - "generateCartridgeProfile function (SVG + LatheGeometry points)"
  - "generateBulletProfile function with 6 ogive types"
  - "7 heuristic estimation functions for missing dimensions"
  - "React Three Fiber v8, drei v9, Three.js 0.170 npm dependencies"
affects: [12-2d-svg-drawings, 13-3d-viewer]

# Tech tracking
tech-stack:
  added: [three.js 0.170, "@react-three/fiber 8", "@react-three/drei 9", "@types/three 0.170"]
  patterns: [dual-output-geometry, estimation-transparency, ogive-type-dispatch]

key-files:
  created:
    - frontend/src/lib/geometry/types.ts
    - frontend/src/lib/geometry/estimation.ts
    - frontend/src/lib/geometry/cartridge-geometry.ts
    - frontend/src/lib/geometry/bullet-geometry.ts
  modified:
    - frontend/package.json
    - frontend/package-lock.json

key-decisions:
  - "Bezier curves (Q/C SVG commands) for ogive sections instead of linear segments"
  - "16-sample discrete points for LatheGeometry ogive (smooth enough for 3D)"
  - "Boat tail base = 85% of body diameter when BT length known but base diameter not specified"
  - "Meplat default = 6% of body diameter for pointed bullets"
  - "Completeness threshold: 0 estimated=full, 1-3=basic, 4+=insufficient"

patterns-established:
  - "Dual output pattern: every geometry function returns both SVG path string and ProfilePoint[] array"
  - "Estimation transparency: estimatedFields array tracks which dimensions were heuristically derived"
  - "Pure geometry module: zero React/Three.js imports, pure TypeScript data producers"
  - "Ogive type dispatch: switch statement on normalized ogive type for both SVG and profile generation"

requirements-completed: [SCHM-03]

# Metrics
duration: 5min
completed: 2026-02-27
---

# Phase 11 Plan 02: Geometry Engine Summary

**Dual-output geometry engine with type-aware ogive profiles, heuristic estimation fallbacks, and R3F/Three.js npm dependencies installed**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-27T19:47:36Z
- **Completed:** 2026-02-27T19:52:03Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created shared geometry type system (ProfilePoint, GeometryResult, CartridgeDimensions, BulletDimensions) consumed by both 2D SVG and 3D viewer phases
- Implemented 7 pure heuristic estimation functions for graceful degradation when DB fields are null
- Built cartridge profile generator supporting bottleneck and straight-wall case types with shoulder taper geometry
- Built bullet profile generator with 6 ogive types using bezier curves for SVG and 16-sample discrete points for LatheGeometry
- Installed React Three Fiber v8, drei v9, Three.js 0.170, and TypeScript types

## Task Commits

Each task was committed atomically:

1. **Task 1: Install npm dependencies and create geometry type definitions** - `5f1f16b` (feat)
2. **Task 2: Implement cartridge and bullet geometry profile generators** - `faf9d73` (feat)

## Files Created/Modified
- `frontend/src/lib/geometry/types.ts` - ProfilePoint, GeometryResult, CartridgeDimensions, BulletDimensions interfaces
- `frontend/src/lib/geometry/estimation.ts` - 7 heuristic estimation functions (shoulder angle, neck/body length, rim thickness, bullet length, bearing surface, boat tail)
- `frontend/src/lib/geometry/cartridge-geometry.ts` - generateCartridgeProfile with bottleneck/straight-wall support
- `frontend/src/lib/geometry/bullet-geometry.ts` - generateBulletProfile with 6 ogive types (tangent, secant, hybrid, flat_nose, round_nose, spitzer)
- `frontend/package.json` - Added three, @react-three/fiber, @react-three/drei, @types/three
- `frontend/package-lock.json` - Lock file updated with 71 new packages

## Decisions Made
- Used bezier curves (SVG Q and C commands) for ogive sections rather than linear segments -- produces smooth curves that match real bullet profiles
- Set 16 discrete sample points for LatheGeometry ogive generation -- sufficient smoothness for 3D revolution without excessive vertex count
- Boat tail base diameter defaults to 85% of body diameter when not specified (common BT geometry ratio)
- Default meplat at 6% of body diameter for pointed bullets (even "pointed" bullets have a small flat tip)
- Completeness classification: 0 estimated fields = full, 1-3 = basic, 4+ = insufficient

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Geometry engine is complete and ready for consumption by Phase 12 (2D SVG drawings) and Phase 13 (3D viewer)
- Three.js Vector2 type available for type-safe geometry conversion in 3D consumers
- All estimation functions are pure and tested via TypeScript compilation
- The estimatedFields/dataCompleteness system enables consumers to render estimated dimensions differently (dashed/transparent)

## Self-Check: PASSED

- All 4 geometry files exist on disk
- Both task commits verified (5f1f16b, faf9d73)
- TypeScript compilation clean (full project `tsc --noEmit`)
- Zero React/Three.js imports in geometry module

---
*Phase: 11-foundation-and-data-expansion*
*Completed: 2026-02-27*
