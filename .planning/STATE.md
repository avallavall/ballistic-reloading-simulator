# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** The most accurate internal ballistics simulation available, validated against published load data, with comprehensive pre-loaded databases so users can simulate immediately without manual data entry.
**Current focus:** Phase 5 - Import Pipelines and Fixture Data (v1.2)

## Current Position

Phase: 5 of 6 (Import Pipelines and Fixture Data)
Plan: 1 of 3 in current phase -- COMPLETE
Status: Plan 05-01 complete. Ready for Plan 05-02 (fixture data).
Last activity: 2026-02-22 — Completed 05-01-PLAN.md (schema foundation for import pipelines)

Progress: [==========-] 87% (13 plans complete across all milestones)

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: 5.2min
- Total execution time: 1.13 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - 3-Curve Burn Model | 3/3 | 20min | 6.7min |
| 2 - Extended Simulation Charts | 4/4 | 19min | 4.8min |
| 3 - Schema and Quality System | 2/2 | 10min | 5min |
| 4 - Search and Pagination | 2/2 | 11min | 5.5min |
| 5 - Import Pipelines | 1/3 | 4min | 4min |

**Recent Trend:**
- Last 5 plans: 7, 3, 4, 7, 4 min
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

### Pending Todos

None.

### Blockers/Concerns

- GRT community database on GitHub (zen/grt_databases) has limited files. Full 200+ powder dataset may require GRT installation export or manual curation.
- Bullet data compilation (100-200 bullets) requires manual work from manufacturer PDF specs -- no automated source exists.
- ~~Breaking API contract~~ RESOLVED: Frontend hooks updated with select unwrap in 04-02.
- ~~pg_trgm not available in aiosqlite~~ RESOLVED: Search tests skip fuzzy search; 22 new tests cover pagination/filtering with SQLite.

## Session Continuity

Last session: 2026-02-22
Stopped at: Completed 05-01-PLAN.md (schema foundation for import pipelines)
Resume file: None
