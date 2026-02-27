---
phase: 11-foundation-and-data-expansion
plan: 01
subsystem: database
tags: [sqlalchemy, pydantic, alembic, typescript, schema-extension]

# Dependency graph
requires:
  - phase: 03-schema-and-quality-system
    provides: quality scoring system with BONUS_FIELDS lists
provides:
  - 9 new Bullet columns (4 rendering + 5 velocity-banded BC)
  - 5 new Cartridge columns (drawing dimensions)
  - Alembic migration 009_schema_extensions
  - Updated quality scoring for new fields
  - Backfilled 53 cartridges with drawing dimension data
  - Updated frontend TypeScript interfaces
affects: [11-02-PLAN, 11-03-PLAN, phase-12, phase-13]

# Tech tracking
tech-stack:
  added: []
  patterns: [String(20) for enum-like fields instead of native ENUM to avoid Alembic complexity]

key-files:
  created:
    - backend/app/db/migrations/versions/009_schema_extensions.py
  modified:
    - backend/app/models/bullet.py
    - backend/app/models/cartridge.py
    - backend/app/schemas/bullet.py
    - backend/app/schemas/cartridge.py
    - backend/app/core/quality.py
    - backend/app/seed/fixtures/cartridges.json
    - frontend/src/lib/types.ts

key-decisions:
  - "Used String(20) for ogive_type and case_type instead of native ENUM to avoid Alembic migration complexity"
  - "Backfilled all 53 cartridges with SAAMI/CIP reference values for drawing dimensions"

patterns-established:
  - "Schema extension pattern: add nullable columns, update schemas with physical limits, create migration, update quality scoring, update frontend types"

requirements-completed: [SCHM-01, SCHM-02]

# Metrics
duration: 5min
completed: 2026-02-27
---

# Phase 11 Plan 01: Schema Extensions Summary

**Extended Bullet (9 cols) and Cartridge (5 cols) schemas with drawing/rendering dimensions and velocity-banded BC fields, backfilled 53 cartridges with SAAMI/CIP reference data**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-27T19:47:36Z
- **Completed:** 2026-02-27T19:52:26Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Added 9 new columns to Bullet model: bearing_surface_mm, boat_tail_length_mm, meplat_diameter_mm, ogive_type (rendering) + bc_g1_high, bc_g1_mid, bc_g1_low, bc_g1_high_vel, bc_g1_mid_vel (velocity-banded BC)
- Added 5 new columns to Cartridge model: shoulder_angle_deg, neck_length_mm, body_length_mm, rim_thickness_mm, case_type
- Backfilled all 53 cartridge fixture records with realistic SAAMI/CIP reference values
- All 325 existing tests pass with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema extensions -- models, schemas, migration, quality, frontend types** - `5df8985` (feat)
2. **Task 2: Backfill cartridges.json with new drawing fields** - `9d01467` (feat)

## Files Created/Modified
- `backend/app/models/bullet.py` - Added 9 new nullable columns (4 rendering + 5 velocity-banded BC)
- `backend/app/models/cartridge.py` - Added 5 new nullable columns (drawing dimensions)
- `backend/app/schemas/bullet.py` - Added 9 new fields to BulletCreate/Update/Response with physical limit validation
- `backend/app/schemas/cartridge.py` - Added 5 new fields to CartridgeCreate/Update/Response with physical limit validation
- `backend/app/core/quality.py` - Updated BULLET_BONUS_FIELDS (+9) and CARTRIDGE_BONUS_FIELDS (+5)
- `backend/app/db/migrations/versions/009_schema_extensions.py` - Alembic migration for 14 new columns
- `backend/app/seed/fixtures/cartridges.json` - Backfilled 53 cartridges with 5 new fields
- `frontend/src/lib/types.ts` - Updated Bullet (9 fields) and Cartridge (5 fields) interfaces

## Decisions Made
- Used String(20) for ogive_type and case_type columns instead of native PostgreSQL ENUM types, to avoid Alembic migration complexity (per research decision)
- Backfilled all 53 cartridges with estimated/reference values from SAAMI/CIP specs; case type distribution: 41 rimless, 6 belted, 4 rebated, 1 rimmed, 1 semi-rimmed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Schema foundation is ready for geometry engine (11-03-PLAN, SCHM-03)
- Drawing dimension fields enable 2D SVG drawings (Phase 12) and 3D viewer (Phase 13)
- Velocity-banded BC fields ready for expanded bullet database (DATA-01)

---
*Phase: 11-foundation-and-data-expansion*
*Completed: 2026-02-27*
