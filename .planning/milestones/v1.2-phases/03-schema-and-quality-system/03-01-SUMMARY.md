---
phase: 03-schema-and-quality-system
plan: 01
subsystem: api, database
tags: [alembic, quality-scoring, data-provenance, pydantic-computed-fields, sqlalchemy]

# Dependency graph
requires:
  - phase: 02-extended-simulation-charts
    provides: "Existing powder model with 3-curve columns, solver PowderParams with web_thickness_m"
provides:
  - "Deterministic quality scorer (compute_quality_score) for powder records"
  - "data_source, quality_score, web_thickness_mm columns on powders table"
  - "PowderResponse with quality_level and quality_tooltip computed fields"
  - "Auto-recompute quality_score on create and update"
  - "grt_community -> grt_modified source transition on edit"
  - "Solver reads per-powder web_thickness_mm from DB with 0.0004m fallback"
  - "Alembic migration 005 for new columns"
affects: [03-02, 06-frontend-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure quality scorer function in core/quality.py (no DB, no side effects)"
    - "computed_field avoiding model_dump recursion by building dict from field names"
    - "_make_params returns extra_warnings tuple for per-powder parameter warnings"

key-files:
  created:
    - backend/app/core/quality.py
    - backend/app/db/migrations/versions/005_add_quality_and_web_thickness.py
    - backend/tests/test_quality.py
  modified:
    - backend/app/models/powder.py
    - backend/app/schemas/powder.py
    - backend/app/api/powders.py
    - backend/app/api/simulate.py
    - backend/app/seed/initial_data.py
    - backend/tests/test_api_integration.py

key-decisions:
  - "Quality tooltip computed_field uses manual dict construction instead of model_dump() to avoid infinite recursion"
  - "_make_params returns 6-tuple with extra_warnings instead of modifying result post-hoc at each call site"

patterns-established:
  - "Pure scorer functions in core/ for deterministic business logic"
  - "Extra warnings from _make_params plumbed through all simulation endpoints"

requirements-completed: [PWD-02, PWD-03, PWD-04, QLT-02, QLT-03, SOL-01]

# Metrics
duration: 7min
completed: 2026-02-21
---

# Phase 3 Plan 1: Backend Quality System Summary

**Deterministic quality scorer (30% completeness + 70% source tier), per-powder web_thickness passthrough to solver, and data provenance tracking via Alembic migration 005**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-21T20:52:28Z
- **Completed:** 2026-02-21T20:59:33Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Quality scorer module with 30/70 completeness/source formula: manufacturer with gaps beats complete estimated entry
- PowderResponse returns quality_level (success/warning/danger) and quality_tooltip (one-line summary with score, source, field count, missing fields)
- Auto-recompute quality_score on create_powder, update_powder, and import_grt; grt_community transitions to grt_modified on edit
- Solver reads web_thickness_mm from powder row with 0.0004m fallback and adds Spanish-language warning when using default
- 15 new tests (10 unit + 5 integration), full suite at 270 passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Alembic migration, ORM columns, and quality scorer module** - `f793ee7` (feat)
2. **Task 2: Schemas, CRUD auto-recompute, and solver web_thickness passthrough** - `b1e1fa9` (feat)
3. **Task 3: Quality scoring and solver web_thickness tests** - `bb4d353` (test)

## Files Created/Modified

- `backend/app/core/quality.py` - Pure quality scorer: CRITICAL_FIELDS, BONUS_FIELDS, SOURCE_SCORES, compute_quality_score()
- `backend/app/db/migrations/versions/005_add_quality_and_web_thickness.py` - Alembic migration adding data_source, quality_score, web_thickness_mm
- `backend/app/models/powder.py` - ORM columns for data_source (String, default="manual"), quality_score (Integer, default=0), web_thickness_mm (Float, nullable)
- `backend/app/schemas/powder.py` - PowderCreate/Update with data_source and web_thickness_mm; PowderResponse with quality_level and quality_tooltip computed fields
- `backend/app/api/powders.py` - Auto-compute quality on create/update, grt_community->grt_modified transition, quality scoring on GRT import
- `backend/app/api/simulate.py` - _make_params reads web_thickness_mm from DB with 0.0004m fallback + warning; returns extra_warnings tuple
- `backend/app/seed/initial_data.py` - Seed powders set data_source="manual" and compute quality_score
- `backend/tests/test_quality.py` - 10 unit tests for quality scorer
- `backend/tests/test_api_integration.py` - 5 new integration tests for quality API behavior

## Decisions Made

- **Tooltip computed_field avoids model_dump() recursion**: `quality_tooltip` builds a dict manually from `CRITICAL_FIELDS + BONUS_FIELDS` field names instead of calling `self.model_dump()`, which would trigger infinite recursion through the computed fields.
- **_make_params returns extra_warnings**: Changed return signature to 6-tuple `(powder, bullet, cart, rif, ld, extra_warnings)` so web_thickness default warning propagates cleanly to all simulation endpoints.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed infinite recursion in quality_tooltip computed_field**
- **Found during:** Task 2 (Schemas update)
- **Issue:** `self.model_dump()` inside `quality_tooltip` computed_field triggers serialization of all computed fields, which calls `quality_tooltip` again, causing stack overflow
- **Fix:** Replaced `self.model_dump()` with manual dict construction: `{f: getattr(self, f) for f in CRITICAL_FIELDS + BONUS_FIELDS}`
- **Files modified:** `backend/app/schemas/powder.py`
- **Verification:** All 270 tests pass, no recursion errors
- **Committed in:** `b1e1fa9` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for correctness. No scope creep.

## Issues Encountered

None beyond the recursion fix documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Backend quality system complete: quality_score, data_source, quality_level, quality_tooltip all available via API
- Frontend plan (03-02) can now render quality badges, source labels, and web_thickness input using these API fields
- Solver parameterized per-powder for web_thickness, ready for accuracy improvements when powder data is enriched

## Self-Check: PASSED

All 3 created files verified on disk. All 3 task commits verified in git log.

---
*Phase: 03-schema-and-quality-system*
*Completed: 2026-02-21*
