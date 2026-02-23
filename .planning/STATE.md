# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** The most accurate internal ballistics simulation available, validated against published load data, with comprehensive pre-loaded databases so users can simulate immediately without manual data entry.
**Current focus:** Phase 7 - Cross-Phase Integration Fixes (v1.2) -- COMPLETE

## Current Position

Phase: 7 of 7 (Cross-Phase Integration Fixes) -- COMPLETE
Plan: 1 of 1 in current phase -- COMPLETE
Status: Phase 07 complete (1/1 plans). Ready for Phase 06.
Last activity: 2026-02-23 — Completed 07-01-PLAN.md (cross-phase integration fixes)

Progress: [=============] 100% (16 plans complete across all milestones)

## Performance Metrics

**Velocity:**
- Total plans completed: 16
- Average duration: 5.5min
- Total execution time: 1.47 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - 3-Curve Burn Model | 3/3 | 20min | 6.7min |
| 2 - Extended Simulation Charts | 4/4 | 19min | 4.8min |
| 3 - Schema and Quality System | 2/2 | 10min | 5min |
| 4 - Search and Pagination | 2/2 | 11min | 5.5min |
| 5 - Import Pipelines | 3/3 | 18min | 6min |
| 7 - Cross-Phase Integration Fixes | 1/1 | 6min | 6min |

**Recent Trend:**
- Last 5 plans: 7, 4, 7, 7, 6 min
- Trend: Stable

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.2 scope]: Ship 100-200 bullets in v1.2, expand to 500+ in v1.3
- [v1.2 scope]: pg_trgm for fuzzy search (no Elasticsearch); server-side pagination (no client-side virtualization)
- [v1.2 scope]: Per-entity paginated response models (not Generic[T]) for FastAPI compatibility
- [03-01]: Quality tooltip computed_field uses manual dict construction to avoid model_dump() recursion
- [03-01]: _make_params returns extra_warnings tuple for per-powder parameter warnings
- [03-02]: CSS-only tooltip via group-hover pattern for quality badge (no tooltip library)
- [03-02]: data_source excluded from forms (server-managed provenance)
- [04-01]: Same 30/70 quality formula applied consistently across powder, bullet, and cartridge scorers
- [04-01]: 11 caliber families defined (.224 through .510) with diameter_mm ranges
- [04-01]: apply_fuzzy_search orders by similarity desc with quality_score desc as tiebreaker
- [04-02]: Cartridge caliber_family derived from groove_diameter_mm (not bore_diameter_mm)
- [04-02]: apply_fuzzy_search accepts configurable fields parameter for models without manufacturer
- [04-02]: Frontend hooks use TanStack Query select to unwrap .items for backward compat
- [05-01]: ImportMode enum and ImportResult defined in schemas/powder.py as shared import infrastructure
- [05-01]: Bullet length_mm changed to nullable to support incomplete import data
- [05-01]: GrtImportResult extended with updated list and mode field for overwrite/merge support
- [05-02]: Burn rate coefficients estimated via Vieille model from relative position (a = 3.5e-8 * exp(-0.012 * brr))
- [05-02]: Generic SB/DB thermochemical defaults applied from materials_database.md for powders without specific data
- [05-02]: Bullets: match + hunting lines only (no varmint/plinking/FMJ) per user decision
- [05-02]: Cartridge parent lineage stored as informational string, not FK-enforced
- [05-03]: Seed loader uses _load_fixture() with FIXTURES_DIR for JSON fixture loading
- [05-03]: GRT import creates renamed copy with "(GRT Import)" suffix for manual record collision
- [05-03]: RIFLES kept inline in seed (only 5 records with FK references to cartridge names)
- [07-01]: app.state.has_trgm flag set once at startup, passed defensively via getattr(request.app.state, "has_trgm", False)
- [07-01]: ILIKE fallback with %search_term% pattern when pg_trgm unavailable (graceful degradation)

### Pending Todos

None.

### Blockers/Concerns

- ~~GRT community database on GitHub (zen/grt_databases) has limited files~~ RESOLVED: 208 powders compiled from multiple sources (manufacturer data, burn rate charts, generic defaults)
- ~~Bullet data compilation requires manual work~~ RESOLVED: 127 bullets compiled from manufacturer catalogs
- ~~Breaking API contract~~ RESOLVED: Frontend hooks updated with select unwrap in 04-02.
- ~~pg_trgm not available in aiosqlite~~ RESOLVED: Search tests skip fuzzy search; 22 new tests cover pagination/filtering with SQLite.

## Session Continuity

Last session: 2026-02-23
Stopped at: Completed 07-01-PLAN.md (cross-phase integration fixes)
Resume file: .planning/phases/07-cross-phase-integration-fixes/07-01-SUMMARY.md
