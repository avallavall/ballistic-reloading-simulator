# Roadmap: Simulador de Balistica v2

## Milestones

- ✅ **v1.1 3-Curve Engine + Extended Charts** — Phases 1-2 (shipped 2026-02-21)
- ✅ **v1.2 Component Databases + Search** — Phases 3-6 (shipped 2026-02-23)

## Phases

<details>
<summary>✅ v1.1 3-Curve Engine + Extended Charts (Phases 1-2) — SHIPPED 2026-02-21</summary>

- [x] Phase 1: 3-Curve Burn Model (3/3 plans) — completed 2026-02-21
- [x] Phase 2: Extended Simulation Charts (4/4 plans) — completed 2026-02-21

</details>

### v1.2 Component Databases + Search

**Milestone Goal:** Build comprehensive pre-loaded component databases with quality indicators, multi-source import pipelines, and advanced search/filtering so users can simulate immediately without manual data entry.

- [x] **Phase 3: Schema and Quality System** - Alembic migration with new columns, quality scorer, data provenance, solver web_thickness fix
- [x] **Phase 4: Search and Pagination** - pg_trgm fuzzy search, server-side pagination, multi-field filtering on all component endpoints
- [x] **Phase 5: Import Pipelines and Fixture Data** - GRT powder import, powder aliases, bullet/cartridge fixture compilation, batch import endpoints (completed 2026-02-22)
- [x] **Phase 7: Cross-Phase Integration Fixes** - Fix pg_trgm bootstrap, import mode parameter mismatch, TypeScript nullable alignment (completed 2026-02-23)
- [x] **Phase 6: Frontend Integration** - Searchable picker modals, pagination UI, quality badges display on all component pages (completed 2026-02-23)
- [ ] **Phase 8: Frontend Filter & Search Controls** - Filter dropdowns (manufacturer, caliber, quality) and search input on list pages
- [ ] **Phase 9: Powder Alias UI + Import Cache Fix** - Alias display, GRT alias mapping during import, overwrite cache invalidation
- [ ] **Phase 10: Tech Debt Cleanup** - QualityBadge in pickers, caliber_family backfill fix, extended field display

## Phase Details

### Phase 3: Schema and Quality System
**Goal**: Every component record carries a computed quality score and data source provenance, and the solver reads per-powder web_thickness from the database
**Depends on**: Phase 2 (v1.1 complete)
**Requirements**: PWD-02, PWD-03, PWD-04, QLT-02, QLT-03, SOL-01
**Success Criteria** (what must be TRUE):
  1. User sees red/yellow/green quality badges on powder records based on data completeness and source reliability
  2. User can hover a powder's quality badge and see a 0-100 score breakdown tooltip showing which fields are filled and the source tier
  3. Powder records display their data source (grt_community, manufacturer, manual, estimated) and this value persists across edits
  4. Editing a powder via PUT automatically recomputes its quality score so the badge stays accurate
  5. Running a simulation with a powder that has web_thickness set uses that value instead of the hardcoded 0.0004m default
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Backend: migration, ORM, quality scorer, schemas, CRUD auto-recompute, solver web_thickness, tests
- [x] 03-02-PLAN.md — Frontend: quality badges with tooltip, source labels, web_thickness in Advanced form

### Phase 4: Search and Pagination
**Goal**: Users can efficiently find components in large databases using fuzzy text search, multi-field filters, and paginated results
**Depends on**: Phase 3
**Requirements**: SRC-01, SRC-02, SRC-03
**Success Criteria** (what must be TRUE):
  1. All component list endpoints (GET /powders, /bullets, /cartridges) return paginated responses with items, total, page, and size fields
  2. User can search by name with typo tolerance (e.g., "hodgon" finds "Hodgdon") and results appear within 100ms
  3. User can filter components by manufacturer, caliber family, and quality level, and filters combine correctly (AND logic)
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Foundation: Alembic migration (pg_trgm, GIN indexes, bullet/cartridge quality+caliber columns), ORM models, quality scorers, paginated response schemas, reusable pagination/search service helpers
- [x] 04-02-PLAN.md — Endpoints: modify powders/bullets/cartridges list endpoints with pagination+search+filtering, dynamic manufacturer/caliber-family routes, frontend backward compat (hooks unwrap .items), comprehensive tests

### Phase 5: Import Pipelines and Fixture Data
**Goal**: Simulator ships with 200+ powders, 100-200 bullets, and 50+ cartridges pre-loaded from authoritative sources, with batch import capability for future expansion
**Depends on**: Phase 3 (new columns must exist), Phase 4 (search endpoints must handle large datasets)
**Requirements**: PWD-01, PWD-05, BUL-01, BUL-02, BUL-03, BUL-04, CRT-01, CRT-02, CRT-03
**Success Criteria** (what must be TRUE):
  1. After fresh Docker boot, the powder database contains 200+ records imported from GRT community data with burn model parameters populated
  2. After fresh Docker boot, the bullet database contains 100-200 records from Sierra, Hornady, Berger, Nosler, and Lapua covering .308, 6.5CM, .223, .300WM calibers
  3. After fresh Docker boot, the cartridge database contains 50+ records with CIP/SAAMI max pressure, case capacity, bore/groove diameter, and parent cartridge lineage
  4. User can batch-import GRT powder XML with collision handling (skip duplicates or overwrite), and duplicate powder names across markets are linked via aliases (e.g., ADI AR2208 = Hodgdon Varget)
  5. Bullet records tolerate missing fields (nullable length_mm, bc_g7) with completeness indicators, and can be batch-imported from JSON fixture files
**Plans**: 3 plans

Plans:
- [ ] 05-01-PLAN.md — Schema: migration 007 (powder alias_group, bullet model_number/type/base_type + nullable length_mm, cartridge parent_cartridge_name + extended dims), ORM models, Pydantic schemas, ImportMode/ImportResult, quality scorer updates
- [ ] 05-02-PLAN.md — Fixtures: compile 200+ powders, 100-200 bullets, 50+ cartridges, powder alias mappings as JSON files under backend/app/seed/fixtures/
- [ ] 05-03-PLAN.md — Import: refactor seed to load JSON fixtures, 3-mode collision import endpoints (powders/bullets/cartridges), aliases endpoint, 18+ tests

### Phase 7: Cross-Phase Integration Fixes
**Goal**: Fix critical wiring bugs between completed phases so Docker boot, GRT import, and frontend type safety work correctly before building Phase 6 UI
**Depends on**: Phase 5 (completed)
**Requirements**: Protects PWD-01, SRC-02, BUL-03 (integration fixes for already-satisfied requirements)
**Gap Closure:** Closes 3 integration gaps + 3 broken flows from v1.2 audit
**Success Criteria** (what must be TRUE):
  1. Fresh Docker boot with `create_all` (no Alembic) creates pg_trgm extension and GIN indexes — `GET /powders?q=varget` works without manual `alembic upgrade head`
  2. Frontend GRT import with overwrite mode sends `?mode=overwrite` (matching backend ImportMode enum) and backend correctly overwrites collisions
  3. Frontend TypeScript `Bullet` interface declares `length_mm` and `bc_g7` as `number | null`, matching backend nullable schema
  4. Frontend `GrtImportResult` interface includes `updated` array and `mode` field matching backend response
**Plans**: 1 plan

Plans:
- [x] 07-01-PLAN.md — Fix pg_trgm bootstrap + ILIKE fallback, align frontend import parameters and TypeScript nullable types, add 5 integration tests

### Phase 6: Frontend Integration
**Goal**: Users interact with the expanded databases through searchable pickers, paginated tables, and quality badges -- replacing flat dropdowns that cannot scale past 50 items
**Depends on**: Phase 3 (quality API), Phase 4 (search/pagination API), Phase 7 (integration fixes)
**Requirements**: QLT-01, SRC-04, SRC-05
**Success Criteria** (what must be TRUE):
  1. All component list pages (/powders, /bullets, /cartridges) display quality badges (green/yellow/red) on every record
  2. Simulation form uses searchable picker modals (with debounced text input) instead of flat Select dropdowns for powder, bullet, and cartridge selection
  3. Component list pages support smooth pagination with page controls, and navigating between pages does not flash empty content (keepPreviousData)
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — Foundation: reusable UI components (QualityBadge, Pagination, SkeletonRows, Toast), useDebounce hook, API query param support, paginated hook variants with keepPreviousData
- [x] 06-02-PLAN.md — List pages: quality badge columns + pagination controls on powders, bullets, and cartridges pages with skeleton loading
- [x] 06-03-PLAN.md — Picker modals: generic ComponentPicker modal + SimulationForm integration replacing flat Select dropdowns

### Phase 8: Frontend Filter & Search Controls
**Goal**: Users can filter component lists by manufacturer, caliber family, and quality level using dropdown controls, and search directly on list pages
**Depends on**: Phase 4 (backend filter endpoints), Phase 6 (frontend integration)
**Requirements**: SRC-03
**Gap Closure:** Closes SRC-03 (partial→satisfied) + integration gap (buildQueryString not passing filter params)
**Success Criteria** (what must be TRUE):
  1. ListParams interface includes manufacturer, caliber_family, quality_level, sort, and order fields, and buildQueryString sends them to the backend
  2. Powders, bullets, and cartridges list pages have filter dropdown controls populated from /manufacturers and /caliber-families endpoints
  3. List pages have a search input widget so users can fuzzy-search without navigating to /simulate ComponentPicker
  4. Filters combine with search and pagination (AND logic, no interference)
**Plans**: 2 plans

Plans:
- [ ] 08-01-PLAN.md -- API layer: extend ListParams/buildQueryString, filter API functions, useFilterOptions hooks, reusable FilterBar component
- [ ] 08-02-PLAN.md -- Page wiring: update paginated hooks, wire FilterBar into powders/bullets/cartridges list pages with filter state and zero-results handling

### Phase 9: Powder Alias UI + Import Cache Fix
**Goal**: Powder aliases are visible to users and applied during GRT import, and the overwrite import flow correctly refreshes the UI
**Depends on**: Phase 5 (alias backend), Phase 6 (frontend integration)
**Requirements**: PWD-05
**Gap Closure:** Closes PWD-05 (partial→satisfied) + integration gap (overwrite cache invalidation) + flow gap (GRT overwrite refresh)
**Success Criteria** (what must be TRUE):
  1. Powder list page shows alias indicator (e.g., badge or icon) on powders that belong to an alias group, with hover/click revealing linked names
  2. getPowderAliases() exists in frontend api.ts and is consumed by the UI
  3. GRT import endpoint applies powder_aliases.json mappings so newly imported powders get correct alias_group values
  4. handleOverwriteDuplicates invalidates TanStack Query cache after import, and the powder list auto-refreshes
**Plans**: TBD

### Phase 10: Tech Debt Cleanup
**Goal**: Resolve non-blocking tech debt items from v1.2 audit to improve data display accuracy and UI polish
**Depends on**: Phase 8, Phase 9
**Requirements**: None (quality-of-life improvements)
**Gap Closure:** Closes 4 tech debt items from v1.2 audit
**Success Criteria** (what must be TRUE):
  1. ComponentPicker renderItem displays QualityBadge on picker modal rows
  2. Migration backfill for cartridge caliber_family uses groove_diameter_mm (matching live endpoint logic)
  3. Bullets table displays model_number, bullet_type, and base_type columns
  4. Cartridges table displays parent_cartridge_name and extended dimension fields
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute: 3 -> 4 -> 5 -> 7 -> 6

Note: Phase 7 (integration fixes) must complete before Phase 6 (frontend) since Phase 6 depends on correct API wiring.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. 3-Curve Burn Model | v1.1 | 3/3 | Complete | 2026-02-21 |
| 2. Extended Simulation Charts | v1.1 | 4/4 | Complete | 2026-02-21 |
| 3. Schema and Quality System | v1.2 | Complete    | 2026-02-21 | 2026-02-21 |
| 4. Search and Pagination | v1.2 | Complete    | 2026-02-21 | 2026-02-21 |
| 5. Import Pipelines and Fixture Data | v1.2 | Complete    | 2026-02-22 | - |
| 7. Cross-Phase Integration Fixes | v1.2 | 1/1 | Complete | 2026-02-23 |
| 6. Frontend Integration | v1.2 | 3/3 | Complete | 2026-02-23 |
| 8. Frontend Filter & Search Controls | v1.2 | 0/2 | Pending | - |
| 9. Powder Alias UI + Import Cache Fix | v1.2 | 0/? | Pending | - |
| 10. Tech Debt Cleanup | v1.2 | 0/? | Pending | - |
