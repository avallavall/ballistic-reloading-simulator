# GRTools (Gordon's Reloading Tool) - Feature Analysis & Competitive Roadmap

**Author**: research-grtools agent
**Date**: 2026-02-12
**Purpose**: Comprehensive feature inventory of GRTools to guide our simulator's roadmap.

---

## 1. Overview

### What is GRTools?
Gordon's Reloading Tool (GRT) is a **free**, community-supported internal ballistics simulation program for handloaders and ammunition designers. It simulates combustion characteristics, pressures, and bullet speeds through ballistic parameters and formulas. It is the primary free alternative to QuickLoad (~$160 USD).

### Key Facts
| Property | Value |
|----------|-------|
| **Developer** | "Gordon" (Rocket2MyLuna community) |
| **Price** | Free (requires registration at grtools.de) |
| **Platforms** | Windows (primary), Linux (cross-compiled), Mac (via CrossOver/Wine) |
| **Architecture** | Native desktop application (portable, no install required) |
| **Database** | Community-crowdsourced powder models, continuously updated |
| **License** | Freeware, closed-source |
| **Accuracy** | Reported 99.3% accuracy without tuning in some tests |

### Our Advantage as a Web App
GRT is a desktop-only application. Our web-based simulator can target users who want:
- Cross-platform access without downloads (especially Mac/mobile users)
- Cloud storage of loads and results
- Modern responsive UI vs GRT's dense desktop interface
- API integration with other tools and services

---

## 2. Complete Feature Inventory

### 2.1 Core Simulation Engine

| Feature | GRT | Our Status | Priority | Complexity | Notes |
|---------|-----|------------|----------|------------|-------|
| Internal ballistics simulation (P, V curves) | Yes | **Have** | - | - | Our core solver works |
| 3-curve powder burn model | Yes | **Don't have** | P1 | High | We use single Vieille law; GRT uses 3 curves (see Section 4) |
| SAAMI/CIP pressure safety validation | Yes | **Have** | - | - | We check max pressure |
| Automatic recoil & impulse calculation | Yes | **Don't have** | P2 | Low | Simple momentum calculation from muzzle velocity + bullet mass + powder charge |
| Black powder calculator | Yes | **Don't have** | P3 | Medium | Niche feature, low priority |
| Bullet jump / freebore modeling | Experimental | **Don't have** | P2 | Medium | Models engraving resistance as bullet enters rifling; GRT notes this is still experimental and mainly tested with straight-wall cartridges |
| Barrel/bullet resistance curves | Experimental | **Don't have** | P2 | Medium | Friction model during bullet travel; GRT marks as experimental |
| Semi-auto gas port pressure loss | Yes | **Don't have** | P2 | Medium | Models gas bleed-off through the gas port in semi-auto actions; reduces effective pressure after bullet passes port |
| Revolver cylinder gap gas loss | Yes | **Don't have** | P3 | Medium | Models gas escape between cylinder and barrel; niche feature |
| Heat loss model | Unknown | **Don't have** | P1 | High | Our adiabatic model overpredicts ~2x; this is our biggest accuracy gap (Task #3: Thornhill model) |

### 2.2 Data Management & Databases

| Feature | GRT | Our Status | Priority | Complexity | Notes |
|---------|-----|------------|----------|------------|-------|
| Powder database with search | Yes | **Have** (basic) | P1 | Low | GRT has color-coded quality indicators (red/yellow/green) for powder models |
| Bullet database with search | Yes | **Have** (basic) | - | - | We have CRUD for bullets |
| Cartridge/caliber database (CIP specs) | Yes | **Have** (basic) | P2 | Low | GRT auto-generates CIP technical drawings; we just store dimensions |
| Rifle database | Yes | **Have** | - | - | |
| Load file storage with notes/images | Yes | **Partial** | P2 | Medium | GRT lets users attach photos and text notes to saved load files |
| Parametric powder search | Yes | **Don't have** | P1 | Medium | Search powders by similarity to current selection within tolerance windows |
| Powder comparison tables | Yes | **Don't have** | P1 | Low | Side-by-side comparison of multiple powders for a given cartridge |
| Community powder model sharing | Yes | **Don't have** | P2 | High | GRT's killer feature: crowdsourced powder models from user firing data |

### 2.3 Analysis & Optimization Tools

| Feature | GRT | Our Status | Priority | Complexity | Notes |
|---------|-----|------------|----------|------------|-------|
| Loading ladder with interactive diagram | Yes | **Don't have** | P0 | Medium | Already planned (Task #8); GRT shows charge weight vs velocity/pressure interactively |
| OBT (Optimal Barrel Time) tool | Yes | **Partial** | P1 | Medium | We have harmonics.py but not integrated into solver yet (Task #2); GRT auto-calculates OBT nodes and required powder charge |
| Shot group analysis tool | Yes | **Don't have** | P2 | Medium | Users click-drag shot positions on target image; calculates MOA, ES, SD |
| Generic tolerance synthesis | Yes | **Don't have** | P2 | High | Recursive simulation across tolerance windows for powder charge, finds charge ranges meeting pressure/velocity criteria simultaneously |
| PressureTrace II overlay | Yes | **Don't have** | P2 | Medium | Import and overlay real pressure trace data on simulated curves |

### 2.4 Data Import/Export & Integrations

| Feature | GRT | Our Status | Priority | Complexity | Notes |
|---------|-----|------------|----------|------------|-------|
| LabRadar chronograph import | Yes | **Don't have** | P1 | Low | CSV/data import from LabRadar Doppler chronograph |
| MagnetoSpeed import | Yes | **Don't have** | P1 | Low | Import from MagnetoSpeed bayonet chronograph |
| Caldwell/ProChrono import | Yes | **Don't have** | P2 | Low | Less popular chronographs |
| PressureTrace II full integration | Yes (GRTrace plugin) | **Don't have** | P2 | Medium | GRTrace plugin replaces RSI's original software |
| QuickLoad file import | Yes | **Don't have** | P3 | Medium | Import QL load files (parameter conversion needed: Factor_b -> z2) |
| Report generation with printing | Yes | **Don't have** | P2 | Medium | Printable load data sheets |
| CSV/PDF export | Unknown | **Don't have** | P1 | Low | Already planned (Task #5) |

### 2.5 User Interface & UX

| Feature | GRT | Our Status | Priority | Complexity | Notes |
|---------|-----|------------|----------|------------|-------|
| Compact mode (beginners) | Yes | **Don't have** | P2 | Medium | Simplified view hiding advanced parameters |
| Expert mode (full control) | Yes | **Partial** | - | - | Our current UI is roughly "expert mode" |
| Input wizard / guided setup | Yes | **Don't have** | P1 | Medium | Step-by-step guide for new users |
| Inspector (input error detection) | Yes | **Don't have** | P1 | Medium | Validates inputs and warns about inconsistencies |
| Unit converter | Yes | **Don't have** | P1 | Low | We convert internally but no user-facing converter tool |
| Quick-help field descriptions | Yes | **Don't have** | P1 | Low | Tooltip/help text on every input field |
| CIP caliber technical drawings | Yes | **Don't have** | P3 | High | Auto-generated SVG drawings from caliber dimensions |

### 2.6 Assistants / Calculators

| Feature | GRT | Our Status | Priority | Complexity | Notes |
|---------|-----|------------|----------|------------|-------|
| Effective cross-section calculator | Yes | **Don't have** | P2 | Low | Calculate bore area from measurements |
| Projectile specification assistant | Yes | **Don't have** | P2 | Low | Help measure/enter bullet dimensions |
| Initial pressure assistant | Yes | **Don't have** | P2 | Low | Calculate primer-induced start pressure |
| Powder mass assistant | Yes | **Don't have** | P2 | Low | Volumetric-to-mass powder conversion |
| Temperature coefficient assistant | Yes | **Don't have** | P2 | Medium | Calculate powder temp sensitivity from multi-temp data |
| Cartridge designer | Yes | **Don't have** | P3 | High | Design wildcat cartridges with custom dimensions |

---

## 3. UI/UX Analysis

### 3.1 GRT Layout Description

GRT uses a **dense, single-window desktop layout** with the following structure:

- **Left panel**: Input parameters organized in collapsible sections:
  - Caliber/cartridge selection (dropdown + CIP drawing in Expert mode)
  - Projectile selection (dropdown + specs)
  - Propellant selection (dropdown + model quality indicator)
  - Charge weight (slider + numeric input)
  - Barrel specifications
  - Advanced options (bullet jump, gas port, etc.)

- **Center/Right panel**: Results display:
  - Pressure-time and velocity-distance curves
  - Numeric results table (peak pressure, muzzle velocity, etc.)
  - Safety indicators (vs SAAMI/CIP max)

- **Toolbar**: Access to databases, calculators, OBT tool, ladder test, shot group analysis, powder search, settings

- **Status bar**: Unit display, calculation status

### 3.2 Two Modes
1. **Compact Mode**: Hides advanced parameters, shows only essential inputs (caliber, bullet, powder, charge weight, barrel length). Recommended for beginners.
2. **Expert Mode**: Shows all parameters including CIP drawing, advanced options, all output fields. Full control.

### 3.3 Key UX Patterns We Should Adopt

1. **Progressive disclosure**: Compact/Expert mode toggle. We should implement a "Simple" vs "Advanced" simulation form.
2. **Inline quality indicators**: Color-coded powder model quality (red/yellow/green). We should show data confidence levels.
3. **Interactive ladder diagram**: GRT shows charge weight ladder with velocity and pressure on interactive chart. Users can click points to see details.
4. **Input validation with suggestions**: The Inspector checks for inconsistent inputs (e.g., bullet diameter vs bore diameter mismatch) and suggests corrections.
5. **Contextual help**: Every input field has quick-help tooltip. Low-effort, high-value UX improvement.
6. **Unit flexibility**: Users can choose their preferred unit system. We should offer MPa/PSI toggle, m/s/FPS toggle, etc.

### 3.4 UX Weaknesses of GRT (Our Opportunities)

1. **Desktop-only**: No web access, no mobile. Major gap we fill.
2. **Visually busy**: Users complain about cluttered interface. Modern web UI with Tailwind can be much cleaner.
3. **No cloud sync**: Load files are local. We offer cloud storage by default.
4. **No collaboration**: Single-user only. We could add shared workspaces.
5. **Dated look**: While more modern than QuickLoad, still looks like a 2015-era desktop app.

---

## 4. Combustion Model Analysis

### 4.1 GRT's 3-Curve Model vs QuickLoad's 2-Curve

This is the most significant **technical differentiator** between GRT and QuickLoad.

**QuickLoad (2-curve model)**:
- Uses two parameters to define the powder burn rate characteristic
- "Factor a" and "Factor b" define the burn rate law
- Essentially a modified Vieille law: `dZ/dt = a * P^b * f(Z)`
- Where `f(Z)` is the form function (geometry-dependent)

**GRT (3-curve model)**:
- Uses **three** parameters for the burn rate characteristic
- The additional curve allows modeling of the **tail-end** of combustion more accurately
- GRT parameters include combustion coefficient `Ba`, isentropic exponent `k`, and a third parameter
- The z2 parameter in GRT relates to QuickLoad's "Factor b" via a conversion formula
- Example: QuickLoad Factor_b = 1.5349 converts to GRT z2 = 0.8374

**Why 3 curves matter**:
- Real powder combustion doesn't follow a simple 2-parameter law throughout the entire burn
- The initial burn phase, main burn phase, and tail-off phase have different characteristics
- GRT's 3rd curve better captures the pressure decay after peak, which affects:
  - Muzzle velocity prediction accuracy
  - Gas port pressure in semi-autos
  - OBT calculations (barrel time is sensitive to late-phase pressure)

### 4.2 What Parameters Does GRT Use That We Don't?

| GRT Parameter | Our Equivalent | Gap |
|---------------|---------------|-----|
| Ba (combustion coefficient) | `burn_rate_coeff` in PowderParams | Similar concept |
| k (isentropic exponent) | `gamma` (ratio of specific heats) | Similar concept |
| z2 (3rd curve parameter) | **None** | Key gap - we only have 2-parameter burn model |
| Powder quality indicator (R/Y/G) | **None** | UX gap |
| Temperature coefficient | **None** | We don't model temp sensitivity |
| Powder lot variation | **None** | We don't model lot-to-lot variation |

### 4.3 How GRT Handles Calibration

GRT uses a **community-driven calibration loop**:

1. **Initial model**: Powder burn parameters derived from pressure bomb measurements and manufacturer data
2. **User feedback**: Users fire real loads, measure velocity with chronographs, submit results
3. **Reverse engineering**: GRT algorithms reverse-engineer powder model parameters from actual firing data
4. **OBT tuning**: The OBT function auto-tunes `Ba` and `k` to match observed velocities (Ba can vary ~+/-3%)
5. **Quality rating**: As more user data accumulates, powder model quality improves:
   - **Red**: Insufficient data, needs real-world measurements
   - **Yellow**: Some data, needs more measurements
   - **Green**: Good to very good data basis

**Recommended calibration process for users**:
1. Fire ~10 rounds over a chronograph
2. Measure actual bullet dimensions and fired case water capacity
3. Run OBT function to calibrate Ba and k to observed velocities
4. GRT file is now tuned to the specific rifle

### 4.4 Implications for Our Simulator

Our current model uses:
- Single Vieille burn rate law (2 parameters: coefficient + exponent)
- Adiabatic assumption (no heat loss) -> ~2x overprediction
- No calibration mechanism

**Recommended improvements (in order)**:
1. **P0**: Implement Thornhill heat loss model (Task #3) - This alone should fix the ~2x overprediction and is more impactful than changing the burn model
2. **P1**: Add a 3rd burn rate parameter to capture tail-off behavior
3. **P1**: Add temperature sensitivity coefficient to powder model
4. **P2**: Implement user calibration flow (input chrono data -> auto-tune Ba/k)
5. **P2**: Add powder model quality indicators

---

## 5. Prioritized Roadmap

### 5.1 What Makes GRTools Special vs QuickLoad

1. **Free**: Zero cost barrier vs $160 for QuickLoad
2. **3-curve burn model**: More accurate powder combustion simulation
3. **Community powder database**: Crowdsourced and continuously improving
4. **OBT integration**: Automatic optimal barrel time node calculation
5. **Chronograph data import**: LabRadar, MagnetoSpeed, etc.
6. **PressureTrace overlay**: Real pressure data on simulated curves
7. **More frequent updates**: QuickLoad updates are slow/rare

### 5.2 Quick Wins (Low Effort, High Value)

These features can be implemented quickly and significantly improve our competitive position:

| # | Feature | Effort | Value | Notes |
|---|---------|--------|-------|-------|
| 1 | Unit toggle (PSI/MPa, FPS/m/s) in UI | 1-2 days | High | Users expect this; we already convert internally |
| 2 | Tooltip help text on simulation inputs | 1 day | Medium | Every field gets a short explanation |
| 3 | Recoil/impulse calculation | 1 day | Medium | `recoil_energy = 0.5 * m_bullet * v_muzzle^2` + powder gas contribution |
| 4 | Powder comparison table | 2-3 days | High | Run simulation with multiple powders, show results side-by-side |
| 5 | CSV export of simulation results | 1 day | Medium | Already planned (Task #5) |
| 6 | LabRadar CSV import | 1-2 days | Medium | Parse LabRadar CSV, overlay on simulation |
| 7 | Simple/Advanced mode toggle | 2 days | High | Hide advanced fields by default |

### 5.3 Medium-Term Features (1-2 Weeks Each)

| # | Feature | Effort | Value | Notes |
|---|---------|--------|-------|-------|
| 1 | Thornhill heat loss model | 1 week | **Critical** | Fixes our ~2x overprediction; highest priority |
| 2 | Loading ladder with interactive chart | 1 week | High | Already planned (Task #8) |
| 3 | OBT node calculation | 1 week | High | We have harmonics.py; need to integrate + add auto-charge-calc |
| 4 | User calibration flow | 1-2 weeks | High | Input chrono data -> auto-tune solver parameters |
| 5 | Parametric powder search | 1 week | Medium | Find similar powders within tolerance windows |
| 6 | Shot group analysis tool | 1 week | Medium | Click-to-place shots on target, calculate MOA/ES/SD |
| 7 | Input validation inspector | 1 week | Medium | Cross-check all inputs for consistency |

### 5.4 Long-Term Features (1+ Month)

| # | Feature | Effort | Value | Notes |
|---|---------|--------|-------|-------|
| 1 | 3-curve powder burn model | 2-3 weeks | High | Fundamental engine upgrade |
| 2 | Community powder model system | 1+ month | Very High | User data submission + reverse engineering |
| 3 | Semi-auto gas port modeling | 2 weeks | Medium | Niche but differentiating |
| 4 | Temperature sensitivity modeling | 2 weeks | Medium | Requires temp coefficient data |
| 5 | PressureTrace II integration | 2 weeks | Medium | Real pressure trace overlay |
| 6 | Cartridge designer (wildcat) | 3-4 weeks | Low | Very niche feature |
| 7 | Revolver cylinder gap modeling | 1 week | Low | Very niche feature |

### 5.5 Our Competitive Differentiators vs GRT

Features where we can **surpass** GRT:

1. **Web-based**: No download, works on any device including mobile/tablet
2. **Modern UI**: Clean, responsive design vs GRT's cluttered desktop UI
3. **Cloud storage**: Loads, simulations, and results stored in the cloud
4. **API-first**: REST API allows integration with other tools and automation
5. **Real-time collaboration**: Share loads and results with shooting partners
6. **Visual design**: Better charts (Recharts) with interactive features
7. **Accessibility**: Spanish interface, easy internationalization for other languages

---

## 6. Summary & Recommendations

### Immediate Actions (This Sprint)
1. Complete **Thornhill heat loss model** (Task #3) - fixes accuracy, our biggest weakness
2. Complete **Ladder Test page** (Task #8) - matches GRT's most-used feature
3. Complete **Harmonics integration** (Task #2) - enables OBT calculations
4. Add **unit toggle** in simulation UI - quick win for usability

### Next Sprint
1. Add **chronograph data import** (LabRadar/MagnetoSpeed CSV)
2. Implement **user calibration flow** (tune solver to real data)
3. Add **powder comparison** feature
4. Implement **Simple/Advanced mode** toggle

### Future Sprints
1. Upgrade to **3-curve burn model**
2. Build **community powder database** with quality indicators
3. Add **semi-auto gas port** modeling
4. Add **temperature sensitivity** modeling

---

## Sources

- [GRTools Official Documentation](https://grtools.de/doku.php?id=grtools:en:doku:start)
- [GRTools Community Wiki](https://grtools.de/doku.php?id=en:doku:start/)
- [GRTools How to Start Using (Reloaders Network)](https://www.thereloadersnetwork.com/2019/12/13/gordons-reloading-tool-grt-how-to-start-using/)
- [GRTools Free Simulation Software (Reloaders Network)](https://www.thereloadersnetwork.com/2019/06/05/grtools-reloading-simulation-software-for-free/)
- [GRT vs QuickLoad (Accurate Shooter Forum)](https://forum.accurateshooter.com/threads/gordons-reloading-tool-vs-quickload.4013760/)
- [GRT vs QuickLoad (Maryland Shooters)](https://www.mdshooters.com/threads/quickload-vs-grt.256908/)
- [GRT Discussion (Sniper's Hide)](https://www.snipershide.com/shooting/threads/grt-gordons-reloading-tool-discussion.7099493/)
- [GRT Gas Port Discussion (Sniper's Hide)](https://www.snipershide.com/shooting/threads/gordons-reloading-tool-what-data-points-are-important-and-how-do-you-enter-the-gas-port-length-for-calculating-semi-auto.7267428/)
- [GRT Freebore/Chamber Design (Shooters Forum)](https://www.shootersforum.com/threads/gordons-reloading-tool-chamber-design-freebore-throat-leade.239518/)
- [GRT OBT Discussion (Accurate Shooter Forum)](https://forum.accurateshooter.com/threads/obt-using-gordons-reloading-tool-grt.4031317/)
- [GRT Powder Model Development (Accurate Shooter Forum)](https://forum.accurateshooter.com/threads/gathering-data-for-powder-model-development-gordons-reloading-tool.4072119/)
- [GRT Community Databases (GitHub)](https://github.com/zen/grt_databases)
- [GRT Download Page](https://www.grtools.de/doku.php?id=download)
