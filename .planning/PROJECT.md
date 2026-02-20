# Simulador de Balistica de Precision v2

## What This Is

A web-based internal ballistics simulator for precision ammunition reloading that aims to surpass Gordon's Reloading Tool (GRT) and QuickLoad in simulation accuracy, data completeness, and user experience. Built as a modern web app (Next.js + FastAPI + PostgreSQL) with cloud storage, cross-platform access, and a clean responsive UI — everything desktop-only tools like GRT aren't.

## Core Value

The most accurate internal ballistics simulation available, validated against published load manual data, with a comprehensive pre-loaded component database so users can simulate immediately without manual data entry.

## Requirements

### Validated

- [x] Internal ballistics simulation with ODE solver (4-variable: Z, x, v, Q_loss) — existing
- [x] Thornhill convective heat loss model (h=2000 W/m2K) — existing
- [x] SAAMI/CIP pressure safety validation with warnings — existing
- [x] Recoil and impulse calculation — existing
- [x] Structural analysis (Lame hoop stress, case expansion, Lawton erosion) — existing
- [x] Barrel harmonics and OBT node calculation — existing
- [x] CRUD for powders, bullets, cartridges, rifles, loads — existing
- [x] Parametric powder search (iterate all powders, rank by velocity) — existing
- [x] Powder comparison table — existing
- [x] Ladder test with interactive velocity/pressure vs charge charts — existing
- [x] Chronograph CSV import (LabRadar, MagnetoSpeed) — existing
- [x] Client-side CSV export of simulation results — existing
- [x] Unit toggle (PSI/MPa, FPS/m/s) — existing
- [x] Simple/Advanced mode toggle — existing
- [x] Tooltips on all simulation input fields — existing
- [x] Rate limiting on simulation endpoints — existing
- [x] Alembic async migrations — existing
- [x] 200+ passing tests (solver, structural, harmonics, schema, API) — existing
- [x] Docker Compose deployment (db, backend, frontend, pgadmin) — existing
- [x] Seed data (22 powders, bullets, cartridges, 5 rifles) — existing

### Active

**Simulation Engine**
- [ ] 3-curve powder burn model (initial, main, tail-off phases) to match/exceed GRT accuracy
- [ ] Validation test suite against published load data from reloading manuals (Hodgdon, Sierra, Hornady, Nosler)
- [ ] Temperature sensitivity coefficient for powder models
- [ ] Bullet jump / freebore engraving resistance modeling
- [ ] Semi-auto gas port pressure loss modeling

**Simulation Output & Charts**
- [ ] Energy and momentum curves (kinetic energy vs distance, recoil impulse over time)
- [ ] Powder burn progress chart (burn fraction Z vs time, gas generation rate)
- [ ] Temperature and heat curves (gas temp, barrel wall temp, heat flux over time)
- [ ] Sensitivity analysis with error bands (+/- charge variation on pressure/velocity)

**Pre-loaded Component Databases**
- [ ] Import GRT community powder database (from github.com/zen/grt_databases) — 200+ powders with burn models
- [ ] Comprehensive bullet database from manufacturer specs (Sierra, Hornady, Nosler, Berger, Lapua) — 500+ bullets
- [ ] Comprehensive cartridge database with CIP/SAAMI specs — 50+ cartridges
- [ ] Pre-loaded rifle configurations for common platforms
- [ ] Powder model quality indicators (red/yellow/green confidence levels)

**2D/3D Viewers**
- [ ] 2D technical cutaway drawing of rifles (cross-section showing chamber, bore, barrel) on rifle page
- [ ] 3D interactive rotatable rifle model (Three.js or similar) on rifle page
- [ ] 2D technical drawing of cartridges with all dimensions annotated on cartridge page
- [ ] 3D interactive rotatable cartridge model on cartridge page

**Community Features**
- [ ] Community powder model database — users submit chronograph data to improve models
- [ ] Reverse-engineering algorithm: chrono data -> auto-derive powder burn parameters
- [ ] Shared loads — users can publish and browse community load recipes
- [ ] Powder model quality rating system based on community data volume

**Analysis & UX Tools**
- [ ] Shot group analysis tool (click-to-place shots on target, calculate MOA, ES, SD)
- [ ] Input validation inspector (cross-check inputs for inconsistencies, suggest corrections)
- [ ] PressureTrace II data overlay on simulated curves
- [ ] Report generation / printable load data sheets
- [ ] User calibration flow (import chrono data -> auto-tune solver parameters to specific rifle)

### Out of Scope

- Black powder calculator — niche use case, not relevant to precision reloading
- Revolver cylinder gap gas loss modeling — very niche, low demand
- Cartridge designer / wildcat designer — extremely complex, deferred to future
- QuickLoad file import — low demand, GRT is the primary competitor
- Mobile native app — web-first approach with responsive design covers mobile
- Real-time collaboration / shared workspaces — community features cover sharing needs
- Authentication / user accounts — defer until community features require it (can use anonymous/device-based initially)

## Context

**Existing codebase**: Fully functional v1 with 2-parameter Vieille burn model, Thornhill heat loss, structural and harmonics analysis, 5 CRUD pages with inline editing, parametric search, ladder test, 200+ tests. The solver currently overpredicts pressure by ~30-50% after heat loss correction (down from ~2x without Thornhill). The 3-curve model is the next major accuracy improvement.

**GRT as benchmark**: GRT reports 99.3% accuracy without tuning. Their 3-curve burn model and community-driven calibration loop are the key technical advantages. Their community powder database (crowdsourced from real firing data) is the killer feature.

**Data sources**: GRT community databases available on GitHub (zen/grt_databases) for powder models. Manufacturer websites and reloading manuals for bullet, cartridge, and rifle specifications.

**Technical debt**: Z_PRIMER=0.01 bootstrapping hack for combustion start. Heat loss coefficient h=2000 needs per-calibre tuning. No E2E frontend tests.

## Constraints

- **Tech stack**: FastAPI + Next.js 14 + PostgreSQL 16 + Docker Compose — already established, no migration
- **Solver foundation**: SciPy solve_ivp (RK45) for ODE integration — proven, extend don't replace
- **Units convention**: SI internally in solver, PSI/FPS at API boundary, user-selectable in frontend
- **Data licensing**: GRT community DB is open/crowdsourced; manufacturer bullet data must be sourced from public specs
- **3D rendering**: Must work in browser without plugins — Three.js / React Three Fiber is the practical choice
- **Backward compatibility**: Existing seed data and API contracts must be preserved; new features extend, not break

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 3-curve burn model over calibrating 2-curve | GRT's accuracy advantage comes from the 3rd curve capturing tail-off; tuning 2 params has a ceiling | -- Pending |
| GRT community DB as primary powder data source | Largest open dataset, already calibrated by community, GitHub accessible | -- Pending |
| Three.js for 3D viewers | Only viable browser-native 3D library, React Three Fiber for integration | -- Pending |
| One big milestone vs phased releases | User wants full feature set planned together, ship when complete | -- Pending |
| Community features included | GRT's killer feature is crowdsourced data; we need this to compete | -- Pending |
| Calibration flow as nice-to-have | Important but not blocking; can ship without auto-tune initially | -- Pending |

---
*Last updated: 2026-02-20 after project initialization (v2 milestone)*
