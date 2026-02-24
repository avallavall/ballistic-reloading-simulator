# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** The most accurate internal ballistics simulation available, validated against published load data, with comprehensive pre-loaded databases so users can simulate immediately without manual data entry.
**Current focus:** Phase 10 - Tech Debt Cleanup -- COMPLETE

## Current Position

Phase: 10 of 10 (Tech Debt Cleanup) -- COMPLETE
Plan: 2 of 2 in current phase (10-02 complete, phase done)
Status: Phase 10 complete. All plans executed. v1.2 milestone fully shipped.
Last activity: 2026-02-24 — Completed 10-02-PLAN.md (QualityBadge in pickers, extended tables, null display convention)

Progress: [================] 100% (25 plans complete across all milestones)

## Performance Metrics

**Velocity:**
- Total plans completed: 25
- Average duration: 4.2min
- Total execution time: 1.81 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - 3-Curve Burn Model | 3/3 | 20min | 6.7min |
| 2 - Extended Simulation Charts | 4/4 | 19min | 4.8min |
| 3 - Schema and Quality System | 2/2 | 10min | 5min |
| 4 - Search and Pagination | 2/2 | 11min | 5.5min |
| 5 - Import Pipelines | 3/3 | 18min | 6min |
| 6 - Frontend Integration | 3/3 | 9min | 3min |
| 7 - Cross-Phase Integration Fixes | 1/1 | 6min | 6min |
| 8 - Frontend Filter/Search Controls | 2/2 | 4min | 2min |
| 9 - Powder Alias UI, Import & Cache Fix | 2/2 | 4min | 2min |
| 10 - Tech Debt Cleanup | 2/2 | 4min | 2min |

**Recent Trend:**
- Last 5 plans: 2, 2, 2, 1, 3 min
- Trend: Stable
| Phase 09 P01 | 2min | 2 tasks | 3 files |
| Phase 09 P02 | 2min | 2 tasks | 5 files |
| Phase 10 P01 | 1min | 1 tasks | 1 files |
| Phase 10 P02 | 3min | 2 tasks | 7 files |

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
- [06-01]: Wrap existing hook queryFn references in arrow functions to preserve type inference after adding optional params
- [06-01]: Paginated hooks use distinct queryKey prefix ['entity', 'list', {...}] to avoid cache collision with existing hooks
- [06-01]: Toast uses React portal + useToast pattern instead of global state management
- [06-03]: ComponentPicker uses internal useQuery for data fetching (not entity-specific hooks) to remain fully generic
- [06-03]: SimulationForm no longer receives bullets/powders as props; pickers fetch their own data on-demand
- [06-03]: Rifle selection remains flat Select dropdown (only 5 records) per research recommendation
- [Phase 06]: CRUD mutation invalidation unchanged -- existing prefix match already covers paginated query keys
- [08-01]: Raw select elements in FilterBar instead of existing Select component (avoids label/error wrapper overhead)
- [08-01]: FilterBar does not debounce internally; parent page controls debounce via useDebounce
- [08-01]: Quality dropdown maps Alta/Media/Baja to success/warning/danger backend values
- [08-02]: handleFilterChange generic helper resets page to 1 on any filter/search change
- [08-02]: Pass undefined (not empty string) for inactive filter params to avoid sending empty query strings
- [08-02]: FilterBar always rendered regardless of data length so users can always search/filter
- [09-01]: Module-level _alias_map_cache loaded once from powder_aliases.json, reused across requests
- [09-01]: Case-insensitive matching via .lower() for alias lookup to handle GRT naming inconsistencies
- [09-01]: Alias application runs before db.commit() so powder data and alias_group persisted atomically
- [09-02]: AliasBadge uses on-hover lazy fetch with local state caching (no TanStack Query) for simplicity
- [09-02]: Tooltip uses group/alias named group to avoid conflicts with parent QualityBadge group styles
- [09-02]: Toast success type uses green-500/60 border color consistent with existing error/info patterns
- [10-01]: Data-only migration using op.execute (no sa import needed) for corrective caliber_family backfill
- [10-01]: Downgrade reverts to bore_diameter_mm-based derivation (original 006 behavior)
- [10-02]: TypeBadge defined inline in bullets page (not shared component) since specific to bullet_type/base_type
- [10-02]: displayValue() utility established as project-wide null display convention (em dash U+2014)
- [10-02]: Cartridge neck_diameter_mm displayed with toFixed(3) for sub-mm precision

### Pending Todos

None.

### Blockers/Concerns

- ~~GRT community database on GitHub (zen/grt_databases) has limited files~~ RESOLVED: 208 powders compiled from multiple sources (manufacturer data, burn rate charts, generic defaults)
- ~~Bullet data compilation requires manual work~~ RESOLVED: 127 bullets compiled from manufacturer catalogs
- ~~Breaking API contract~~ RESOLVED: Frontend hooks updated with select unwrap in 04-02.
- ~~pg_trgm not available in aiosqlite~~ RESOLVED: Search tests skip fuzzy search; 22 new tests cover pagination/filtering with SQLite.

## Session Continuity

Last session: 2026-02-24
Stopped at: Completed 10-02-PLAN.md (QualityBadge in pickers, extended tables, null display -- Phase 10 complete, v1.2 fully shipped)
Resume file: .planning/phases/10-tech-debt-cleanup/10-02-SUMMARY.md
