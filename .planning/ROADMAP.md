# Roadmap: Simulador de Balistica v2

## Milestones

- ✅ **v1.1 3-Curve Engine + Extended Charts** — Phases 1-2 (shipped 2026-02-21)
- 🚧 **v1.2 Component Databases + Search** — Phases 3-6 (in progress)

## Phases

<details>
<summary>✅ v1.1 3-Curve Engine + Extended Charts (Phases 1-2) — SHIPPED 2026-02-21</summary>

- [x] Phase 1: 3-Curve Burn Model (3/3 plans) — completed 2026-02-21
- [x] Phase 2: Extended Simulation Charts (4/4 plans) — completed 2026-02-21

</details>

### 🚧 v1.2 Component Databases + Search (In Progress)

**Milestone Goal:** Build comprehensive pre-loaded component databases with quality indicators, multi-source import pipelines, and advanced search/filtering so users can simulate immediately without manual data entry.

- [ ] **Phase 3: Schema and Quality System** - Alembic migration with new columns, quality scorer, data provenance, solver web_thickness fix
- [ ] **Phase 4: Search and Pagination** - pg_trgm fuzzy search, server-side pagination, multi-field filtering on all component endpoints
- [ ] **Phase 5: Import Pipelines and Fixture Data** - GRT powder import, powder aliases, bullet/cartridge fixture compilation, batch import endpoints
- [ ] **Phase 6: Frontend Integration** - Searchable picker modals, pagination UI, quality badges display on all component pages

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
- [ ] 03-01-PLAN.md — Backend: migration, ORM, quality scorer, schemas, CRUD auto-recompute, solver web_thickness, tests
- [ ] 03-02-PLAN.md — Frontend: quality badges with tooltip, source labels, web_thickness in Advanced form

### Phase 4: Search and Pagination
**Goal**: Users can efficiently find components in large databases using fuzzy text search, multi-field filters, and paginated results
**Depends on**: Phase 3
**Requirements**: SRC-01, SRC-02, SRC-03
**Success Criteria** (what must be TRUE):
  1. All component list endpoints (GET /powders, /bullets, /cartridges) return paginated responses with items, total, page, and size fields
  2. User can search by name with typo tolerance (e.g., "hodgon" finds "Hodgdon") and results appear within 100ms
  3. User can filter components by manufacturer, caliber family, and quality level, and filters combine correctly (AND logic)
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

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
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

### Phase 6: Frontend Integration
**Goal**: Users interact with the expanded databases through searchable pickers, paginated tables, and quality badges -- replacing flat dropdowns that cannot scale past 50 items
**Depends on**: Phase 3 (quality API), Phase 4 (search/pagination API)
**Requirements**: QLT-01, SRC-04, SRC-05
**Success Criteria** (what must be TRUE):
  1. All component list pages (/powders, /bullets, /cartridges) display quality badges (green/yellow/red) on every record
  2. Simulation form uses searchable picker modals (with debounced text input) instead of flat Select dropdowns for powder, bullet, and cartridge selection
  3. Component list pages support smooth pagination with page controls, and navigating between pages does not flash empty content (keepPreviousData)
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 3 -> 4 -> 5 -> 6

Note: Phase 5 (fixture data compilation) can begin in parallel with Phase 6 (frontend) once Phase 4 is stable, since they modify different layers.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. 3-Curve Burn Model | v1.1 | 3/3 | Complete | 2026-02-21 |
| 2. Extended Simulation Charts | v1.1 | 4/4 | Complete | 2026-02-21 |
| 3. Schema and Quality System | v1.2 | 0/? | Not started | - |
| 4. Search and Pagination | v1.2 | 0/? | Not started | - |
| 5. Import Pipelines and Fixture Data | v1.2 | 0/? | Not started | - |
| 6. Frontend Integration | v1.2 | 0/? | Not started | - |
