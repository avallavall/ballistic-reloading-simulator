---
phase: 05-import-pipelines-and-fixture-data
plan: 02
subsystem: database
tags: [json, fixtures, powders, bullets, cartridges, seed-data, ballistics]

# Dependency graph
requires:
  - phase: 05-01
    provides: "Schema columns for alias_group, model_number, bullet_type, base_type, parent_cartridge_name, extended dims"
provides:
  - "208 powder fixture records from 13 manufacturers with thermochemical parameters"
  - "127 bullet fixture records from 5 manufacturers covering 7 caliber diameters"
  - "53 cartridge fixture records with SAAMI/CIP specs and parent cartridge lineage"
  - "11 ADI/Hodgdon powder alias group mappings"
affects: [05-03, 06-01]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JSON fixture files under backend/app/seed/fixtures/ for version-controlled seed data"
    - "Burn rate coefficient estimation from relative position: a = 3.5e-8 * exp(-0.012 * brr)"
    - "Sectional density computed as weight_grains / (7000 * (diameter_mm/25.4)^2)"

key-files:
  created:
    - backend/app/seed/fixtures/powders.json
    - backend/app/seed/fixtures/powder_aliases.json
    - backend/app/seed/fixtures/bullets.json
    - backend/app/seed/fixtures/cartridges.json
  modified: []

key-decisions:
  - "Burn rate coefficients estimated via Vieille model from relative position when manufacturer data unavailable"
  - "Generic SB defaults (F=950kJ/kg, gamma=1.24, T=3500K) and DB defaults (F=1080kJ/kg, gamma=1.22, T=3600K) applied per materials_database.md"
  - "Bullets include both match and hunting lines but exclude varmint/plinking/FMJ per user decision"
  - "Cartridge parent lineage stored as informational string, not FK-enforced"

patterns-established:
  - "Fixture JSON structure: array of objects with keys matching ORM column names"
  - "Alias JSON structure: object with group-id keys mapping to arrays of powder names"

requirements-completed: [PWD-01, PWD-05, BUL-01, BUL-02, CRT-01, CRT-02]

# Metrics
duration: 7min
completed: 2026-02-22
---

# Phase 5 Plan 2: Fixture Data Compilation Summary

**208 powders, 127 bullets, 53 cartridges, and 11 alias groups compiled as JSON fixtures from manufacturer catalogs and SAAMI/CIP specifications**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-22T09:59:46Z
- **Completed:** 2026-02-22T10:06:40Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments
- Compiled 208 unique powder records from 13 manufacturers (Hodgdon, ADI, IMR, Vihtavuori, Alliant, Accurate, Norma, Ramshot, Winchester, Shooters World, Lovex, Vectan) with all required thermochemical fields
- Compiled 127 unique bullet records from 5 manufacturers (Sierra, Hornady, Berger, Nosler, Lapua) covering .224, .243, .264, .270, .284, .308, .338 calibers in match and hunting types
- Compiled 53 unique cartridge records from .204 Ruger through .458 Win Mag with SAAMI/CIP pressure specs, parent cartridge lineage, and extended dimensions
- Created 11 ADI/Hodgdon powder alias group mappings with verified name integrity

## Task Commits

Each task was committed atomically:

1. **Task 1: Compile powder fixture data and alias mappings** - `a3079ab` (feat)
2. **Task 2: Compile bullet and cartridge fixture data** - `83d0b54` (feat)

## Files Created/Modified
- `backend/app/seed/fixtures/powders.json` - 208 powder records with thermochemical parameters (4289 lines)
- `backend/app/seed/fixtures/powder_aliases.json` - 11 alias groups mapping ADI/Hodgdon equivalents (13 lines)
- `backend/app/seed/fixtures/bullets.json` - 127 bullet records from 5 manufacturers (1906 lines)
- `backend/app/seed/fixtures/cartridges.json` - 53 cartridge records with SAAMI/CIP specs (849 lines)

## Decisions Made
- **Burn rate coefficient estimation:** Used Vieille model formula `a = 3.5e-8 * exp(-0.012 * brr)` to estimate burn coefficients from relative burn rate position. Exponent ('n') ranges from 0.82 (fast) to 0.90 (slow) based on position.
- **Thermochemical defaults:** Applied generic SB (F=950kJ/kg, gamma=1.24, flame=3500K, density=1.60) and DB (F=1080kJ/kg, gamma=1.22, flame=3600K, density=1.63) defaults from materials_database.md for powders without specific manufacturer data.
- **Bullet coverage:** Focused on match/precision (MatchKing, ELD Match, Hybrid Target, Scenar) and hunting (GameKing, ELD-X, VLD Hunting, AccuBond, Partition) lines per user decision. No varmint/plinking/FMJ included.
- **Cartridge lineage:** Stored as informational `parent_cartridge_name` string (not FK) -- matches by name only, compatible with the string column from migration 007.
- **Original seed data preserved:** All 10 seed powders retained with `data_source="manual"` and exact original values. All 10 seed bullets and 5 seed cartridges preserved with exact values plus new fields added.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 4 fixture files ready for consumption by Plan 05-03 (seed refactoring and import endpoints)
- JSON keys match ORM column names for direct unpacking via `Powder(**data)`, `Bullet(**data)`, `Cartridge(**data)`
- Powder alias names verified to reference existing powder records
- Quality scoring and caliber family derivation will be applied during seed loading (Plan 05-03)

## Self-Check: PASSED

All 4 fixture files verified present. Both task commits (a3079ab, 83d0b54) verified in git log.

---
*Phase: 05-import-pipelines-and-fixture-data*
*Completed: 2026-02-22*
