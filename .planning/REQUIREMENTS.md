# Requirements: Simulador de Balistica v2

**Defined:** 2026-02-20
**Core Value:** The most accurate internal ballistics simulation available, validated against published load data, with comprehensive pre-loaded databases and modern web UX.

## v1 Requirements

Requirements for the v2 milestone. Each maps to roadmap phases.

### Simulation Engine

- [x] **SIM-01**: Solver uses 3-curve powder burn model with piecewise form function (z1/z2 phase transitions for initial, main, and tail-off combustion)
- [x] **SIM-02**: Powder model stores and uses GRT-native parameters (Ba, k, z1, z2, Bp, Br, Brp) as first-class fields
- [ ] **SIM-03**: Temperature sensitivity coefficient modifies burn rate based on ambient temperature (tcc/tch fields per powder)
- [x] **SIM-04**: Validation test suite verifies predictions within 5% of published load manual data for 20-30 reference loads (Hodgdon, Sierra, Hornady)
- [ ] **SIM-05**: Bullet jump / freebore engraving resistance modeled as additional pressure during bullet start
- [ ] **SIM-06**: Semi-auto gas port pressure loss modeled (gas bleed-off reduces effective pressure after bullet passes port)

### Pre-loaded Databases

- [ ] **DATA-01**: Powder database contains 200+ powders imported from GRT community database with all burn model parameters
- [ ] **DATA-02**: Bullet database contains 500+ bullets from manufacturer specs (Sierra, Hornady, Berger, Nosler, Lapua) with bearing surface, boat tail dimensions, and BCs
- [ ] **DATA-03**: Cartridge database contains 50+ cartridges with full CIP/SAAMI dimensional data (20+ dimension fields per cartridge)
- [ ] **DATA-04**: Powder entries display quality indicator badges (red/yellow/green) based on model confidence level

### Simulation Charts

- [ ] **CHART-01**: Energy and momentum curves displayed (kinetic energy vs distance, recoil impulse over time)
- [ ] **CHART-02**: Powder burn progress chart shows burn fraction Z vs time and gas generation rate dZ/dt
- [ ] **CHART-03**: Temperature and heat curves show gas temperature, barrel wall temperature estimate, and cumulative heat loss over time
- [ ] **CHART-04**: Sensitivity analysis shows error bands on pressure/velocity charts for +/- charge weight variation
- [ ] **CHART-05**: Interactive sensitivity explorer allows user to drag sliders (charge weight, seating depth, barrel length) and see pressure/velocity update in real-time

### 2D/3D Viewers

- [ ] **VIEW-01**: Cartridge page shows 2D technical drawing (SVG) with all CIP/SAAMI dimensions annotated and interactive hover for values
- [ ] **VIEW-02**: Rifle page shows 2D cross-section drawing (SVG) showing chamber, bore, barrel profile with dimensions
- [ ] **VIEW-03**: Cartridge page includes 3D interactive rotatable model generated from cartridge dimensions (React Three Fiber + LatheGeometry)
- [ ] **VIEW-04**: Rifle page includes 3D interactive rotatable model showing barrel, chamber, and action cross-section

### Analysis & UX Tools

- [ ] **TOOL-01**: Shot group analysis tool allows user to place shots on virtual target and calculates MOA, extreme spread (ES), standard deviation (SD), mean radius, and CEP
- [ ] **TOOL-02**: Input validation inspector cross-checks all simulation inputs for inconsistencies and warns about mismatches (bullet diameter vs bore diameter, charge weight vs case capacity, etc.)
- [ ] **TOOL-03**: Printable load data sheets generated as formatted HTML/PDF with all load parameters, expected results, safety status, and notes
- [ ] **TOOL-04**: GRT .propellant file import parses XML and maps all parameters to powder model including 3-curve fields

### Community Features

- [ ] **COMM-01**: Community powder model database accepts user chronograph data submissions to improve powder model accuracy
- [ ] **COMM-02**: Reverse-engineering algorithm derives complete powder burn parameters (Ba, k, z1, z2) from user-submitted chrono data using global optimization
- [ ] **COMM-03**: Shared load recipes allow users to publish, browse, filter, and rate community load recipes with chrono data
- [ ] **COMM-04**: PressureTrace II data can be imported and overlaid on simulated pressure curves

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Calibration & Advanced

- **CAL-01**: User calibration flow auto-tunes solver parameters (Ba, k) to match chrono data for a specific rifle+powder combination
- **CAL-02**: Powder lot-to-lot variation modeling
- **CAL-03**: Revolver cylinder gap gas loss modeling

### Extended Platforms

- **PLAT-01**: Progressive Web App (PWA) with offline support and home screen install
- **PLAT-02**: Internationalization (i18n) framework for multi-language support

## Out of Scope

| Feature | Reason |
|---------|--------|
| Black powder calculator | Different combustion physics, zero overlap with precision reloading audience |
| Cartridge wildcat designer | Requires chamber pressure testing and liability considerations beyond simulation software |
| QuickLoad file import | Proprietary format, small user base overlap; GRT can already convert QL files |
| Mobile native app | Responsive web covers mobile; native app fragments development effort |
| Real-time collaboration | Reloading is individual; shared loads covers the social need |
| External ballistics solver | Different domain; tools like Applied Ballistics and Strelok dominate. Provide muzzle velocity/BC as outputs for external tools |
| User accounts before community features | Adds friction without benefit for solo users; add auth only when community features require it |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SIM-01 | Phase 1 | Complete |
| SIM-02 | Phase 1 | Complete |
| SIM-03 | Phase 4 | Pending |
| SIM-04 | Phase 1 | Complete |
| SIM-05 | Phase 4 | Pending |
| SIM-06 | Phase 4 | Pending |
| DATA-01 | Phase 3 | Pending |
| DATA-02 | Phase 3 | Pending |
| DATA-03 | Phase 3 | Pending |
| DATA-04 | Phase 3 | Pending |
| CHART-01 | Phase 2 | Pending |
| CHART-02 | Phase 2 | Pending |
| CHART-03 | Phase 2 | Pending |
| CHART-04 | Phase 2 | Pending |
| CHART-05 | Phase 2 | Pending |
| VIEW-01 | Phase 6 | Pending |
| VIEW-02 | Phase 6 | Pending |
| VIEW-03 | Phase 6 | Pending |
| VIEW-04 | Phase 6 | Pending |
| TOOL-01 | Phase 5 | Pending |
| TOOL-02 | Phase 5 | Pending |
| TOOL-03 | Phase 5 | Pending |
| TOOL-04 | Phase 3 | Pending |
| COMM-01 | Phase 7 | Pending |
| COMM-02 | Phase 7 | Pending |
| COMM-03 | Phase 7 | Pending |
| COMM-04 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after roadmap creation (all 27 requirements mapped to phases)*
