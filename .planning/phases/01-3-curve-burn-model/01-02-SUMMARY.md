---
phase: 01-3-curve-burn-model
plan: 02
subsystem: database-api-ui
tags: [powder-model, 3-curve, grt-import, alembic-migration, pydantic-schema, frontend-badges]

# Dependency graph
requires:
  - "01-01: 3-curve form function + dual-mode solver (PowderParams with ba/bp/br/brp/z1/z2)"
provides:
  - "7 nullable Float columns on powders table for GRT 3-curve parameters"
  - "PowderResponse.has_3curve computed field for UI display"
  - "GRT converter populates first-class 3-curve DB columns"
  - "Simulation API reads 3-curve columns and passes to PowderParams"
  - "Overwrite mode for GRT import endpoint"
  - "3C/2C badge on powders table"
  - "Collapsible advanced parameter section in powder create/edit form"
  - "Collision dialog with skip/overwrite batch actions on GRT import"
affects: [01-03-PLAN, validation, frontend-powders, grt-import]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pydantic computed_field for derived boolean from nullable columns"
    - "Collapsible form sections with state toggle for advanced parameters"
    - "Two-pass import with overwrite query parameter for collision handling"

key-files:
  created:
    - "backend/app/db/migrations/versions/004_add_3curve_columns.py"
  modified:
    - "backend/app/models/powder.py"
    - "backend/app/schemas/powder.py"
    - "backend/app/core/grt_converter.py"
    - "backend/app/api/simulate.py"
    - "backend/app/api/powders.py"
    - "backend/app/core/solver.py"
    - "backend/tests/test_schema_validation.py"
    - "backend/tests/test_api_integration.py"
    - "frontend/src/lib/types.ts"
    - "frontend/src/lib/api.ts"
    - "frontend/src/app/powders/page.tsx"

key-decisions:
  - "Used Pydantic computed_field for has_3curve instead of model validator (cleaner, immutable)"
  - "GRT import overwrite uses query parameter ?overwrite=true rather than separate endpoint (simpler API surface)"
  - "Collision dialog batches operations with 'Omitir todos' / 'Sobrescribir todos' rather than per-powder checkboxes (simpler UX per research pitfall guidance)"
  - "a0 field included in model but not required for has_3curve (only 6 core params: ba/bp/br/brp/z1/z2)"

patterns-established:
  - "Nullable columns for optional GRT data with computed boolean for UI dispatch"
  - "Import endpoint with overwrite query parameter for collision handling"
  - "Collapsible advanced form sections with warning banners"

requirements-completed: [SIM-02]

# Metrics
duration: 6min
completed: 2026-02-21
---

# Phase 1 Plan 02: 3-Curve DB Columns, API Wiring, and Frontend Powder UI Summary

**Full-stack 3-curve GRT parameter support: 7 DB columns with migration, schema validation with physical bounds, GRT converter populating first-class fields, simulation API wiring, and frontend with 3C/2C badges, collapsible advanced section, and import collision dialog**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-21T08:30:50Z
- **Completed:** 2026-02-21T08:36:35Z
- **Tasks:** 2
- **Files modified:** 12 (1 created, 11 modified)

## Accomplishments
- Extended Powder model with 7 nullable Float columns (ba, bp, br, brp, z1, z2, a0) and created Alembic migration 004
- Added schema validation for all 3-curve fields with physical bounds (e.g., z1/z2 in [0.01, 0.99]) and computed has_3curve property on PowderResponse
- Updated GRT converter to populate first-class 3-curve DB columns alongside grt_params JSON blob
- Wired 3-curve fields through simulation API (_make_params and simulate_from_db) to PowderParams for solver dispatch
- Added overwrite support to GRT import endpoint with ?overwrite=true query parameter
- Built frontend with 3C (green) / 2C (gray) badges, collapsible advanced parameter section with warning, and import collision dialog
- Added 7 new tests (5 schema validation + 2 API integration), total suite: 227 tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend -- DB migration, model, schema, converter, API wiring** - `011306f` (feat)
2. **Task 2: Frontend -- 3C/2C badges, collapsible GRT section, collision dialog** - `34f8a49` (feat)

## Files Created/Modified
- `backend/app/db/migrations/versions/004_add_3curve_columns.py` - Alembic migration adding 7 columns to powders table
- `backend/app/models/powder.py` - Added 7 nullable Float columns for GRT 3-curve parameters
- `backend/app/schemas/powder.py` - Added 3-curve fields to Create/Update/Response schemas with physical bounds + has_3curve computed field
- `backend/app/core/grt_converter.py` - Populates first-class ba/bp/br/brp/z1/z2/a0 fields from GRT data
- `backend/app/api/simulate.py` - _make_params passes 3-curve fields from DB to PowderParams
- `backend/app/api/powders.py` - Import endpoint supports overwrite=True for collision handling
- `backend/app/core/solver.py` - simulate_from_db passes 3-curve fields to PowderParams
- `backend/tests/test_schema_validation.py` - 5 new tests for 3-curve schema fields
- `backend/tests/test_api_integration.py` - 2 new tests for 3-curve powder CRUD and simulation
- `frontend/src/lib/types.ts` - Added 3-curve fields to Powder and PowderCreate interfaces
- `frontend/src/lib/api.ts` - Updated importGrtPowders to support overwrite parameter
- `frontend/src/app/powders/page.tsx` - 3C/2C badges, collapsible advanced section, collision dialog

## Decisions Made
- Used Pydantic `@computed_field` for `has_3curve` (clean property-based approach, requires all 6 core params non-None)
- GRT import overwrite via query parameter `?overwrite=true` rather than a separate endpoint (simpler, RESTful)
- Collision dialog uses batch "Omitir todos" / "Sobrescribir todos" buttons (simpler UX, per research guidance)
- `a0` field stored in DB but not required for `has_3curve` activation (consistent with solver's 6-param requirement)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Full-stack 3-curve support complete: DB model -> schema -> converter -> API -> solver -> frontend
- Plan 03 (validation fixture) can now test both 2-curve and 3-curve paths with real powder data from the database
- Existing 2-curve powders continue to work with null 3-curve columns (graceful fallback verified by tests)

## Self-Check: PASSED

- Migration file exists: backend/app/db/migrations/versions/004_add_3curve_columns.py
- Both commits found: 011306f, 34f8a49
- 7 nullable columns in powder model: ba, bp, br, brp, z1, z2, a0
- has_3curve computed field in PowderResponse
- GRT converter outputs first-class 3-curve fields
- Simulation API passes 3-curve fields to PowderParams
- Frontend shows 3C/2C badges
- Collapsible advanced section with warning
- Import collision dialog with overwrite support
- All 227 tests pass, 0 failures
- TypeScript compiles with zero errors

---
*Phase: 01-3-curve-burn-model*
*Completed: 2026-02-21*
