---
phase: 05-import-pipelines-and-fixture-data
plan: 01
subsystem: database
tags: [alembic, sqlalchemy, pydantic, migration, import-pipeline]

# Dependency graph
requires:
  - phase: 04-search-and-pagination
    provides: "Quality scoring, caliber_family, pg_trgm indexes, paginated responses"
provides:
  - "Migration 007 with 11 column changes across powders/bullets/cartridges"
  - "ImportMode enum (skip/overwrite/merge) for collision handling"
  - "ImportResult base schema for batch import results"
  - "BulletImportRequest and CartridgeImportRequest schemas"
  - "Powder alias_group for cross-market powder linking"
  - "Bullet model_number, bullet_type, base_type for manufacturer data"
  - "Cartridge parent_cartridge_name + 4 extended dimension columns"
  - "Expanded quality scoring bonus fields for bullets (5) and cartridges (8)"
affects: [05-02-fixture-data, 05-03-import-endpoints]

# Tech tracking
tech-stack:
  added: []
  patterns: [import-mode-collision-handling, nullable-for-incomplete-imports]

key-files:
  created:
    - backend/app/db/migrations/versions/007_import_pipelines.py
  modified:
    - backend/app/models/powder.py
    - backend/app/models/bullet.py
    - backend/app/models/cartridge.py
    - backend/app/schemas/powder.py
    - backend/app/schemas/bullet.py
    - backend/app/schemas/cartridge.py
    - backend/app/core/quality.py

key-decisions:
  - "ImportMode enum and ImportResult defined in schemas/powder.py as shared import infrastructure"
  - "Bullet length_mm changed to nullable to support incomplete import data"
  - "GrtImportResult extended with updated list and mode field for overwrite/merge support"

patterns-established:
  - "Import collision handling: ImportMode enum with skip/overwrite/merge strategies"
  - "Nullable fields for incomplete imported data (length_mm pattern)"
  - "Extended dimension columns for cartridge lineage tracking"

requirements-completed: [PWD-05, BUL-02, BUL-03, CRT-02]

# Metrics
duration: 4min
completed: 2026-02-22
---

# Phase 05 Plan 01: Schema Foundation Summary

**Alembic migration 007 with 11 new columns, ImportMode/ImportResult shared schemas, and expanded quality scoring for import pipeline infrastructure**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-22T09:58:32Z
- **Completed:** 2026-02-22T10:02:21Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Created Alembic migration 007 adding 11 column changes: powder alias_group, bullet model_number/bullet_type/base_type + nullable length_mm, cartridge parent_cartridge_name + 4 extended dimensions
- Added ImportMode enum (skip/overwrite/merge) and ImportResult base schema as shared import infrastructure
- Expanded quality scoring bonus fields: bullets from 2 to 5, cartridges from 3 to 8
- All 292 existing tests continue to pass with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Alembic migration 007 and update ORM models** - `5c38b73` (feat)
2. **Task 2: Update Pydantic schemas and quality scoring for new fields** - `6a3af96` (feat)

## Files Created/Modified
- `backend/app/db/migrations/versions/007_import_pipelines.py` - Migration adding 11 columns across 3 tables with full downgrade support
- `backend/app/models/powder.py` - Added alias_group column with index
- `backend/app/models/bullet.py` - Added model_number, bullet_type, base_type; changed length_mm to nullable
- `backend/app/models/cartridge.py` - Added parent_cartridge_name and 4 extended dimension columns
- `backend/app/schemas/powder.py` - Added ImportMode enum, ImportResult base schema, alias_group in Create/Update/Response, updated GrtImportResult
- `backend/app/schemas/bullet.py` - Added 3 new fields, nullable length_mm, BulletImportRequest
- `backend/app/schemas/cartridge.py` - Added 5 new fields, CartridgeImportRequest
- `backend/app/core/quality.py` - Expanded BULLET_BONUS_FIELDS (5 entries) and CARTRIDGE_BONUS_FIELDS (8 entries)

## Decisions Made
- ImportMode enum and ImportResult placed in schemas/powder.py as the shared import infrastructure module (will be imported by other modules in Plan 03)
- GrtImportResult extended with `updated` list and `mode` field for backward compatibility with existing GRT import while supporting new overwrite/merge modes
- Bullet length_mm changed to nullable in both ORM and schema to support incomplete manufacturer data during batch imports

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All database columns and schemas ready for fixture data loading (Plan 02)
- ImportMode and ImportResult schemas ready for import endpoints (Plan 03)
- Quality scoring automatically handles new bonus fields through existing 30/70 formula

## Self-Check: PASSED

All 8 files verified present. Both task commits (5c38b73, 6a3af96) verified in git log. 292 tests passing.

---
*Phase: 05-import-pipelines-and-fixture-data*
*Completed: 2026-02-22*
