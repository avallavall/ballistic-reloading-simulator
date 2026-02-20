# Pitfalls Research

**Domain:** Internal ballistics simulation -- scaling from hobby project to GRT-competitor
**Researched:** 2026-02-20
**Confidence:** HIGH (domain-specific, grounded in existing codebase analysis, GRT documentation, and community forums)

## Critical Pitfalls

### Pitfall 1: Piecewise Burn Rate Discontinuities Crash the ODE Solver

**What goes wrong:**
GRT's 3-curve model uses three segments (defined by z1 and z2 "burn-up limits") to describe the form function across ignition, main burn, and tail-off phases. Implementing this as a naive piecewise function creates discontinuities in the RHS of the ODE at the z1 and z2 transition points. SciPy's `solve_ivp` (RK45) uses adaptive step sizing -- when the RHS is discontinuous, the integrator detects large local truncation errors at transition boundaries, drives `h_step` to near-zero, and either stalls (millions of steps, no progress) or raises `RuntimeError: too many function evaluations`. This manifests as simulations that work perfectly for some powders but hang or crash for others depending on where z1/z2 fall relative to the pressure curve.

**Why it happens:**
Developers think "piecewise function = if/elif/else" and implement the 3-curve form function as:
```python
def form_function_3curve(Z, theta1, theta2, z1, z2):
    if Z < z1:
        return segment1(Z, theta1)
    elif Z < z2:
        return segment2(Z, theta1, theta2)
    else:
        return segment3(Z, theta2)
```
This is mathematically valid but numerically catastrophic for adaptive ODE solvers because the derivative `dpsi/dZ` jumps instantaneously at z1 and z2, which propagates into `dZ/dt` and `dP/dt`.

**How to avoid:**
1. **Use C1-continuous blending** at transitions. Replace hard if/else with smooth sigmoid or quintic Hermite blending over a small window (dZ = 0.02-0.05) around z1 and z2. This preserves the burn rate shape while keeping the RHS smooth enough for RK45.
2. **Use ODE events for phase transitions.** Define `solve_ivp` events at Z=z1 and Z=z2 with `terminal=True`, then restart integration with the next segment's parameters. This is more accurate but adds implementation complexity.
3. **Validate with GRT reference data.** For H4831SC (z1=0.49, z2=0.8374), the transition at z2 occurs during tail-off where pressure is already dropping. A hard discontinuity here causes less havoc than at z1 (during peak pressure buildup). Test both transitions explicitly.
4. **Lower max_step near transitions.** Current solver uses `max_step=1e-6` globally, which is already aggressive but may need further restriction during transition windows.

**Warning signs:**
- Simulations that work for some powders but timeout or crash for others
- Integration step count jumps from ~500 to 50,000+ for certain z1/z2 values
- `solve_ivp` returning `status=-1` with "excess work" messages
- Pressure curves showing impossible kinks or oscillations near Z=z1 or Z=z2

**Phase to address:**
3-curve burn model implementation phase. Must be tested with at least 10 different z1/z2 combinations from the GRT database before merging.

---

### Pitfall 2: GRT Parameter Conversion Produces Systematically Wrong Burn Rates

**What goes wrong:**
The existing `grt_converter.py` converts GRT vivacity `Ba` to Vieille coefficient `a1` using an empirical formula (`a1 = Ba * VIVACITY_SCALE / P_ref^(n-1)`) with a hardcoded `VIVACITY_SCALE = 1.0e-9`. This scaling factor was calibrated against a few known powders but produces systematic errors: fast powders (high Ba) underpredict velocity by 5-15%, slow powders (low Ba) overpredict by 10-20%. The burn rate exponent `n` is estimated from `Bp/Ba` ratio with `n = 0.82 + 0.15*(Bp/Ba)`, which is a rough heuristic that ignores the actual pressure exponent. As the powder database scales from 22 to 200+ entries, these systematic biases become visible to users and destroy trust in the tool.

**Why it happens:**
GRT and our model use fundamentally different burn rate parameterizations. GRT's `Ba` is a vivacity coefficient (dimensionless burn-rate-at-reference-conditions), not a Vieille coefficient. The conversion between them requires knowing the reference conditions (pressure, web thickness, form function geometry) that GRT assumes internally -- but GRT is closed-source and these reference conditions are not documented. The `VIVACITY_SCALE` constant is an empirical fudge factor. With only 22 seed powders to calibrate against, overfitting to those specific powders is almost guaranteed.

**How to avoid:**
1. **When implementing 3-curve model, adopt GRT's parameterization natively.** Store Ba, Qex, k, z1, z2, a0, Bp, Br, Brp, pc, pcd as first-class fields in the Powder model instead of converting to Vieille. This eliminates the conversion error entirely.
2. **Keep the Vieille model as fallback** for manually entered powders that only have traditional burn rate data.
3. **Validate conversion against at least 20 powders** spanning fast (Hodgdon Titegroup, Ba~2.5) to slow (Hodgdon H1000, Ba~0.25) with known real-world velocities.
4. **Implement a conversion quality score** that flags when the estimated velocity diverges >3% from expected values for a known load.

**Warning signs:**
- Velocity predictions consistently 50-150 FPS off for imported GRT powders
- Fast powders (pistol) and slow powders (magnum rifle) show opposite error directions
- Users reporting "your predictions don't match GRT" for the same powder/load combination
- Burn rate exponent `n` estimates clustering near 0.82 for all powders (the formula's central tendency)

**Phase to address:**
3-curve model phase AND GRT database import phase (these must be done together or sequentially, not independently). The converter must be rebuilt when the burn model changes.

---

### Pitfall 3: Community Data Submissions Allow Unsafe Load Recipes Into the Database

**What goes wrong:**
Community-submitted chronograph data and load recipes become a liability when: (a) a user submits bad data (wrong powder name, typo in charge weight, uncalibrated chronograph), (b) outlier data skews the burn model for a powder, producing predictions that encourage other users to load above SAAMI maximum, or (c) a malicious user deliberately submits fabricated data. Since ammunition reloading is safety-critical -- a double charge or overpressure load can cause catastrophic firearm failure and injury -- any community data system must treat incorrect data as a safety issue, not just a quality issue.

**Why it happens:**
Developers treat community data like any crowdsourced dataset (Wikipedia, product reviews) without recognizing the safety-critical domain. Standard quality controls (vote-based validation, automated outlier detection) are insufficient because: (1) a velocity data point that is "only" 10% wrong could push another user's charge calculation above safe limits, (2) the population of reloaders is small enough that a single prolific contributor can dominate a powder model, and (3) reloading involves physical danger that Wikipedia edits do not.

**How to avoid:**
1. **Implement mandatory bounds checking** on all submitted data. Reject any submission where velocity exceeds 120% or falls below 60% of the prediction for that load, or where charge weight is outside the SAAMI min/max for the cartridge.
2. **Require minimum data volume before influencing models.** GRT's red/yellow/green system is exactly right: a powder model stays "red" (read-only reference data) until N independent submissions from M different users converge within X% of each other. Suggested thresholds: N >= 10 submissions, M >= 3 users, X <= 5%.
3. **Never auto-update production models.** Community data goes into a staging/review pipeline. A curator (or automated statistical test) approves batches before they affect simulation predictions.
4. **Log provenance.** Every data point must track who submitted it, when, from what chronograph model, under what conditions. This enables rollback and investigation.
5. **Add a disclaimer layer.** Community-calibrated models must show a warning: "This model is calibrated from community data. Always verify against published load data before firing."

**Warning signs:**
- A single user contributing >50% of the data for a powder model
- Velocity submissions with standard deviations >50 FPS (suggests uncalibrated chronograph or mixed lots)
- Charge weights submitted outside published load manual ranges
- Model accuracy degrading after a batch of community submissions

**Phase to address:**
Community features phase. Must be designed BEFORE implementation begins. The data pipeline architecture is more important than the UI. Requires authentication (at minimum device-based) to track submissions per-user.

---

### Pitfall 4: Three.js Memory Leaks on Page Navigation Kill Mobile Performance

**What goes wrong:**
Adding Three.js/React Three Fiber 3D viewers to the rifle and cartridge pages creates GPU memory leaks when users navigate between pages. Each page mount creates new WebGL contexts, geometries, materials, and textures. React's component unmounting does NOT automatically dispose these GPU resources -- Three.js requires explicit `dispose()` calls on every geometry, material, and texture. Without proper cleanup, navigating rifle1 -> rifle2 -> rifle3 -> ... accumulates GPU memory until the browser tab crashes or the frame rate drops to single digits. This is especially severe on mobile devices with limited GPU memory (512MB-1GB).

**Why it happens:**
React developers assume that component unmounting = resource cleanup (true for DOM, false for WebGL). Three.js explicitly states: "three.js creates WebGL-related entities like buffers or shader programs for objects like geometries and materials, and these objects are not released automatically." React Three Fiber partially helps by handling disposal on unmount, BUT: (1) shared materials/geometries between components may be disposed prematurely or not at all, (2) GLTF-loaded models with ImageBitmap textures require `texture.source.data.close?.()` in addition to standard disposal, and (3) the Next.js App Router's component caching can keep "unmounted" components alive in memory.

**How to avoid:**
1. **Use `dynamic(() => import(...), { ssr: false })` for ALL Three.js components.** Three.js cannot run on the server. SSR attempts will crash with "document is not defined" or "window is not defined".
2. **Create a single persistent Canvas wrapper** that lives in the layout, not per-page. Swap scene contents instead of creating/destroying entire Canvas components. The `react-three-next` starter template demonstrates this pattern.
3. **Implement a disposal manager.** On component unmount, traverse the scene graph and dispose every geometry, material (handling material arrays), and texture. Monitor `renderer.info.memory` to verify cleanup works.
4. **Use `React.memo` on 3D components** and memoize geometry/material creation with `useMemo`. Never create `new THREE.Vector3()` or `new THREE.Material()` inside render loops or `useFrame`.
5. **Lazy-load 3D models.** Use `useLoader` with `Suspense` for GLTF/OBJ assets. Set a poly budget (target: <50k triangles for technical drawings, <10k for interactive rotation models).
6. **Test on mobile devices.** A rifle cutaway that runs at 60fps on a desktop GPU may render at 5fps on a phone.

**Warning signs:**
- `renderer.info.memory.geometries` increasing on each page navigation without decreasing
- Browser DevTools showing increasing GPU memory usage over time
- Mobile users reporting tab crashes after browsing multiple rifle/cartridge pages
- Hydration errors in the console (SSR attempting to render Three.js)
- Page load times increasing by >1 second when 3D viewer is present

**Phase to address:**
3D viewer phase. The disposal and Canvas management architecture must be designed before building any 3D content. Build the wrapper first, then add models.

---

### Pitfall 5: Validation Test Suite Uses Circular Reference Data

**What goes wrong:**
The validation suite compares simulator output against "reference data" that was itself generated by another simulator (GRT or QuickLoad) rather than actual physical measurements. This creates circular validation: if GRT overpredicts by 3% for a specific load and our model matches GRT's prediction, we conclude our model is "accurate" when in fact both models share the same systematic error. The 127 existing tests use hardcoded expected values derived from the solver itself (testing that the code doesn't regress, not that it's physically correct), which is code verification, not model validation.

**Why it happens:**
Real firing data is expensive and hard to obtain: it requires access to a range, a calibrated chronograph, a pressure measurement system, and careful documentation. Published load data from Hodgdon, Sierra, etc. gives muzzle velocity at specific charge weights, but these values already include their own measurement uncertainty (+/- 25-50 FPS) and are measured under specific conditions (barrel length, temperature, lot variation) that may not match simulation assumptions. Developers default to the easy path: compare against another simulator's output.

**How to avoid:**
1. **Use published load manual data as primary reference.** Hodgdon, Sierra, Hornady, and Nosler all publish velocity data at specific charge weights for specific barrel lengths. Create a test matrix of at least 20 load/cartridge combinations covering: .223 Rem, .308 Win, 6.5 Creedmoor, .30-06, .300 Win Mag (spanning fast to slow powders, light to heavy bullets, short to long barrels).
2. **Accept appropriate tolerances.** Published load data has inherent variability. An acceptable validation tolerance is: velocity within +/- 5% of published data (not +/- 1%), and peak pressure within +/- 10% (pressure is harder to predict due to primer variability and fouling state). GRT claims 99.3% accuracy but this is measured against their own community-calibrated models, not raw prediction.
3. **Separate verification from validation.** Keep the existing 200+ tests as regression/verification tests (code correctness). Add a NEW test suite category: "validation tests" that compare against published physical data with clearly documented sources.
4. **Document reference data provenance.** Every validation test case must cite: source manual, edition/year, specific page number, barrel length used, ambient temperature, and any corrections applied.
5. **Track validation metrics over time.** As the burn model improves (2-curve -> 3-curve, heat loss tuning), track how the mean absolute error against reference data changes. This is the project's KPI.

**Warning signs:**
- All validation tests passing with <1% error (suspiciously good -- means reference data is from the simulator itself)
- No test cases from published load manuals
- Test tolerances set so loose that any prediction passes (>20% tolerance)
- Validation tests all using the same cartridge (.308 Win) -- need diversity

**Phase to address:**
Validation test suite phase. Must run BEFORE declaring the 3-curve model complete. The test suite should be the acceptance criterion for the burn model upgrade.

---

### Pitfall 6: Importing GRT Database Silently Drops Critical Parameters

**What goes wrong:**
The `grt_parser.py` correctly extracts Ba, Qex, k, z1, z2, etc. from the XML files, but `grt_converter.py` discards the 3-curve parameters (z1, z2, Bp, Br, Brp, a0) during conversion, replacing them with derived Vieille approximations. When users import a GRT powder database expecting GRT-level accuracy, they get a degraded 2-curve approximation that is silently less accurate. The import shows "Import successful" but the imported powder performs worse than the original GRT model. The `CONCERNS.md` already documents this: "Successfully imports powder names but burn_rate_exp and other physics parameters not extracted from GRT format."

**Why it happens:**
The current Powder model only has 2-curve Vieille fields (`burn_rate_coeff`, `burn_rate_exp`). The converter was written before the 3-curve model was planned, so it has no choice but to approximate. The raw GRT params are stored in `grt_params` JSON column but never used by the solver. The result is a lossy import that looks successful but is fundamentally broken for simulation accuracy.

**How to avoid:**
1. **Extend the Powder model before importing.** Add columns for: z1, z2, Ba, a0, Bp, Br, Brp, Qex, pc, pcd, burn_model_type (enum: 'vieille_2curve' | 'grt_3curve'). The solver must check `burn_model_type` and use the appropriate form function.
2. **Make the import show accuracy warnings.** If importing into the current 2-curve model, the API response should include: "Imported as 2-curve approximation. Accuracy will improve when 3-curve model is enabled."
3. **Validate imported powders against known loads.** After batch import, run simulation for 3-5 reference loads per powder and compare velocity to GRT's prediction. Flag powders where the prediction diverges >5%.
4. **Migration path.** Create an Alembic migration that adds the new columns, then a data migration that populates them from the existing `grt_params` JSON for any previously imported powders.

**Warning signs:**
- Velocity predictions for GRT-imported powders consistently worse than GRT's own predictions
- Users importing the same powder from GRT and getting different results than GRT shows
- The `grt_params` JSON column contains data that the solver never reads
- Import endpoint returning success for all powders with no quality/accuracy feedback

**Phase to address:**
Database import phase. MUST be sequenced AFTER 3-curve model implementation, not before. Importing 200+ powders into a 2-curve model wastes the data.

---

### Pitfall 7: Overfitting the Heat Loss Coefficient Masks Burn Model Deficiencies

**What goes wrong:**
The Thornhill heat loss model uses `h_coeff=2000 W/m2K` as a fixed default. When implementing user calibration (auto-tune solver to chronograph data), the optimizer will adjust `h_coeff` to force velocity predictions to match observed data. For the current 2-curve model, this means h_coeff absorbs ALL model error -- not just heat loss error but also burn rate model error, form function error, and friction model error. The calibrated h_coeff values end up physically unrealistic (e.g., h_coeff=5000 for one cartridge, h_coeff=500 for another) because h_coeff is being used as a catch-all fudge factor. When the burn model later improves (3-curve), all previously calibrated h_coeff values become invalid, and users must re-calibrate everything.

**Why it happens:**
With only one tunable parameter (h_coeff), the optimizer has no choice but to use it to compensate for all error sources. The problem is identifiability: with a single measurement (muzzle velocity) and one free parameter, the system is exactly determined -- but the parameter absorbs systematic model error instead of representing physical reality. GRT avoids this by tuning Ba and k (burn rate parameters) during calibration, keeping heat loss separate.

**How to avoid:**
1. **Implement the 3-curve model BEFORE the calibration flow.** The calibration flow should tune Ba (or burn_rate_coeff) as the primary adjustment, with h_coeff as a secondary/optional parameter.
2. **Constrain h_coeff during optimization.** Physical bounds: 500-5000 W/m2K for small arms. If the optimizer hits the bounds, warn the user that the powder model may be inaccurate.
3. **Use multiple data points for calibration.** Require at least 3 different charge weights (like GRT's calibration protocol). With 3 velocity measurements and 2-3 free parameters (Ba, k, h_coeff), the system is over-determined and less prone to overfitting.
4. **Store calibration parameters separately from base model parameters.** A calibrated load should store: base_powder_id + calibration_offsets, so the base powder model remains clean and re-calibration is easy.

**Warning signs:**
- Calibrated h_coeff values varying by more than 2x across cartridges (e.g., 800 for .223, 4000 for .300 WM)
- Calibration producing excellent velocity match but poor pressure prediction
- Re-running old calibrated loads after a solver update and getting different results
- Users confused about whether to use "calibrated" or "default" h_coeff

**Phase to address:**
Calibration flow phase. Must be sequenced AFTER 3-curve model. If calibration is built on the 2-curve model, the entire calibration architecture will need to be rebuilt.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store GRT params in JSON column instead of proper columns | Quick import feature, no schema migration needed | Solver cannot use the data; requires ETL step to extract; no DB-level validation or indexing | Never (for params the solver will use). JSON column is fine for metadata like origin, description |
| Hardcode Z_PRIMER=0.01 for ignition | Solver starts without primer model | Makes solver sensitive to initial conditions; different primers produce different ignition pressures; prevents future primer modeling | Only during prototype phase; must be replaced with primer pressure model when calibration is added |
| Fixed structural defaults (BRASS_E, CASE_WALL_THICKNESS) | Works for common brass cases | Wrong for aluminum, nickel, steel cases; wrong for thin-wall match brass vs. thick military brass | Until material properties are added to Cartridge model; acceptable for v1 |
| Single barrel geometry (25mm OD, steel 4140) | Works for standard rifle barrels | Wrong for bull barrels, carbon-wrapped, thin contours; harmonics frequency off by 20-40% | Until barrel profile is added to Rifle model; acceptable for bolt-action focus |
| ODE tolerances at rtol=1e-8, atol=1e-10 | High precision results | 3-5x slower than necessary; masks model errors with numerical precision; ladder tests of 10+ steps take 30+ seconds | Never for production. Relax to rtol=1e-6, atol=1e-8 after profiling confirms equivalent results |

## Integration Gotchas

Common mistakes when connecting to external services and data sources.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GRT .propellant XML import | Assuming all XML files follow the documented schema. Linux-exported files use `<svar` instead of `<var` tags, breaking the parser silently. | Check for both `<var` and `<svar` elements. Normalize whitespace and encoding. Test with files from both Windows and Linux GRT builds. |
| GRT community database (GitHub) | Cloning the repo once and treating it as static data. The zen/grt_databases repo is community-maintained with irregular updates and no versioning. | Pin to specific commit hashes. Implement periodic sync with diff detection. Track which powders changed and flag for re-validation. |
| Chronograph CSV import (LabRadar) | Parsing CSV assuming consistent column order and decimal format. LabRadar firmware updates change column headers; EU versions use comma as decimal separator. | Use header-based column detection (not position-based). Handle both `.` and `,` decimal separators. Test with actual exported files from multiple firmware versions. |
| Chronograph CSV import (MagnetoSpeed) | Assuming all MagnetoSpeed CSV files have the same format. V1, V2, and V3 units export different column layouts. | Detect MagnetoSpeed version from header patterns. Support all known formats. Include "unknown format" error with instructions to export in a specific mode. |
| Published load manual data for validation | Using load data without noting barrel length, which varies between publishers (24" vs 26" vs 28"). SAAMI test barrels differ from real-world barrel lengths. | Always record barrel length alongside published velocity. When comparing to simulation, ensure barrel_length matches. Correct for length differences using ~25 FPS per inch for rifle cartridges. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Running 200+ powder simulations serially in parametric search | 200 powders * 2-3s each = 7-10 minute response time; HTTP timeout; user thinks app is broken | Pre-filter by burn_rate_relative range. Use asyncio.gather() for concurrent simulations. Cache results by (powder_id, cartridge_id, bullet_id) hash. Consider background task queue (Celery). | >50 powders in database |
| Returning full simulation curves (200 points) for parametric search results | API response payload >5MB for 200 powders * 200 curve points; slow frontend rendering; mobile data usage | Return only summary stats (peak P, muzzle V, barrel time) for parametric results. Fetch full curves only when user expands a specific powder. | >100 powders in parametric search |
| Loading all GLTF models for 3D viewer on page load | 3-10 MB per model; 5 rifle pages = 15-50 MB of model data fetched; blocks initial render | Lazy-load models with React.Suspense. Use LOD (Level of Detail) with 3 tiers. Compress with Draco/KTX2. Show 2D wireframe immediately, load 3D on user interaction. | Any mobile user; desktop users on slow connections |
| Re-rendering Recharts + Three.js on every parent state change | Visible jank when adjusting sliders; frame rate drops from 60fps to 10fps; CPU pinned at 100% | Wrap chart and 3D components with React.memo(). Avoid creating new arrays/objects in render. Use useFrame for 3D animations instead of React state. | Any device when simulation form has sliders |
| Storing all community submissions in a single PostgreSQL table | Write contention under concurrent submissions; queries slow as table grows past 1M rows; no partitioning | Partition submissions by powder_id. Use time-series table for chronograph data. Archive processed submissions. Consider read replicas for query-heavy analytics. | >100k community submissions |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Accepting community-submitted charge weights without bounds checking | Malicious user submits a load recipe showing 100 grains of Titegroup in a .223 Rem (real max: ~25 grains). Another user trusts the community data and loads this. Catastrophic firearm failure, possible injury or death. | Hard-reject any charge weight >150% of SAAMI max for the cartridge. Cross-validate powder burn speed vs cartridge case capacity. Flag fast powders in large cases and slow powders in small cases. |
| Allowing XML import without entity expansion limits | XXE (XML External Entity) attack via crafted .propellant file. Could read arbitrary server files or cause DoS via billion laughs attack. | Use `defusedxml.ElementTree` instead of `xml.etree.ElementTree` for GRT file parsing. Disable entity expansion. Limit file size to 1MB. Already partially mitigated by parsing only `<var>` elements but not properly secured. |
| No rate limiting on data export/bulk download endpoints | Competitor or scraper can download entire powder database (including community-contributed models) in a single API session. | Add rate limiting on GET /powders (list) and any bulk export endpoint. Implement pagination with cursor tokens. Consider watermarking community data with invisible markers. |
| Community login via device-based anonymous ID | Device ID can be spoofed to create unlimited "users", bypassing per-user submission limits. A single person can flood community data from fabricated identities. | Require email verification for community submissions (not for general use). Implement IP-based rate limiting as secondary control. Consider requiring link to chronograph serial number or evidence photo. |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing raw SI units (Pa, m/s, kg) in simulation output | Reloaders think in PSI/CUP, FPS, grains. Seeing "420000000 Pa" instead of "60,916 PSI" makes the tool feel foreign and untrustworthy. | Always display user-preferred units. Use the existing unit toggle (PSI/MPa, FPS/m/s). Format numbers with appropriate precision (no decimals on PSI, one decimal on MPa). |
| Presenting all simulation parameters in a single form | Information overload. Beginner reloaders don't know what "covolume" or "form factor theta" means. They abandon the tool thinking it's only for experts. | Already have Simple/Advanced mode toggle -- enforce it. Simple mode: select rifle, bullet, powder, charge weight, COAL. Advanced mode adds: seating depth, h_coeff, primer type, temperature. |
| Showing "UNSAFE" warnings without context | User loads 42.0 gr of Varget in .308 Win, sees "UNSAFE: Peak pressure 62,000 psi exceeds SAAMI max 62,000 psi". They don't know if they're 100 PSI over or 10,000 PSI over. | Show pressure as percentage of SAAMI max with color coding: green (<90%), yellow (90-100%), red (>100%). Show how much to reduce charge to reach 95% of max. Add graduated warnings: "caution" at 90%, "warning" at 95%, "danger" at 100%, "critical" at 110%. |
| 3D viewer as a novelty without practical value | Cool demo but adds no information a 2D drawing doesn't already provide. Users with slow devices get frustrated by load time for no functional benefit. | Make 3D viewer opt-in (button: "View in 3D"). Default to interactive 2D SVG cutaway with annotated dimensions. The 2D view loads instantly and shows more useful information (dimensional annotations, material labels). |
| Powder quality indicators without explanation | Red/yellow/green badge on a powder without explaining what it means. Users avoid "red" powders that might be perfectly fine (just under-validated) or trust "green" powders blindly. | Add tooltip: "Red = insufficient validation data, prediction accuracy is low. Verify against published load data." Show the number of data points and contributors. Link to the calibration flow for red powders. |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **GRT Import:** Parser extracts fields -> converter maps them -> import shows "success" -- but z1, z2, Bp, Br parameters are silently dropped and never reach the solver. Verify: run a simulation with an imported powder and compare velocity to GRT's prediction for the same load. If divergence >5%, the import is lossy.
- [ ] **3-Curve Burn Model:** Form function computes psi(Z) with 3 segments -- but solver still uses `vieille_burn_rate()` for dZ/dt. Verify: check that the solver's RHS function uses the 3-curve burn rate, not just the 3-curve form function. The burn rate law and the form function are separate.
- [ ] **3D Viewer:** Model renders and rotates -- but memory leaks on navigation. Verify: open DevTools, navigate to 5 different rifle pages, check that `renderer.info.memory.geometries` returns to near-zero after each navigation.
- [ ] **Community Submissions:** Users can submit chronograph data -- but no outlier detection exists. Verify: submit deliberately wrong data (velocity 5000 FPS for .308 Win) and confirm it is rejected, not accepted into the model.
- [ ] **Validation Test Suite:** Tests pass -- but reference data is from the simulator itself, not physical measurements. Verify: grep test files for citations to Hodgdon, Sierra, Hornady manuals. If none found, the suite is verification-only (code correctness), not validation (physical accuracy).
- [ ] **Parametric Search Performance:** Returns results for 22 seed powders -- but scales to 200+ imported powders without timeout. Verify: temporarily seed 200 powders and run parametric search. If it takes >30 seconds, the endpoint needs optimization before database import.
- [ ] **Heat Loss Calibration:** User tunes h_coeff to match observed velocity -- but optimized h_coeff is physically implausible (e.g., <100 or >10000 W/m2K). Verify: add bounds checking on calibrated h_coeff and warn user when bounds are hit.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| ODE solver crashes on 3-curve transition | MEDIUM | Revert to 2-curve model for the problematic powder. Add C1 blending at transition points. Re-run all validation tests. No data loss. |
| GRT conversion produces wrong burn rates | HIGH | Must rebuild converter with new parameterization. Previously imported powders need re-import or data migration. Users who relied on predictions may have loaded unsafe rounds (add retrospective warning). |
| Community data corrupts a powder model | MEDIUM | Roll back to pre-corruption state using submission logs. Identify and ban the problematic contributor. Re-derive model from clean data. Notify users who downloaded the corrupted model. |
| Three.js memory leaks on mobile | LOW | Add disposal code to existing components. No architecture change needed if using single Canvas pattern. If using per-page Canvas, requires refactor to shared Canvas (MEDIUM). |
| Validation suite has circular references | MEDIUM | Source real reference data from load manuals. Rebuild validation test cases. Does not require code changes to the solver -- only test data changes. Time cost: 2-3 days of manual data entry and citation. |
| Overfitted h_coeff masks model errors | HIGH | When 3-curve model is implemented, all previous calibrations become invalid. Must notify users, clear calibration data, and re-calibrate. If users relied on calibrated predictions for load development, add warning. |
| Import silently drops parameters | LOW | Extend Powder model, migrate existing data from grt_params JSON to new columns, re-import affected powders. No data loss if grt_params JSON was preserved (it was). |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Piecewise burn rate discontinuities | 3-Curve Burn Model | Integration step count <1000 for all test powders; no solver crashes; smooth pressure curves at z1/z2 transitions |
| GRT parameter conversion errors | 3-Curve Burn Model + Database Import (sequential) | Mean velocity error <5% across 20+ reference loads; no systematic bias by powder speed class |
| Unsafe community data | Community Features (design phase, before implementation) | Deliberately invalid submissions rejected; no single user >30% of data for any powder; staged review pipeline exists |
| Three.js memory leaks | 3D Viewer (architecture-first, then content) | `renderer.info.memory.geometries` returns to baseline after 10 page navigations; mobile frame rate >30fps |
| Circular validation references | Validation Test Suite (concurrent with 3-curve model) | >=20 test cases citing published load manuals; no test case using simulator-generated reference data |
| Silent parameter dropping on import | Database Import (after 3-curve model) | All GRT parameters (Ba, z1, z2, Bp, Br, Brp) stored in typed columns and used by solver; import response includes accuracy estimate |
| Overfitted heat loss coefficient | Calibration Flow (after 3-curve model) | Calibrated h_coeff within physical bounds (500-5000); calibration uses >=3 data points; Ba is primary tuning parameter |

## Sources

- [GRT Propellant Database Documentation](https://grtools.de/doku.php?id=grtools:en:doku:dbpropellant) -- Quality indicator system (red/yellow/green), burn model overview -- MEDIUM confidence
- [GRT Calibration FAQ](https://www.grtools.de/doku.php?id=en:faq:faq-calibration) -- Calibration process, OBT function -- MEDIUM confidence
- [GRT Propellant Modeling FAQ](https://www.grtools.de/doku.php?id=grtools:en:faq:faq-propelland-modeling) -- 2x2x2x5 data collection protocol, reverse engineering process -- HIGH confidence
- [GRT Community Databases (GitHub)](https://github.com/zen/grt_databases) -- XML format, .propellant file structure, community data disclaimer -- HIGH confidence
- [GRT vs QuickLoad Forum Discussion (Accurate Shooter)](https://forum.accurateshooter.com/threads/gordons-reloading-tool-vs-quickload.4013760/) -- 3-curve vs 2-curve model comparison -- MEDIUM confidence
- [GRT Powder Model Development (Accurate Shooter)](https://forum.accurateshooter.com/threads/gathering-data-for-powder-model-development-gordons-reloading-tool.4072119/) -- z2 parameter, Factor_b conversion, Gordon's status -- MEDIUM confidence
- [React Three Fiber Performance Pitfalls (official docs)](https://r3f.docs.pmnd.rs/advanced/pitfalls) -- R3F-specific rendering issues, useFrame vs setState -- HIGH confidence
- [Three.js Memory Leak Prevention (Roger Chi)](https://roger-chi.vercel.app/blog/tips-on-preventing-memory-leak-in-threejs-scene) -- Disposal patterns, renderer.info.memory monitoring -- MEDIUM confidence
- [Three.js + React Performance Guide (Medium, Dec 2025)](https://medium.com/@alfinohatta/integrating-three-js-278774d45973) -- Production deployment patterns, SSR avoidance -- MEDIUM confidence
- [100 Three.js Tips (Utsubo, 2026)](https://www.utsubo.com/blog/threejs-best-practices-100-tips) -- Draw call optimization, Draco/KTX2 compression, LOD -- MEDIUM confidence
- [react-three-next Starter (GitHub)](https://github.com/pmndrs/react-three-next) -- Single Canvas pattern, Next.js App Router integration -- HIGH confidence
- [Verification Test Suite for Physics Simulation Codes (LANL, LA-14167-MS)](https://www.osti.gov/servlets/purl/835920) -- V&V methodology, tolerance selection, code vs calculation verification -- HIGH confidence
- [Enhanced Verification Test Suite (LANL, LA-14379)](https://osti.gov/biblio/957482-XjrpXC) -- Reference data requirements, analytical solution comparison -- HIGH confidence
- [Establishing Trust in Crowdsourced Data (arXiv, 2025)](https://arxiv.org/pdf/2511.03016) -- Data quality control, contributor dominance, trust scoring -- MEDIUM confidence
- Existing codebase analysis: `solver.py`, `grt_parser.py`, `grt_converter.py`, `CONCERNS.md` -- HIGH confidence
- `docs/grtools_analysis.md` (project internal) -- GRT feature inventory, 3-curve model details, competitive analysis -- HIGH confidence

---
*Pitfalls research for: Internal ballistics simulation v2 -- scaling to GRT-competitor*
*Researched: 2026-02-20*
