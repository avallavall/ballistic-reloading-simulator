# Feature Landscape: Simulador de Balistica v2

**Domain:** Internal ballistics simulation for precision ammunition reloading
**Researched:** 2026-02-20
**Target benchmark:** Surpass GRT (Gordon's Reloading Tool) and QuickLoad

---

## Table Stakes

Features users expect from a tool competing with GRT. Missing any of these = users stay with GRT.

### Simulation Engine Accuracy

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 3-curve powder burn model | GRT's core accuracy advantage over QuickLoad. Users expect <5% velocity error without tuning. Our 2-parameter Vieille model has a theoretical accuracy ceiling that the 3-curve model surpasses. | **High** | GRT uses Ba (vivacity coefficient), k (isentropic exponent), z1 (burn-up limit 1), z2 (burn-up limit 2), Bp (progressivity), Br (brisance), Brp (combined). The z1/z2 parameters define phase transitions in the burn: initial ignition -> main combustion -> tail-off. This is the single most impactful feature for accuracy. |
| Temperature sensitivity coefficient | GRT stores `tcc` (cold) and `tch` (hot) temperature coefficients per powder. Reloaders shooting in varied climates need this. Hodgdon publishes temp sensitivity data. | **Medium** | Add two fields to powder model. Adjust Ba based on temperature. Most modern powders (Hodgdon Extreme series) are marketed on temp stability. |
| Validation against published load data | Users test new tools against known-good data from Hodgdon, Sierra, Hornady manuals. If our simulator doesn't match published velocity/pressure within 5%, users won't trust it. | **Medium** | Build a validation test suite: pick 20-30 well-documented loads from reloading manuals, simulate them, compare against published data. Not a user-facing feature but a credibility requirement. |

### Pre-loaded Component Databases

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Comprehensive powder database (200+ powders) | GRT ships with 200+ powder models. QuickLoad has 225+. Our 22 powders is laughably insufficient. Users will not manually enter powder burn parameters. | **High** | Import GRT community database (GitHub: zen/grt_databases, CC0 licensed). The GRT `.propellant` XML format stores: Ba, k, z1, z2, Bp, Br, Brp, Qex (heat of explosion kJ/kg), eta (covolume cm3/g), pc (material density kg/m3), pcd (bulk density kg/m3), pt (temperature C), tcc/tch (temp coefficients), Qlty (quality rating 0-3). Our powder model needs new fields: z1, z2, Bp, Br, Brp, Qex, bulk_density, quality_rating, temp_cold_coeff, temp_hot_coeff. |
| Comprehensive bullet database (500+ bullets) | QuickLoad ships with 2,500+ projectiles. Users need their specific bullet. Missing a bullet = user leaves. | **High** | Source from manufacturer public specs: Sierra (300+ bullets), Hornady (200+), Berger (150+, publishes reference charts with bearing surface, base-to-ogive, nose length, boat tail dimensions), Nosler (100+), Lapua (50+). The GRT `.projectile` format stores: gdia (diameter mm), glen (length mm), gmass (weight grains), gpressure (engraving pressure bar), gfriction, gtailDiaA/B, gtailh (boat tail dims), gtailType, gdepthmax, g1bc, g7bc, gUBCS (universal bullet coding). Our bullet model needs new fields: bearing_surface_mm, nose_length_mm, base_to_ogive_mm, boat_tail_length_mm, boat_tail_diameter_mm, engraving_pressure_bar. |
| Comprehensive cartridge database (50+ cartridges) | GRT community repo has 64 caliber files with full CIP dimensional data (20+ dimension fields per cartridge). Users expect to select their cartridge from a list. | **Medium** | Source from SAAMI (free online drawings) and CIP. The GRT `.caliber` format stores extensive dimensional data: L0-L6 (lengths), R/R1/R3 (radii), E/E1/Emin (dimensions), delta (shoulder angle), Pmax/PK/PE (pressure specs), V (case capacity cc), M (bullet weight g), plus chamber dimensions (c_* prefix fields). Minimum: the 50 most popular centerfire rifle + pistol cartridges. |
| Powder model quality indicators | GRT uses red/yellow/green quality ratings so users know which powder models to trust. Without this, users won't know if a simulation result is reliable. | **Low** | The `Qlty` field in GRT format: 0=unknown/red (needs real-world data), 1=yellow (some data), 2=green (good data basis). Display as colored badge next to powder name in UI. |

### Analysis & Output

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Sensitivity analysis / error bands | GRT's "tolerance synthesis" runs recursive simulations varying charge weight within a window, showing how pressure and velocity change. Users need to know "if I'm +/- 0.1 grain, what happens?" | **Medium** | Run simulation at charge -delta, charge, charge +delta (e.g., +/- 0.3 grains). Plot error bands on pressure/velocity charts. Show table: charge variation -> peak pressure range, muzzle velocity range. This is a natural extension of our existing ladder test. |
| Printable load data sheets / reports | Reloaders keep paper records at the bench. GRT generates printable reports. Users expect to print their load recipes. | **Low** | Generate a formatted HTML page or PDF with: cartridge, bullet, powder, charge weight, COAL, seating depth, expected velocity, expected pressure, safety status, date, notes. CSS @media print or html2pdf library. |
| Energy and momentum curves | QuickLoad shows kinetic energy vs distance. Reloaders use this for hunting (minimum impact energy at distance). | **Low** | Already have velocity curve. Energy = 0.5 * m * v^2 at each point. Add to velocity chart as secondary Y-axis or separate chart. Trivial calculation. |

### Data Import

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| GRT propellant file import | Users migrating from GRT will want to bring their powder models. The `.propellant` XML format is well-documented and CC0-licensed via community repo. | **Medium** | Parse XML, map fields to our powder model. Key mapping: Ba->burn_rate_coeff (with conversion), k->gamma, Qex->force_j_kg (with conversion: f = Qex * (k-1)), eta->covolume, pc->density. New fields: z1, z2, Bp, Br, Brp stored directly. |
| User calibration flow (chrono data -> tune solver) | GRT's OBT function lets users enter 3+ chrono velocities and auto-tunes Ba and k to match. This is how users get 99.3% accuracy. Without calibration, even a perfect model won't match a specific rifle. | **Medium** | Implement curve fitting: given known charge weights and measured velocities, optimize Ba and k (and optionally z1/z2) to minimize velocity prediction error. Use scipy.optimize.minimize. Store calibrated parameters per rifle+powder combination. |

---

## Differentiators

Features that set the product apart from GRT. Not expected, but create competitive advantage.

### Web-Native Advantages (GRT Cannot Replicate)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Cross-platform web access | GRT is Windows-only (Linux via cross-compile, Mac only via Wine/CrossOver). Our web app works on any device including iPad at the reloading bench, phone at the range, Chromebook. This is our single strongest differentiator. | **Already built** | Existing v1 advantage. Maintain and market. |
| Cloud storage of loads and results | GRT stores files locally. Lose your PC, lose your data. Our PostgreSQL backend provides persistent cloud storage. Share a load by sharing a URL. | **Already built** | Existing v1 advantage. |
| API-first architecture | GRT has no API. Our REST API enables: automation scripts, integration with chronograph apps, batch simulation, external tools consuming our data. | **Already built** | Existing v1 advantage. Publish API docs (OpenAPI/Swagger). |
| Modern responsive UI | GRT's interface is dense and dated. Our Tailwind + Recharts UI is cleaner and more approachable. Community consistently complains about GRT's cluttered interface. | **Already built** | Continue investing in UX polish. |

### Advanced Analysis Tools

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Shot group analysis tool | GRT has this but it's desktop-only. A web-based version accessible from your phone at the range is significantly more useful. Click/tap to place shots on a virtual target. Calculate: group size (CTC/extreme spread), MOA, mean radius, circular error probable (CEP), standard deviation (bivariate), group center offset from POA. | **Medium** | Interactive canvas or SVG element. User clicks to place shots at known distances. Statistics: ES = max pairwise distance, MOA = ES_inches / (distance_yards / 100) * 1.047, Mean Radius = avg distance from centroid, SD = sqrt(variance_x + variance_y). Reference implementation: OnTarget TDS calculates these. Add virtual groups (combine multiple sessions). |
| Powder burn progress chart | GRT doesn't show this but it's scientifically valuable. Show burn fraction Z vs time, gas generation rate dZ/dt. Helps users understand why some powders are "too fast" or "too slow" for a cartridge. | **Low** | Data already computed by solver (Z is state variable 0). Just expose it as a new chart series. Trivial to add alongside pressure/velocity curves. |
| Temperature and heat curves | Show gas temperature, barrel wall temperature estimate, cumulative heat loss over time. Unique visualization no competitor offers. Helps users understand barrel life and heat management. | **Low** | Data partially available from Thornhill model (Q_loss is state variable 3, T_gas computed in RHS function). Extract and chart T_gas vs time, Q_loss vs time. Low effort, high educational value. |
| Reverse-engineer powder from chrono data | Go beyond calibration: given chrono data and a cartridge/bullet/rifle, automatically derive a complete powder model (Ba, k, z1, z2). This would let users create powder models for powders not in any database. GRT requires the developer to do this manually. | **High** | Multi-parameter optimization problem. Need well-constrained data (multiple charge weights, ideally pressure data too). Use scipy.optimize.differential_evolution for global optimization. High value for niche/regional powders not in GRT's database. |
| Interactive sensitivity explorer | Beyond simple error bands: let users drag a slider for charge weight, seating depth, barrel length and see pressure/velocity update in real-time. No tool offers this level of interactivity. | **Medium** | Debounced API calls on slider change. Cache nearby simulation results. Show instant visual feedback. Requires fast solver (<100ms per simulation, which our RK45 solver already achieves). |

### 2D/3D Visualization

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 2D cartridge technical drawing | GRT auto-generates CIP technical drawings with all dimensions annotated. We can do this better with interactive SVG (hover for dimension values, highlight tolerance zones). Show: case body, shoulder, neck, bullet seated, chamber clearances. | **Medium** | Generate SVG programmatically from cartridge dimensional data. Use the 20+ dimension fields from CIP data (L0-L6, R/R1, E/E1, delta angle, etc). Interactive: hover dimensions to see values, click to compare with SAAMI max. |
| 2D rifle cross-section | Show barrel profile, chamber, bore, rifling, gas port (if semi-auto). Annotate barrel length, twist rate, bore/groove diameters. Educational and visually impressive. | **Medium** | Parametric SVG generation from rifle data. Less data-intensive than cartridge drawing since rifles have fewer standardized dimensions. |
| 3D interactive cartridge model | Rotatable 3D model of the loaded cartridge. Eye candy that no competitor offers. Demonstrates technical sophistication. | **High** | React Three Fiber + Three.js. Generate geometry programmatically from cartridge dimensions (lathe revolution of case profile). Realistic materials (brass case, copper bullet). Cool but not functionally critical -- defer if time-constrained. |

### Community Features

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Community powder model database | GRT's killer feature. Users submit chrono data, developer manually validates and updates models. We can automate this with our API: users submit measured velocities, system auto-updates powder model confidence. More data = better models = network effect. | **Very High** | Requires: user accounts (authentication), data submission endpoint, validation pipeline (reject outliers, require minimum shot count), aggregation algorithm (weighted average of Ba/k across submissions), quality score auto-calculation. This is a multi-month project but the ultimate competitive moat. |
| Shared load recipes | Users publish their tested loads with chrono data. Others can browse, filter by cartridge/powder/bullet, see community ratings. GRT doesn't have this as a first-class feature. | **High** | Requires user accounts. Build on existing Load model: add fields for notes, chrono data, photos, public/private flag, rating. Search/filter UI. Moderation considerations. |
| PressureTrace II data overlay | Import .grtrace files and overlay real pressure traces on simulated curves. GRT has GRTrace plugin for this. Small user base (PressureTrace II hardware costs $800+) but very high value for those users -- they are the most serious reloaders. | **Medium** | The .grtrace format stores time-series pressure data (~3ms of capture at high sample rate). Parse the file, resample to match our simulation time points, render as overlay series on PressureTimeChart. Requires understanding the .grtrace binary format (LOW confidence -- format not publicly documented). Alternative: support CSV export from GRTrace as import format. |

---

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Black powder calculator | Niche use case (muzzleloaders, cowboy action). Different physics (deflagration vs detonation characteristics differ significantly). Would require a separate combustion model. Zero overlap with precision reloading audience. | Focus on smokeless powder only. If asked, recommend separate tools. |
| Revolver cylinder gap gas loss modeling | Extremely niche. GRT has it but community feedback indicates almost nobody uses it. Complex to validate (gap dimensions vary per revolver). | Out of scope. Note in documentation. |
| Cartridge wildcat designer | Designing custom cartridges from scratch requires chamber pressure testing, proof loads, and liability considerations far beyond simulation software. GRT has it but marks it as advanced/experimental. Huge implementation complexity for tiny user base. | Support custom cartridge entry via manual dimension input. Don't build a parametric designer. |
| QuickLoad file import | QuickLoad's file format is proprietary. Small user base overlap (QL users tend to be loyal). GRT already handles QL conversion. Focus import effort on GRT format instead. | Import GRT `.propellant` files, which can already be converted from QL format using GRT itself. |
| Mobile native app | React Native / Flutter app would fragment development effort. Our responsive web app already works on mobile browsers. PWA (Progressive Web App) capabilities cover offline use if needed. | Invest in PWA features: service worker for offline, manifest for home screen install, responsive layouts. |
| Real-time collaboration / shared workspaces | Reloading is an individual activity. Nobody needs to co-edit a load recipe in real time. Shared loads (publish/browse) covers the social need without collaboration complexity. | Implement shared load recipes (publish, browse, copy). No real-time sync needed. |
| User accounts before community features | Adding authentication before there are community features that need it creates friction for no benefit. Solo users gain nothing from logging in. | Ship v2 features without auth. Add accounts only when community powder DB or shared loads require it. |
| Full external ballistics solver | External ballistics (trajectory, wind drift, drop) is a different domain with different physics. Tools like Applied Ballistics, Strelok, and Hornady 4DOF already dominate this space. Our value is in INTERNAL ballistics where GRT/QL are the only serious tools. | Provide muzzle velocity, energy, and BC as outputs. Let users feed these into their preferred external ballistics app. Consider simple trajectory calculator as future nice-to-have, never as core feature. |

---

## Feature Dependencies

```
3-curve burn model ──> GRT propellant file import (import needs the model to use the data)
3-curve burn model ──> Temperature sensitivity (temp coefficients modify burn rate parameters)
3-curve burn model ──> User calibration flow (calibration optimizes 3-curve parameters)
3-curve burn model ──> Reverse-engineer powder from chrono (derives 3-curve parameters)
3-curve burn model ──> Validation against load data (can't validate until model is upgraded)
3-curve burn model ──> Community powder DB (community data feeds 3-curve models)

Comprehensive powder DB ──> Powder quality indicators (quality ratings come with the data)
Comprehensive powder DB ──> GRT propellant file import (import is how we get the data)

Comprehensive bullet DB ──> 2D cartridge drawing (drawings need bullet dimensions)
Comprehensive cartridge DB ──> 2D cartridge drawing (drawings need cartridge dimensions)

User calibration flow ──> Community powder DB (calibration data feeds community models)
User calibration flow ──> Reverse-engineer powder (reverse engineering is advanced calibration)

User accounts ──> Community powder DB (need to track contributors)
User accounts ──> Shared load recipes (need to track publishers)

Sensitivity analysis ──> Error band visualization (analysis provides the data for bands)

Shot group analysis ──> (independent, no dependencies)
Printable reports ──> (independent, works with existing data)
Energy/momentum curves ──> (independent, trivial calculation)
Powder burn progress chart ──> (independent, data already in solver)
Temperature/heat curves ──> (independent, data already in solver)
```

---

## Build Priority Recommendation

### Phase 1: Simulation Accuracy (foundation for everything else)
1. **3-curve powder burn model** -- Without this, nothing else matters. This is the difference between a toy and a tool.
2. **GRT propellant file import** -- Immediately gives us 200+ powder models from GRT's database.
3. **Comprehensive powder database** -- Import GRT community data + manually add top 50 most popular powders.
4. **Validation against published load data** -- Prove accuracy. Build the test suite that demonstrates <5% error.
5. **Temperature sensitivity coefficient** -- Two new fields, straightforward modifier to burn rate.

### Phase 2: Data Completeness (make the tool usable for real work)
6. **Comprehensive bullet database** -- 500+ bullets from manufacturer public specs.
7. **Comprehensive cartridge database** -- 50+ cartridges from SAAMI/CIP.
8. **Powder quality indicators** -- Color badges on powder selection.
9. **User calibration flow** -- Chrono data -> auto-tune Ba/k. The feature that makes accuracy personal.
10. **Sensitivity analysis with error bands** -- Run ladder at charge +/- delta, show bands.

### Phase 3: Differentiation (surpass GRT, don't just match it)
11. **Shot group analysis** -- Web-based, usable at the range on a phone.
12. **2D cartridge technical drawing** -- Interactive SVG with all CIP/SAAMI dimensions.
13. **Printable load data sheets** -- PDF/print generation.
14. **Powder burn progress chart** -- New chart, trivial to add.
15. **Temperature and heat curves** -- New chart, data already available.
16. **Energy and momentum curves** -- New chart, trivial calculation.
17. **Interactive sensitivity explorer** -- Slider-based real-time what-if.

### Phase 4: Community & Advanced (long-term competitive moat)
18. **Community powder model database** -- The network effect feature.
19. **Reverse-engineer powder from chrono data** -- Advanced optimization.
20. **Shared load recipes** -- Browse and publish community loads.
21. **PressureTrace II overlay** -- Niche but high-value.
22. **2D rifle cross-section** -- Parametric SVG.
23. **3D interactive cartridge model** -- Eye candy with Three.js.

**Defer indefinitely:** Black powder, revolver gap, wildcat designer, QL import, native app, real-time collab, external ballistics.

---

## Sources

### HIGH Confidence (verified with official sources / codebase inspection)
- GRT propellant XML format: Directly inspected from [zen/grt_databases GitHub repo](https://github.com/zen/grt_databases) (CC0 license). Fields: Ba, k, z1, z2, Bp, Br, Brp, Qex, eta, pc, pcd, pt, tcc, tch, Qlty verified from actual `.propellant` files.
- GRT projectile XML format: Directly inspected `.projectile` files. Fields: gdia, glen, gmass, gpressure, gfriction, gtailDiaA/B, gtailh, g1bc, g7bc verified.
- GRT caliber XML format: Directly inspected `.caliber` files. 50+ dimension fields including CIP dimensional data verified.
- Current codebase state: Verified from `solver.py`, `thermodynamics.py`, `powder.py`, `bullet.py`, `cartridge.py` models.

### MEDIUM Confidence (multiple sources agree)
- GRT 3-curve model uses Ba, k, z1, z2 parameters: Confirmed across [GRT FAQ](https://www.grtools.de/doku.php?id=grtools%3Aen%3Afaq%3Afaq-propelland-modeling), [Accurate Shooter forum](https://forum.accurateshooter.com/threads/gathering-data-for-powder-model-development-gordons-reloading-tool.4072119/), [Shooters Forum](https://www.shootersforum.com/threads/reverse-engineering-powder-for-gordons-reloading-tool.245682/)
- GRT quality rating system (red/yellow/green, Qlty 0-2): Confirmed across [GRT docs](https://grtools.de/doku.php?id=en:doku:dbpropellant), [Reloaders Network](https://www.thereloadersnetwork.com/2019/12/13/gordons-reloading-tool-grt-how-to-start-using/)
- GRT OBT calibration: Ba and k adjusted via curve fitting from chrono velocities: Multiple forum sources agree
- QuickLoad has 2,500+ projectiles, 1,200+ cartridges, 225+ powders: [QuickLoad official site](https://quickload.co.uk/), [Wikipedia](https://en.wikipedia.org/wiki/QuickLOAD)
- GRT tolerance synthesis: Recursive simulation varying charge within windows: [GRT docs](https://grtools.de/doku.php?id=en:doku:ppsearch)
- Shot group analysis metrics (MOA, ES, SD, CEP, Mean Radius): [Ballistipedia](http://ballistipedia.com/index.php?title=Describing_Precision), [PrecisionRifleBlog](https://precisionrifleblog.com/2020/12/12/measuring-group-size-statistics-for-shooters/), [OnTarget TDS](https://ontargetshooting.com/ontarget-tds/)
- 2x2x2x5 test protocol for new powder models: [GRT FAQ](https://www.grtools.de/doku.php?id=grtools%3Aen%3Afaq%3Afaq-propelland-modeling)
- Hodgdon database: 439,263 loads, 31 powders, 400+ calibers: [Hodgdon](https://hodgdonreloading.com/)

### LOW Confidence (needs validation)
- GRT reports 99.3% accuracy without tuning: Single forum source, not independently verified. Actual accuracy varies by powder model quality.
- PressureTrace II .grtrace file format: Binary format not publicly documented. May need to reverse-engineer or support CSV export instead.
- GRT's exact calibration algorithm: Forum descriptions suggest simple curve fitting of Ba/k, but implementation details are not public.
- Berger publishes 150+ bullets with full dimensional data: Number estimated from reference charts, not counted precisely.
