# Simulador de Balistica de Precision v2

## What This Is

A web-based internal ballistics simulator for precision ammunition reloading with a GRT-style 3-curve burn model achieving 1.45% mean velocity error, comprehensive chart dashboard with interactive sensitivity explorer, pre-loaded component databases (208 powders, 127 bullets, 53 cartridges) with quality scoring and fuzzy search, and validated accuracy across 4 calibers. Built as a modern web app (Next.js + FastAPI + PostgreSQL) with cloud storage, cross-platform access, and responsive dark-mode UI.

## Current Milestone: v1.3 Data Expansion + Visual Viewers

**Goal:** Expand component databases to 500+ bullets with community contribution support, add 2D technical SVG drawings (3-tab: cross-section, chamber, full assembly with harmonics), and build an interactive 3D parametric cartridge viewer.

**Target features:**
- Bullet seed DB expansion to 500+ from manufacturer public specs
- Community JSON contribution format for user-submitted bullet data
- Browser upload UI for CSV/JSON import (bullets + cartridges)
- Caliber-scoped parametric search optimization
- 2D SVG technical drawings with 3 tabs (cartridge, chamber, full assembly + harmonics)
- 3D parametric cartridge model (React Three Fiber, rotatable, zoomable)

## Current State

Active milestone: v1.3 (started 2026-02-27).

## Core Value

The most accurate internal ballistics simulation available, validated against published load manual data, with a comprehensive pre-loaded component database so users can simulate immediately without manual data entry.

## Requirements

### Validated

- ✓ Internal ballistics simulation with ODE solver (4-variable: Z, x, v, Q_loss) — v1.0
- ✓ Thornhill convective heat loss model (h=2000 W/m2K) — v1.0
- ✓ SAAMI/CIP pressure safety validation with warnings — v1.0
- ✓ Recoil and impulse calculation — v1.0
- ✓ Structural analysis (Lame hoop stress, case expansion, Lawton erosion) — v1.0
- ✓ Barrel harmonics and OBT node calculation — v1.0
- ✓ CRUD for powders, bullets, cartridges, rifles, loads — v1.0
- ✓ Parametric powder search (iterate all powders, rank by velocity) — v1.0
- ✓ Powder comparison table — v1.0
- ✓ Ladder test with interactive velocity/pressure vs charge charts — v1.0
- ✓ Chronograph CSV import (LabRadar, MagnetoSpeed) — v1.0
- ✓ Client-side CSV export of simulation results — v1.0
- ✓ Unit toggle (PSI/MPa, FPS/m/s) — v1.0
- ✓ Simple/Advanced mode toggle — v1.0
- ✓ Tooltips on all simulation input fields — v1.0
- ✓ Rate limiting on simulation endpoints — v1.0
- ✓ Alembic async migrations — v1.0
- ✓ 200+ passing tests (solver, structural, harmonics, schema, API) — v1.0
- ✓ Docker Compose deployment (db, backend, frontend, pgadmin) — v1.0
- ✓ Seed data (22 powders, bullets, cartridges, 5 rifles) — v1.0
- ✓ 3-curve powder burn model (initial/main/tail-off phases with z1/z2 transitions) — v1.1
- ✓ GRT-native parameters (Ba, k, z1, z2, Bp, Br, Brp) as first-class DB fields — v1.1
- ✓ Validation suite: 21 loads, 4 calibers, 1.45% mean velocity error — v1.1
- ✓ Energy and momentum curves (KE vs distance, recoil impulse over time) — v1.1
- ✓ Burn progress chart (Z vs time, dZ/dt gas generation rate) — v1.1
- ✓ Temperature and heat curves (gas temp, barrel wall temp, heat loss) — v1.1
- ✓ Sensitivity analysis with error bands (+/- charge variation) — v1.1
- ✓ Interactive sensitivity explorer (3 sliders: charge, seating, barrel length) — v1.1
- ✓ GRT community powder import (208 powders with batch collision handling) — v1.2
- ✓ Quality scoring system with red/yellow/green badges and 0-100 tooltips — v1.2
- ✓ Data source provenance tracking (grt_community, manufacturer, manual, estimated) — v1.2
- ✓ Solver reads web_thickness per powder from DB (no hardcoded default) — v1.2
- ✓ pg_trgm fuzzy search with typo tolerance on all component endpoints — v1.2
- ✓ Server-side pagination with total count on all list endpoints — v1.2
- ✓ Filter controls (manufacturer, caliber family, quality level) on list pages — v1.2
- ✓ Pre-loaded bullet database (127 bullets from Sierra, Hornady, Berger, Nosler, Lapua) — v1.2
- ✓ Pre-loaded cartridge database (53 cartridges with CIP/SAAMI specs) — v1.2
- ✓ Batch import endpoints for powders, bullets, and cartridges — v1.2
- ✓ Powder alias system (18 powders across 11 alias groups) — v1.2
- ✓ Searchable picker modals replacing flat dropdowns in simulation form — v1.2
- ✓ Frontend pagination with keepPreviousData transitions — v1.2

### Active

**Data Expansion**
- [ ] Expand bullet database to 500+ covering all popular calibers
- [ ] Dedicated bullet/cartridge upload UI (import from CSV/JSON in browser)
- [ ] Caliber-scoped parametric search optimization

**Advanced Simulation Models**
- [ ] Temperature sensitivity coefficient for powder models
- [ ] Bullet jump / freebore engraving resistance modeling
- [ ] Semi-auto gas port pressure loss modeling

**Analysis & UX Tools**
- [ ] Shot group analysis tool (click-to-place shots, MOA, ES, SD)
- [ ] Input validation inspector (cross-check inconsistencies)
- [ ] Printable load data sheets (formatted HTML/PDF)

**2D/3D Viewers**
- [ ] 2D technical drawings for cartridges and rifles (SVG with dimensions)
- [ ] 3D interactive rotatable models (React Three Fiber)

**Community Features**
- [ ] Community powder model database (chrono data submissions)
- [ ] Reverse-engineering algorithm (chrono data -> burn parameters)
- [ ] Shared load recipes (publish, browse, filter, rate)
- [ ] PressureTrace II data overlay

### Out of Scope

- Black powder calculator — different combustion physics, not precision reloading
- Cartridge wildcat designer — complex liability, deferred
- QuickLoad file import — low demand, GRT is primary competitor
- Mobile native app — responsive web covers mobile
- Real-time collaboration — community features cover sharing
- External ballistics solver — different domain, provide muzzle velocity/BC for external tools
- Authentication before community features — defer until community phase
- Elasticsearch for search — pg_trgm handles 750 records trivially
- Client-side table virtualization — server-side pagination eliminates the need

## Context

Shipped v1.2 with ~26,700 LOC (estimated: ~9,600 Python + ~17,100 TypeScript).
Tech stack: Next.js 14, FastAPI, PostgreSQL 16, Docker Compose, Recharts, TanStack Query.
322+ passing tests (solver, structural, harmonics, schema, API, validation, import, pagination).

3-curve burn model achieves 1.45% mean velocity error across 21 reference loads (4 calibers: .308 Win, 6.5 Creedmoor, .223 Rem, .300 Win Mag).

Chart dashboard provides 6 interactive tiles with PNG/CSV export and expand-to-modal. Sensitivity explorer with 3 live sliders enables real-time what-if analysis.

Component databases ship pre-loaded: 208 powders (GRT community data + estimated burn models), 127 bullets (Sierra/Hornady/Berger/Nosler/Lapua), 53 cartridges (CIP/SAAMI specs). Quality scoring with automated badges provides data confidence indicators. Fuzzy search handles typos and filter controls enable browsing by manufacturer, caliber family, and quality level.

Known technical debt: Z_PRIMER=0.01 bootstrapping hack, h=2000 heat loss coefficient needs per-calibre tuning, 3-curve form function reconstructed (not verified against closed-source GRT).

## Constraints

- **Tech stack**: FastAPI + Next.js 14 + PostgreSQL 16 + Docker Compose — established, no migration
- **Solver foundation**: SciPy solve_ivp (RK45) for ODE integration — proven, extend don't replace
- **Units convention**: SI internally in solver, PSI/FPS at API boundary, user-selectable in frontend
- **Data licensing**: GRT community DB is open/crowdsourced; manufacturer bullet data from public specs
- **3D rendering**: Three.js / React Three Fiber for browser-native 3D
- **Backward compatibility**: Existing seed data and API contracts preserved; new features extend, not break

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 3-curve burn model over calibrating 2-curve | GRT's accuracy advantage comes from the 3rd curve capturing tail-off; tuning 2 params has a ceiling | ✓ Good — 1.45% mean error achieved |
| Vieille burn rate for both 2C/3C modes | 3-curve only changes form function (psi), not burn rate law; simpler, accurate enough | ✓ Good — backward compat preserved |
| Per-powder-type parameter profiles | 7 distinct burn-speed classes vs single set; slow powders need larger web_thickness | ✓ Good — critical for .300 WM accuracy |
| GRT import with overwrite query param | Simpler than separate endpoint, RESTful, batch collision dialog | ✓ Good — clean UX |
| html2canvas for chart PNG export | Dark theme matching, 2x scale quality, no server dependency | ✓ Good — works well |
| Domain color system for charts | Blue (P/V/harmonics), orange (burn), red (temperature), green (energy/recoil) | ✓ Good — clear visual grouping |
| Sensitivity endpoint: 3 full simulations | Center + upper + lower, returns complete responses, 10/min rate limit | ✓ Good — enables live sliders |
| Barrel length override as transient field | Optional nullable field, no DB writes, slider doesn't modify rifle record | ✓ Good — clean separation |
| pg_trgm for fuzzy search (no Elasticsearch) | Handles 750 records trivially; Elasticsearch is disproportionate | ✓ Good — fast, zero infra overhead |
| Server-side pagination (no client-side virtualization) | 50/page eliminates need for virtual scrolling; simpler frontend | ✓ Good — clean implementation |
| Per-entity paginated response models (not Generic[T]) | FastAPI OpenAPI generation struggles with Generic; explicit models cleaner | ✓ Good — type-safe endpoints |
| Quality score: 30% source tier + 70% data completeness | Deterministic, transparent formula; auto-recompute on update | ✓ Good — users trust badges |
| ComponentPicker with internal useQuery | Generic picker fetches its own data; SimulationForm no longer receives data as props | ✓ Good — clean separation |
| Module-level alias map cache | Loaded once from powder_aliases.json, reused across requests; no DB overhead | ✓ Good — fast alias lookup |
| GRT community DB as primary powder data source | Largest open dataset, already calibrated by community, GitHub accessible | ✓ Good — 208 powders imported |
| Three.js for 3D viewers | Only viable browser-native 3D library, React Three Fiber for integration | — Pending |
| Community features included | GRT's killer feature is crowdsourced data; we need this to compete | — Pending |

---
*Last updated: 2026-02-27 after v1.3 milestone started*
