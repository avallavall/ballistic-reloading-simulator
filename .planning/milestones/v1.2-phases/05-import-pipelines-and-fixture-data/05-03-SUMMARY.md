---
phase: 05-import-pipelines-and-fixture-data
plan: 03
subsystem: api
tags: [fastapi, import-pipeline, seed-data, collision-handling, batch-import, quality-scoring]

# Dependency graph
requires:
  - phase: 05-01
    provides: "ImportMode enum, ImportResult schema, BulletImportRequest, CartridgeImportRequest, alias_group column"
  - phase: 05-02
    provides: "208 powders, 127 bullets, 53 cartridges, 11 alias groups as JSON fixtures"
provides:
  - "Fixture-based seed loader with quality scoring and alias group application"
  - "3-mode GRT import endpoint (skip/overwrite/merge) with user-record protection"
  - "POST /bullets/import batch endpoint with 3-mode collision handling"
  - "POST /cartridges/import batch endpoint with 3-mode collision handling"
  - "GET /powders/{id}/aliases endpoint for alias group lookup"
  - "25 import pipeline tests covering all endpoints and seed loading"
affects: [06-01]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fixture-based seed loading: _load_fixture() reads JSON from backend/app/seed/fixtures/"
    - "3-mode collision handling: ImportMode enum with skip/overwrite/merge strategies"
    - "User-record protection: data_source='manual' records never overwritten in any import mode"

key-files:
  created:
    - backend/tests/test_import_pipelines.py
  modified:
    - backend/app/seed/initial_data.py
    - backend/app/api/powders.py
    - backend/app/api/bullets.py
    - backend/app/api/cartridges.py

key-decisions:
  - "Seed loader uses _load_fixture() helper with FIXTURES_DIR relative path for JSON loading"
  - "GRT import creates renamed copy '(GRT Import)' suffix when colliding with manual records"
  - "Bullet/cartridge import creates renamed copy '(Import)' suffix for manual record collision"
  - "RIFLES remain inline in seed file (only 5 records, tied to cartridge_name FK references)"
  - "Skip mode tests create records with non-manual data_source to correctly test skip behavior"

patterns-established:
  - "Batch import endpoints positioned BEFORE /{id} routes to avoid FastAPI UUID path conflicts"
  - "Import endpoints return ImportResult schema with created/updated/skipped/errors counts"
  - "Quality scores recomputed on both new and updated records during import"

requirements-completed: [PWD-01, PWD-05, BUL-04, CRT-03]

# Metrics
duration: 7min
completed: 2026-02-22
---

# Phase 5 Plan 3: Import Pipelines and Seed Refactoring Summary

**Fixture-based seed loader, 3-mode batch import endpoints for powders/bullets/cartridges, alias lookup endpoint, and 25 new tests with 317 total passing**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-22T10:13:15Z
- **Completed:** 2026-02-22T10:20:20Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Refactored seed system from inline Python dicts to JSON fixture loading via `_load_fixture()`, computing quality scores, caliber families, and applying alias groups on first boot
- Upgraded GRT powder import from simple `overwrite: bool` to 3-mode `ImportMode` (skip/overwrite/merge) with user-record protection ensuring manual records are never overwritten
- Added POST /bullets/import and POST /cartridges/import batch endpoints with identical 3-mode collision handling pattern
- Added GET /powders/{id}/aliases endpoint returning linked powders by alias_group
- Created 25 comprehensive tests covering fixture validity, import modes, user-record protection, alias endpoint, seed integration, quality scoring, and idempotency
- Total test suite: 317 tests passing, zero failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor seed system and upgrade powder import endpoint** - `599c9c7` (feat)
2. **Task 2: Add batch import endpoints for bullets and cartridges** - `80d3302` (feat)
3. **Task 3: Add comprehensive tests for import pipelines** - `b09036b` (test)

## Files Created/Modified
- `backend/app/seed/initial_data.py` - Fixture-based seed loader with `_load_fixture()`, quality scoring, alias group application, caliber family derivation
- `backend/app/api/powders.py` - 3-mode GRT import (skip/overwrite/merge), user-record protection, GET /powders/{id}/aliases endpoint
- `backend/app/api/bullets.py` - POST /bullets/import with 3-mode collision handling, quality scoring, caliber family derivation
- `backend/app/api/cartridges.py` - POST /cartridges/import with 3-mode collision handling, quality scoring, caliber family derivation
- `backend/tests/test_import_pipelines.py` - 25 tests: fixture validity (7), powder import/aliases (4), bullet import (5), cartridge import (4), seed integration (5)

## Decisions Made
- Seed loader uses `_load_fixture()` helper reading from `FIXTURES_DIR = Path(__file__).parent / "fixtures"` for reliable path resolution
- GRT import collision with manual records creates renamed copy with " (GRT Import)" suffix instead of skipping or overwriting
- Bullet/cartridge import collision with manual records creates renamed copy with " (Import)" suffix
- RIFLES kept inline (only 5 records referencing cartridge names via FK) -- fixtures are only for bulk entity data
- Skip mode tests explicitly set `data_source="manufacturer"` or `data_source="saami"` on pre-existing records to correctly test skip behavior (since POST creates records with default `data_source="manual"` which triggers protection instead)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed skip mode tests assuming non-manual data_source**
- **Found during:** Task 3 (test execution)
- **Issue:** Tests created bullets/cartridges via POST which defaults to `data_source="manual"`, but skip mode doesn't apply to manual records (they trigger user-record protection instead)
- **Fix:** Changed test setup to explicitly set `data_source="manufacturer"` or `data_source="saami"` on pre-existing records
- **Files modified:** backend/tests/test_import_pipelines.py
- **Verification:** All 25 tests passing
- **Committed in:** b09036b (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test logic fix only; no code changes to production files. User-record protection works correctly by design.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 5 objectives complete: schema foundation, fixture data, import endpoints, seed refactoring
- 208 powders, 127 bullets, 53 cartridges loaded from fixtures on first boot with quality scoring
- 3 batch import endpoints ready for future data expansion
- Alias group lookup endpoint supports powder cross-market linking in UI
- 317 total tests passing across entire test suite

## Self-Check: PASSED

All 5 files verified present. All 3 task commits (599c9c7, 80d3302, b09036b) verified in git log. 317 tests passing.

---
*Phase: 05-import-pipelines-and-fixture-data*
*Completed: 2026-02-22*
