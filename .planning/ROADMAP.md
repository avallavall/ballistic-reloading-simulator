# Roadmap: Simulador de Balistica

## Milestones

- ✅ **v1.1 3-Curve Engine + Extended Charts** — Phases 1-2 (shipped 2026-02-21)
- ✅ **v1.2 Component Databases + Search** — Phases 3-10 (shipped 2026-02-24)
- 🚧 **v1.3 Data Expansion + Visual Viewers** — Phases 11-14 (in progress)

## Phases

<details>
<summary>✅ v1.1 3-Curve Engine + Extended Charts (Phases 1-2) — SHIPPED 2026-02-21</summary>

- [x] Phase 1: 3-Curve Burn Model (3/3 plans) — completed 2026-02-21
- [x] Phase 2: Extended Simulation Charts (4/4 plans) — completed 2026-02-21

</details>

<details>
<summary>✅ v1.2 Component Databases + Search (Phases 3-10) — SHIPPED 2026-02-24</summary>

- [x] Phase 3: Schema and Quality System (2/2 plans) — completed 2026-02-21
- [x] Phase 4: Search and Pagination (2/2 plans) — completed 2026-02-21
- [x] Phase 5: Import Pipelines and Fixture Data (3/3 plans) — completed 2026-02-22
- [x] Phase 7: Cross-Phase Integration Fixes (1/1 plan) — completed 2026-02-23
- [x] Phase 6: Frontend Integration (3/3 plans) — completed 2026-02-23
- [x] Phase 8: Frontend Filter & Search Controls (2/2 plans) — completed 2026-02-24
- [x] Phase 9: Powder Alias UI + Import Cache Fix (2/2 plans) — completed 2026-02-24
- [x] Phase 10: Tech Debt Cleanup (2/2 plans) — completed 2026-02-24

</details>

### 🚧 v1.3 Data Expansion + Visual Viewers (In Progress)

**Milestone Goal:** Expand component databases to 500+ bullets with community contribution support, add 2D technical SVG drawings (3-tab: cross-section, chamber, full assembly with harmonics), and build an interactive 3D parametric cartridge viewer.

- [x] **Phase 11: Foundation and Data Expansion** - Schema extensions, geometry engine, bullet seed data, npm dependencies (completed 2026-02-27)
- [x] **Phase 12: 2D SVG Technical Drawings** - Three-tab SVG viewer with cross-section, chamber, and assembly drawings (completed 2026-02-28)
- [x] **Phase 13: 3D Parametric Cartridge Viewer** - Interactive React Three Fiber model with cutaway and orbit controls (completed 2026-02-28)
- [ ] **Phase 14: Browser Upload and Caliber-Scoped Search** - File upload UI with safety gates and caliber-filtered parametric search

## Phase Details

### Phase 11: Foundation and Data Expansion
**Goal**: Users have 500+ bullets to choose from, and the codebase has the geometry engine and schema extensions needed for all visualization work
**Depends on**: Phase 10 (v1.2 complete)
**Requirements**: SCHM-01, SCHM-02, SCHM-03, DATA-01
**Success Criteria** (what must be TRUE):
  1. User can browse 500+ bullets in the bullet list page, covering Sierra, Hornady, Berger, Nosler, Lapua, Barnes, and Speer
  2. Cartridge edit form shows 5 new optional fields (shoulder angle, neck length, body length, rim thickness, case type) and saves them to the database
  3. Bullet edit form shows 4 new optional rendering fields (bearing surface, boat tail length, meplat diameter, ogive type) and saves them to the database
  4. Geometry engine produces SVG path data and Three.js profile points from cartridge/bullet dimensions, with documented fallbacks when optional fields are null
**Plans**: 3 plans

Plans:
- [x] 11-01-PLAN.md — Schema extensions (models, schemas, migration, quality, frontend types, cartridge backfill)
- [x] 11-02-PLAN.md — Geometry engine + npm dependencies (R3F v8, drei v9, Three.js)
- [x] 11-03-PLAN.md — 506 bullet seed data (7 manufacturer JSON files) + updated seed loader + 19 new tests

### Phase 12: 2D SVG Technical Drawings
**Goal**: Users can view accurate technical drawings of their cartridge, chamber, and full assembly with harmonics overlay
**Depends on**: Phase 11
**Requirements**: VIS2-01, VIS2-02, VIS2-03, VIS2-04, VIS2-05
**Success Criteria** (what must be TRUE):
  1. User can view a cartridge cross-section SVG with labeled dimensions that match the database values for that cartridge
  2. User can view a cartridge-in-chamber drawing showing headspace gap, freebore, and rifling engagement
  3. User can view a full assembly drawing with barrel and OBT harmonic node positions overlaid from simulation results
  4. Drawings degrade gracefully in three tiers (full detail, basic outline, "insufficient data" message with edit link) based on how many dimension fields are populated
  5. User can export any 2D drawing tab as a PNG file
**Plans**: 3 plans

Plans:
- [ ] 12-01-PLAN.md — Backend Rifle chamber fields + frontend drawing computation library (types, themes, hatching, dimension layout, chamber geometry, assembly geometry, export utils, npm deps)
- [ ] 12-02-PLAN.md — SVG drawing React components (CartridgeCrossSection, ChamberDrawing, AssemblyDrawing, shared sub-components)
- [ ] 12-03-PLAN.md — /drawings page, tab navigation, export integration, sidebar link, hooks

### Phase 13: 3D Parametric Cartridge Viewer
**Goal**: Users can interact with a 3D model of their cartridge generated from database dimensions
**Depends on**: Phase 11 (geometry engine), Phase 12 (profile validation via 2D)
**Requirements**: VIS3-01, VIS3-02, VIS3-03, VIS3-04, VIS3-05
**Success Criteria** (what must be TRUE):
  1. User can view a 3D cartridge model generated parametrically from the cartridge and bullet database dimensions
  2. User can rotate, zoom, and pan the 3D model using mouse/touch controls
  3. User can toggle a cutaway half-section view showing the internal structure (case wall, powder space, bullet seating)
  4. Navigating to and from the 3D viewer page 20+ times does not cause WebGL context loss, black canvas, or memory leaks
  5. Pages that do not use the 3D viewer load with zero Three.js JavaScript in their bundle
**Plans**: 3 plans

Plans:
- [ ] 13-01-PLAN.md — Pure geometry-to-mesh conversion library (mesh-builder.ts, materials.ts) + HDR environment map
- [ ] 13-02-PLAN.md — R3F 3D scene components (CartridgeViewer3D, CartridgeMesh, BulletMesh, PrimerMesh, CutawayControls, DimensionLabels3D)
- [ ] 13-03-PLAN.md — Page integration (DrawingTabs 3D tab, dynamic import, WebGL lifecycle, deep linking, simulation results button)

### Phase 14: Browser Upload and Caliber-Scoped Search
**Goal**: Users can contribute bullet/cartridge data via file upload and get caliber-relevant parametric search results
**Depends on**: Phase 11 (500+ bullets for caliber search value)
**Requirements**: DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, SRCH-01, SRCH-02
**Success Criteria** (what must be TRUE):
  1. User can upload a JSON or CSV file of bullet data in the browser, preview rows with validation errors highlighted, choose collision handling (skip/overwrite), and import successfully
  2. User can upload a JSON or CSV file of cartridge data using the same workflow
  3. Community-contributed data automatically receives a quality badge capped at "danger" level (max 35/100) and simulations using community-sourced components display a prominent red safety warning banner
  4. Parametric powder search can optionally filter by caliber, pre-selecting only burn-rate-appropriate powders for the chosen cartridge bore diameter
  5. Caliber filter is off by default and existing parametric search behavior is unchanged when the filter is not activated
**Plans**: TBD

Plans:
- [ ] 14-01: TBD
- [ ] 14-02: TBD
- [ ] 14-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 11 -> 12 -> 13 -> 14

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. 3-Curve Burn Model | v1.1 | 3/3 | Complete | 2026-02-21 |
| 2. Extended Simulation Charts | v1.1 | 4/4 | Complete | 2026-02-21 |
| 3. Schema and Quality System | v1.2 | 2/2 | Complete | 2026-02-21 |
| 4. Search and Pagination | v1.2 | 2/2 | Complete | 2026-02-21 |
| 5. Import Pipelines and Fixture Data | v1.2 | 3/3 | Complete | 2026-02-22 |
| 7. Cross-Phase Integration Fixes | v1.2 | 1/1 | Complete | 2026-02-23 |
| 6. Frontend Integration | v1.2 | 3/3 | Complete | 2026-02-23 |
| 8. Frontend Filter & Search Controls | v1.2 | 2/2 | Complete | 2026-02-24 |
| 9. Powder Alias UI + Import Cache Fix | v1.2 | 2/2 | Complete | 2026-02-24 |
| 10. Tech Debt Cleanup | v1.2 | 2/2 | Complete | 2026-02-24 |
| 11. Foundation and Data Expansion | v1.3 | Complete    | 2026-02-27 | 2026-02-27 |
| 12. 2D SVG Technical Drawings | 3/3 | Complete    | 2026-02-28 | - |
| 13. 3D Parametric Cartridge Viewer | 3/3 | Complete   | 2026-02-28 | - |
| 14. Browser Upload and Caliber-Scoped Search | v1.3 | 0/? | Not started | - |
