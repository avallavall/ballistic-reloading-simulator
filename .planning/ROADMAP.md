# Roadmap: Simulador de Balistica v2

## Overview

This milestone transforms the simulator from a functional prototype with a 2-curve Vieille burn model into a GRT-competitive tool with 3-curve accuracy, 200+ pre-loaded powders, comprehensive charts, 3D viewers, and a community data ecosystem. The 3-curve burn model comes first because every downstream feature (data import, community calibration, validation) depends on the engine being accurate enough to trust. Charts follow as free wins from existing solver data. Data import populates the databases. Viewers and tools add differentiation. Community features are the capstone.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: 3-Curve Burn Model** - Upgrade solver to GRT-style 3-phase combustion model with validation against published load data
- [ ] **Phase 2: Extended Simulation Charts** - Expose solver-computed data as new chart types (burn progress, energy, temperature, sensitivity)
- [ ] **Phase 3: Data Import Pipeline** - Populate databases with 200+ powders, 500+ bullets, 50+ cartridges from GRT and manufacturer sources
- [ ] **Phase 4: Advanced Simulation Models** - Add temperature sensitivity, bullet jump resistance, and gas port pressure modeling
- [ ] **Phase 5: Analysis & UX Tools** - Shot group analysis, input validation inspector, and printable load data sheets
- [ ] **Phase 6: 2D/3D Viewers** - Interactive technical drawings and rotatable 3D models for cartridges and rifles
- [ ] **Phase 7: Community Features** - User-submitted chrono data, reverse-engineering algorithm, shared load recipes, PressureTrace overlay

## Phase Details

### Phase 1: 3-Curve Burn Model
**Goal**: Simulation predictions match published load manual data within 5% for velocity across 20+ reference loads
**Depends on**: Nothing (first phase)
**Requirements**: SIM-01, SIM-02, SIM-04
**Success Criteria** (what must be TRUE):
  1. User can simulate a load using a 3-curve powder (with z1/z2 phase transitions) and see a smooth pressure curve with no artifacts at transition points
  2. User can import a GRT .propellant file and the powder's Ba, k, z1, z2, Bp, Br, Brp parameters are stored as first-class fields and used directly by the solver
  3. Existing 2-curve powders continue to simulate identically (backward compatibility preserved)
  4. A validation test suite of 20+ reference loads from published manuals (Hodgdon, Sierra, Hornady) passes with mean velocity error below 5%
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — TDD: 3-curve piecewise form function + dual-mode solver with backward compat (Wave 1)
- [x] 01-02-PLAN.md — DB migration, GRT converter, API wiring, frontend 3C/2C badges + collapsible params (Wave 2)
- [x] 01-03-PLAN.md — Validation fixture (21+ loads), pytest quality gate, /validation page with charts (Wave 3)

### Phase 2: Extended Simulation Charts
**Goal**: Users can visualize all physics computed by the solver, not just pressure and velocity
**Depends on**: Phase 1
**Requirements**: CHART-01, CHART-02, CHART-03, CHART-04, CHART-05
**Success Criteria** (what must be TRUE):
  1. User can view kinetic energy vs distance and recoil impulse over time charts on the simulation results page
  2. User can view burn fraction (Z) vs time and gas generation rate (dZ/dt) charts showing powder combustion progress
  3. User can view gas temperature, barrel wall temperature estimate, and cumulative heat loss charts over time
  4. User can see error bands on pressure/velocity charts showing the effect of +/- charge weight variation
  5. User can drag sliders for charge weight, seating depth, and barrel length and see pressure/velocity update in near-real-time
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Extend solver SimResult with burn/energy/temperature/recoil curves + sensitivity endpoint (Wave 1)
- [x] 02-02-PLAN.md — Frontend chart infrastructure, new chart components, dashboard grid layout (Wave 2)
- [x] 02-03-PLAN.md — Error bands on P/V charts + sensitivity explorer with interactive sliders (Wave 3)
- [ ] 02-04-PLAN.md — Gap closure: enable barrel length slider (backend override + frontend wiring) (Wave 4)

### Phase 3: Data Import Pipeline
**Goal**: Users can simulate with any common powder, bullet, or cartridge without manual data entry
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, TOOL-04
**Success Criteria** (what must be TRUE):
  1. Powder database contains 200+ powders imported from GRT community database with all 3-curve burn model parameters populated
  2. Bullet database contains 500+ bullets from manufacturer specs with bearing surface, boat tail dimensions, and BCs
  3. Cartridge database contains 50+ cartridges with full CIP/SAAMI dimensional data
  4. Each powder displays a quality indicator badge (red/yellow/green) based on model confidence level
  5. User can upload a GRT .propellant file and all parameters (including 3-curve fields) are parsed and stored correctly
**Plans**: TBD

Plans:
- [ ] 03-01: Extend GRT parser/converter for 3-curve parameters and bulk import endpoint
- [ ] 03-02: Compile and seed bullet database from manufacturer specs
- [ ] 03-03: Compile and seed cartridge database from CIP/SAAMI data
- [ ] 03-04: Implement powder quality indicator badges in UI

### Phase 4: Advanced Simulation Models
**Goal**: Simulation accounts for environmental and mechanical factors beyond basic internal ballistics
**Depends on**: Phase 1
**Requirements**: SIM-03, SIM-05, SIM-06
**Success Criteria** (what must be TRUE):
  1. User can set ambient temperature and see burn rate predictions adjust based on the powder's temperature sensitivity coefficient
  2. User can observe bullet jump / freebore engraving resistance reflected as additional pressure during bullet start in the simulation
  3. User can model semi-auto gas port pressure loss showing reduced effective pressure after the bullet passes the gas port location
**Plans**: TBD

Plans:
- [ ] 04-01: Implement temperature sensitivity modifier on burn rate
- [ ] 04-02: Model bullet jump and freebore engraving resistance
- [ ] 04-03: Model semi-auto gas port pressure bleed-off

### Phase 5: Analysis & UX Tools
**Goal**: Users have practical reloading tools beyond simulation: group analysis at the range, input sanity checking, and printable records
**Depends on**: Phase 1
**Requirements**: TOOL-01, TOOL-02, TOOL-03
**Success Criteria** (what must be TRUE):
  1. User can place shots on a virtual target and see calculated MOA, extreme spread, standard deviation, mean radius, and CEP
  2. User receives warnings when simulation inputs are inconsistent (bullet diameter vs bore diameter mismatch, charge weight vs case capacity mismatch, etc.)
  3. User can generate and print a formatted load data sheet with all parameters, expected results, safety status, and notes
**Plans**: TBD

Plans:
- [ ] 05-01: Build shot group analysis tool with interactive target canvas
- [ ] 05-02: Implement input validation inspector with cross-checks
- [ ] 05-03: Build printable load data sheet generator

### Phase 6: 2D/3D Viewers
**Goal**: Users can see accurate, interactive visual representations of their cartridges and rifles generated from database dimensions
**Depends on**: Phase 3
**Requirements**: VIEW-01, VIEW-02, VIEW-03, VIEW-04
**Success Criteria** (what must be TRUE):
  1. Cartridge detail page shows a 2D SVG technical drawing with all CIP/SAAMI dimensions annotated and interactive hover for values
  2. Rifle detail page shows a 2D cross-section SVG showing chamber, bore, and barrel profile with dimensions
  3. Cartridge detail page includes a 3D rotatable model generated parametrically from cartridge dimensions using React Three Fiber
  4. Rifle detail page includes a 3D rotatable model showing barrel, chamber, and action cross-section
**Plans**: TBD

Plans:
- [ ] 06-01: Build 2D SVG cartridge and rifle technical drawings
- [ ] 06-02: Build 3D interactive cartridge viewer (React Three Fiber + LatheGeometry)
- [ ] 06-03: Build 3D interactive rifle viewer with cutaway toggle

### Phase 7: Community Features
**Goal**: Users contribute real-world firing data to improve powder model accuracy, creating a network effect that no desktop tool can match
**Depends on**: Phase 1, Phase 3, Phase 4
**Requirements**: COMM-01, COMM-02, COMM-03, COMM-04
**Success Criteria** (what must be TRUE):
  1. User can submit chronograph data (velocities, charge weight, components) and the system calculates prediction error vs current model
  2. When enough submissions exist for a powder, the system can derive optimized burn parameters using global optimization and the powder quality level upgrades automatically
  3. User can publish, browse, filter, and rate community load recipes with associated chrono data
  4. User can import PressureTrace II data and see it overlaid on the simulated pressure curve
  5. Community-submitted data passes safety validation (charge weight bounds, velocity sanity checks) before acceptance
**Plans**: TBD

Plans:
- [ ] 07-01: Build authentication infrastructure (JWT + device-based)
- [ ] 07-02: Build chrono data submission pipeline with safety validation
- [ ] 07-03: Implement reverse-engineering algorithm for powder parameter optimization
- [ ] 07-04: Build shared load recipes (publish, browse, filter, rate)
- [ ] 07-05: Implement PressureTrace II data import and overlay

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7

Note: Phases 2, 4, and 5 have minimal interdependency and could overlap. Phase 6 depends on Phase 3 for populated databases. Phase 7 depends on Phases 1, 3, and 4.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. 3-Curve Burn Model | 3/3 | Complete | 2026-02-21 |
| 2. Extended Simulation Charts | 3/4 | In progress | - |
| 3. Data Import Pipeline | 0/4 | Not started | - |
| 4. Advanced Simulation Models | 0/3 | Not started | - |
| 5. Analysis & UX Tools | 0/3 | Not started | - |
| 6. 2D/3D Viewers | 0/3 | Not started | - |
| 7. Community Features | 0/5 | Not started | - |
