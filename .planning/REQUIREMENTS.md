# Requirements: Simulador de Balistica v1.3

**Defined:** 2026-02-27
**Core Value:** The most accurate internal ballistics simulation available, validated against published load data, with comprehensive pre-loaded databases so users can simulate immediately without manual data entry.

## v1.3 Requirements

Requirements for milestone v1.3: Data Expansion + Visual Viewers. Each maps to roadmap phases.

### Data Expansion

- [ ] **DATA-01**: User can browse 500+ bullets covering Sierra, Hornady, Berger, Nosler, Lapua, Barnes, Speer
- [ ] **DATA-02**: User can upload bullet data via JSON file with preview and collision handling
- [ ] **DATA-03**: User can upload cartridge data via JSON file with preview and collision handling
- [ ] **DATA-04**: User can upload bullet/cartridge data via CSV file (strict format) with preview
- [ ] **DATA-05**: Community-contributed data shows quality badge capped at danger level (max 35/100) until verified
- [ ] **DATA-06**: Simulations using community-sourced components display a prominent safety warning banner

### Schema Extensions

- [ ] **SCHM-01**: Cartridge model extended with 5 optional drawing fields (shoulder_angle_deg, neck_length_mm, body_length_mm, rim_thickness_mm, case_type)
- [ ] **SCHM-02**: Bullet model extended with 4 optional rendering fields (bearing_surface_mm, boat_tail_length_mm, meplat_diameter_mm, ogive_type)
- [ ] **SCHM-03**: Geometry engine estimates missing dimensions from existing data with documented heuristics

### 2D SVG Drawings

- [ ] **VIS2-01**: User can view cartridge cross-section SVG with labeled dimensions from DB data
- [ ] **VIS2-02**: User can view cartridge-in-chamber drawing showing headspace, freebore, and rifling engagement
- [ ] **VIS2-03**: User can view full assembly drawing with barrel and OBT harmonic node positions overlaid
- [ ] **VIS2-04**: Drawings degrade gracefully in three tiers based on data completeness (full, basic, insufficient)
- [ ] **VIS2-05**: User can export 2D drawings as PNG

### 3D Viewer

- [ ] **VIS3-01**: User can view interactive 3D parametric cartridge model generated from DB dimensions
- [ ] **VIS3-02**: User can rotate, zoom, and pan the 3D model
- [ ] **VIS3-03**: User can toggle cutaway half-section view showing internal structure
- [ ] **VIS3-04**: 3D viewer loads via code splitting with no impact on other page load times
- [ ] **VIS3-05**: WebGL context properly disposed on page navigation (no memory leak after 20+ navigations)

### Search

- [ ] **SRCH-01**: Parametric powder search filters by caliber-appropriate burn rate range before simulation
- [ ] **SRCH-02**: Caliber filter is optional and backward-compatible (off by default)

## Future Requirements

Deferred to v1.4. Tracked but not in current roadmap.

### Visualization Enhancements
- **VIS-F01**: CSV column mapping UI for flexible file format support
- **VIS-F02**: Interactive dimension editing on 3D model (click dimension, type new value)
- **VIS-F03**: Bullet ogive profile in 2D SVG (tangent/secant/VLD shape rendering)

### Rifle Model Extensions
- **RFL-F01**: Freebore and throat angle fields on Rifle model for precise chamber drawings

## Out of Scope

| Feature | Reason |
|---------|--------|
| CAD-quality 3D with thread detail and primer flash hole | Massive complexity for zero simulation value |
| Pre-built GLTF/OBJ mesh files per cartridge | Defeats parametric approach, requires asset pipeline |
| Scraping manufacturer websites for bullet data | Legal risk, brittle, unnecessary when public specs available |
| Authentication for community contributions | Premature; no community exists yet |
| External ballistics trajectory in 3D | Different physics domain; handoff to external tools |
| Wildcat cartridge designer | Complex liability, explicitly out of scope |
| CSV column mapping UI | UX complexity deferred to v1.4 |
| Real-time collaborative data editing | Over-engineering for data contribution workflow |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | — | Pending |
| DATA-02 | — | Pending |
| DATA-03 | — | Pending |
| DATA-04 | — | Pending |
| DATA-05 | — | Pending |
| DATA-06 | — | Pending |
| SCHM-01 | — | Pending |
| SCHM-02 | — | Pending |
| SCHM-03 | — | Pending |
| VIS2-01 | — | Pending |
| VIS2-02 | — | Pending |
| VIS2-03 | — | Pending |
| VIS2-04 | — | Pending |
| VIS2-05 | — | Pending |
| VIS3-01 | — | Pending |
| VIS3-02 | — | Pending |
| VIS3-03 | — | Pending |
| VIS3-04 | — | Pending |
| VIS3-05 | — | Pending |
| SRCH-01 | — | Pending |
| SRCH-02 | — | Pending |

**Coverage:**
- v1.3 requirements: 21 total
- Mapped to phases: 0
- Unmapped: 21 ⚠️

---
*Requirements defined: 2026-02-27*
*Last updated: 2026-02-27 after initial definition*
