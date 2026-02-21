# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** The most accurate internal ballistics simulation available, validated against published load data, with comprehensive pre-loaded databases so users can simulate immediately without manual data entry.
**Current focus:** Phase 4 - Search and Pagination (v1.2)

## Current Position

Phase: 4 of 6 (Search and Pagination)
Plan: 1 of 2 in current phase
Status: Executing Phase 4 plans
Last activity: 2026-02-21 — Completed 04-01-PLAN.md (search and pagination foundation)

Progress: [========--] 77% (10 plans complete across all milestones)

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Average duration: 5.2min
- Total execution time: 0.89 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - 3-Curve Burn Model | 3/3 | 20min | 6.7min |
| 2 - Extended Simulation Charts | 4/4 | 19min | 4.8min |
| 3 - Schema and Quality System | 2/2 | 10min | 5min |
| 4 - Search and Pagination | 1/2 | 4min | 4min |

**Recent Trend:**
- Last 5 plans: 4, 5, 4.5, 7, 3, 4 min
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

### Pending Todos

None.

### Blockers/Concerns

- GRT community database on GitHub (zen/grt_databases) has limited files. Full 200+ powder dataset may require GRT installation export or manual curation.
- Bullet data compilation (100-200 bullets) requires manual work from manufacturer PDF specs -- no automated source exists.
- Breaking API contract: list endpoints change from raw arrays to `{items, total, page, size}` wrappers -- all frontend hooks must update simultaneously.
- pg_trgm not available in aiosqlite test environment -- search tests need separate PostgreSQL integration test markers.

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 04-01-PLAN.md (search and pagination foundation)
Resume file: None
