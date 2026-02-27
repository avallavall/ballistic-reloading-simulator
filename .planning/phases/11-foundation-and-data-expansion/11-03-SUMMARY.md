---
phase: 11-foundation-and-data-expansion
plan: 03
subsystem: database
tags: [seed-data, bullets, json-fixtures, manufacturer-data, quality-scoring]

# Dependency graph
requires:
  - phase: 11-01
    provides: "Schema extensions (rendering fields, velocity-banded BC fields, drawing dimensions)"
provides:
  - "506 bullet seed data across 7 manufacturer JSON files"
  - "Per-manufacturer bullet loading with count-based threshold protection"
  - "19 new tests (9 seed data, 6 schema validation, 4 API integration)"
affects: [14-browser-upload-caliber-search, 12-2d-svg-drawings]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Per-manufacturer JSON fixtures in bullets/ subdirectory", "Count-based seed threshold (<=127 replace, 128-400 preserve, >400 skip)"]

key-files:
  created:
    - "backend/app/seed/fixtures/bullets/sierra.json"
    - "backend/app/seed/fixtures/bullets/hornady.json"
    - "backend/app/seed/fixtures/bullets/berger.json"
    - "backend/app/seed/fixtures/bullets/nosler.json"
    - "backend/app/seed/fixtures/bullets/lapua.json"
    - "backend/app/seed/fixtures/bullets/barnes.json"
    - "backend/app/seed/fixtures/bullets/speer.json"
    - "backend/tests/test_seed_data.py"
  modified:
    - "backend/app/seed/initial_data.py"
    - "backend/tests/test_schema_validation.py"
    - "backend/tests/test_api_integration.py"
    - "backend/tests/test_import_pipelines.py"

key-decisions:
  - "506 bullets across 7 manufacturers with match bullets prioritized"
  - "Sierra bullets use velocity-banded BCs (bc_g1_high/mid/low with 2800/1800 fps thresholds)"
  - "Barnes all solid_copper material; other manufacturers use lead_core"
  - "Count-based threshold protects user data: <=127 replace, 128-400 preserve, >400 skip"
  - "Fallback to legacy bullets.json when manufacturer directory absent"

patterns-established:
  - "Per-manufacturer fixture organization: fixtures/bullets/{manufacturer}.json"
  - "BULLET_MANUFACTURERS constant drives both loading and testing"

requirements-completed: [DATA-01]

# Metrics
duration: 15min
completed: 2026-02-27
---

# Phase 11 Plan 03: Bullet Seed Data Expansion Summary

**506 bullets across 7 manufacturer JSON files with per-manufacturer seed loading, count-based threshold protection, and 19 new tests (344 total passing)**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-02-27
- **Tasks:** 2/2
- **Files created:** 8
- **Files modified:** 4

## Accomplishments
- Created 506 bullet seed data entries covering Sierra (98), Hornady (92), Berger (69), Nosler (82), Lapua (55), Barnes (54), Speer (56)
- Sierra bullets have full velocity-banded BCs (bc_g1_high, bc_g1_mid, bc_g1_low with velocity thresholds)
- Barnes bullets correctly marked as solid_copper (monolithic)
- All 506 names unique, all required fields present, quality scores computable
- Updated seed loader with BULLET_MANUFACTURERS list, _seed_bullets() function, and count-based threshold
- Added 19 new tests: 9 seed data integrity, 6 schema validation (SCHM-01/SCHM-02), 4 API integration
- Full test suite: 344 tests, 0 failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 506 bullet seed data across 7 manufacturer JSON files** - `b7654ec` (feat)
2. **Task 2: Update seed loader + add tests for schema extensions and seed data** - `6e06176` (feat)

## Files Created/Modified
- `backend/app/seed/fixtures/bullets/sierra.json` - 98 Sierra bullets with velocity-banded BCs
- `backend/app/seed/fixtures/bullets/hornady.json` - 92 Hornady bullets (ELD-M, ELD-X, V-MAX, SST, A-TIP, GMX, InterLock)
- `backend/app/seed/fixtures/bullets/berger.json` - 69 Berger bullets with bearing surface and boat tail dimensions
- `backend/app/seed/fixtures/bullets/nosler.json` - 82 Nosler bullets (CC, RDF, AccuBond, Partition, Ballistic Tip, E-Tip)
- `backend/app/seed/fixtures/bullets/lapua.json` - 55 Lapua bullets (Scenar, Scenar-L, Lock Base, Mega, Naturalis)
- `backend/app/seed/fixtures/bullets/barnes.json` - 54 Barnes bullets (all solid_copper monolithic)
- `backend/app/seed/fixtures/bullets/speer.json` - 56 Speer bullets (Gold Dot, TMJ, Hot-Cor, Grand Slam, TNT)
- `backend/app/seed/initial_data.py` - Updated seed loader with BULLET_MANUFACTURERS and _seed_bullets()
- `backend/tests/test_seed_data.py` - 9 tests for seed data integrity
- `backend/tests/test_schema_validation.py` - +6 tests for SCHM-01/SCHM-02 field validation
- `backend/tests/test_api_integration.py` - +4 tests for schema extension CRUD
- `backend/tests/test_import_pipelines.py` - Fixed bullet count assertion for manufacturer-based loading

## Decisions Made
- Match bullets prioritized (Sierra MatchKing, Berger Hybrid/Target, Hornady ELD-M, Lapua Scenar)
- Popular discontinued bullets included (Sierra 168gr HPBT #2200 as "Sierra 168gr HPBT MK .308 (Disc.)")
- bc_g7 left null when manufacturer does not publish it (no estimation from G1)
- All Sierra velocity bands use 2800 fps (high threshold) and 1800 fps (mid threshold)
- Berger bullets include bearing_surface_mm and boat_tail_length_mm from manufacturer data
- ogive_type uses practical values: "secant", "tangent", "hybrid" (no "round_nose" or "spitzer" in final data)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed material values across all manufacturer files**
- **Found during:** Task 1
- **Issue:** Original bullet data used "copper" as material value, but the valid values are "lead_core" and "solid_copper"
- **Fix:** Corrected all non-Barnes bullets to "lead_core" and Barnes to "solid_copper"
- **Files modified:** All 7 manufacturer JSON files
- **Committed in:** b7654ec

**2. [Rule 1 - Bug] Fixed duplicate bullet names across files**
- **Found during:** Task 1
- **Issue:** 36 duplicate names found when adding extra bullets (e.g., "Berger 70gr VLD Target .224" existed in original and extras)
- **Fix:** Removed duplicates keeping the first occurrence, then added unique replacements
- **Files modified:** All 7 manufacturer JSON files
- **Committed in:** b7654ec

**3. [Rule 1 - Bug] Fixed test_import_pipelines.py bullet count assertion**
- **Found during:** Task 2
- **Issue:** test_seed_initial_data_loads_fixtures compared DB bullet count against bullets.json (127), but seed loader now loads 506 from manufacturer files
- **Fix:** Updated test to sum counts from BULLET_MANUFACTURERS files instead of legacy bullets.json
- **Files modified:** backend/tests/test_import_pipelines.py
- **Committed in:** 6e06176

---

**Total deviations:** 3 auto-fixed (3 Rule 1 bugs)
**Impact on plan:** All auto-fixes necessary for data correctness and test consistency. No scope creep.

## Issues Encountered
- Initial bullet creation produced only 412 entries (needed 500+), required adding extras across all manufacturers
- Bash heredoc quoting conflicted with Python string formatting; resolved by writing Python script to a temp file instead

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- 506 bullets ready for the bullet list page (DATA-01 requirement complete)
- Per-manufacturer loading pattern established for future data expansion
- Schema extension tests validate all fields from SCHM-01 and SCHM-02
- Phase 11 is now fully complete (3/3 plans), ready for Phase 12 (2D SVG Technical Drawings)

---
*Phase: 11-foundation-and-data-expansion*
*Completed: 2026-02-27*
