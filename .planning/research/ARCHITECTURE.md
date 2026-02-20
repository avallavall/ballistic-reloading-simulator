# Architecture Patterns

**Domain:** Internal ballistics simulation v2 -- web-based reloading tool
**Researched:** 2026-02-20

## Current Architecture (Baseline)

The existing system is a clean three-tier architecture: Next.js 14 frontend -> FastAPI REST API -> PostgreSQL 16. The physics engine (`app.core`) is properly isolated from the HTTP layer. The ODE solver (`solver.py`) takes pure dataclass parameters and returns a `SimResult` dataclass. This separation is the most important architectural asset -- v2 features must preserve it.

```
Frontend (Next.js 14, Client-Side)
  |
  | HTTP (JSON over REST)
  v
API Layer (FastAPI, /api/v1/*)
  |
  +--- CRUD Routers (powders, bullets, cartridges, rifles, loads)
  +--- Simulation Router (/simulate/direct, /simulate/ladder, /simulate/parametric)
  |       |
  |       | Pure function call (dataclasses in, dataclass out)
  |       v
  |    Physics Core (app.core.solver.simulate())
  |       |
  |       +--- thermodynamics.py (Noble-Abel EOS, Vieille burn rate, form function)
  |       +--- internal_ballistics.py (Lagrange pressure, free volume)
  |       +--- structural.py (hoop stress, case expansion, erosion)
  |       +--- harmonics.py (barrel frequency, OBT)
  |       +--- heat_transfer.py (Thornhill convective model)
  |       |
  |       v
  |    SciPy solve_ivp (RK45, 4-variable ODE: Z, x, v, Q_loss)
  |
  +--- Data Access (SQLAlchemy AsyncSession + asyncpg)
  |       |
  |       v
  |    PostgreSQL 16 (6 tables, UUID PKs, JSONB for curves)
  |
  v
Seed Data (22 powders, bullets, cartridges, 5 rifles)
```

## Recommended Architecture for v2

The v2 architecture extends the existing structure with four new subsystems. The core principle is: **extend the existing layers, do not introduce new horizontal layers**. Each v2 feature plugs into the existing structure at a well-defined point.

```
Frontend (Next.js 14, Client-Side)
  |
  +--- Existing Pages (simulation, ladder, CRUD, parametric search)
  +--- NEW: Additional Chart Components (burn progress, energy, temp/heat)
  +--- NEW: 3D Viewer Components (React Three Fiber, dynamically loaded)
  +--- NEW: Community Pages (submission, browse, powder quality dashboard)
  |
  | HTTP (JSON over REST)
  v
API Layer (FastAPI, /api/v1/*)
  |
  +--- Existing Routers (powders, bullets, cartridges, rifles, loads, simulate, chrono)
  +--- NEW: /api/v1/import/* (GRT DB import, manufacturer data ETL)
  +--- NEW: /api/v1/community/* (data submission, reverse-engineering)
  +--- NEW: /api/v1/validate/* (validation test suite reporting)
  |
  +--- Physics Core (app.core)
  |       |
  |       +--- MODIFIED: thermodynamics.py (add 3-curve form function)
  |       +--- MODIFIED: solver.py (extend ODE to 5 variables: Z, x, v, Q_loss, Z2)
  |       +--- NEW: burn_model.py (3-curve burn rate dispatcher)
  |       +--- NEW: reverse_engineer.py (chrono -> parameter optimization)
  |       +--- NEW: validation.py (compare sim results to published data)
  |       |
  |       v
  |    SciPy solve_ivp (RK45) + scipy.optimize (for reverse engineering)
  |
  +--- Data Access Layer
  |       |
  |       v
  |    PostgreSQL 16 (extended schema: ~12 tables)
  |       +--- EXISTING: powders, bullets, cartridges, rifles, loads, simulation_results
  |       +--- MODIFIED: powders (add 3-curve fields: z1, z2, Bp, Br, Brp, a0, quality_level)
  |       +--- NEW: community_submissions (chrono data submissions)
  |       +--- NEW: validation_references (published load manual data)
  |       +--- NEW: powder_quality_votes (community quality ratings)
  |       +--- NEW: shared_loads (published community load recipes)
  |       +--- NEW: import_batches (ETL batch tracking)
  |
  +--- NEW: Import Pipeline (app.import_pipeline)
  |       +--- grt_parser.py (EXISTING, extended)
  |       +--- grt_converter.py (EXISTING, extended for 3-curve)
  |       +--- manufacturer_etl.py (NEW: bullet/cartridge data from specs)
  |       +--- bulk_import.py (NEW: batch import orchestration)
  |
  v
External Data Sources
  +--- GitHub: zen/grt_databases (200+ .propellant XML files)
  +--- Manufacturer specs (Sierra, Hornady, Nosler, Berger, Lapua)
  +--- Published load manuals (Hodgdon, Sierra, Hornady, Nosler)
```

### Component Boundaries

| Component | Responsibility | Communicates With | v2 Changes |
|-----------|---------------|-------------------|------------|
| `app.core.solver` | ODE integration, SimResult production | `thermodynamics`, `internal_ballistics`, `structural`, `harmonics`, `heat_transfer` | Extend ODE to support 3-curve model; add Z2 state variable; emit new curve data (burn progress, energy, temperature) |
| `app.core.thermodynamics` | EOS, burn rate law, form function | `solver` (called during ODE RHS evaluation) | Add `form_function_3curve()` with z1/z2 breakpoints; add piecewise Vieille burn rate |
| `app.core.burn_model` (NEW) | Dispatch between 2-curve and 3-curve models | `solver`, `thermodynamics` | New module: decides which burn model to use based on powder parameters; encapsulates the 3-phase logic |
| `app.core.reverse_engineer` (NEW) | Derive powder params from chrono data | `solver`, `scipy.optimize` | New module: runs optimization loop, calls solver repeatedly |
| `app.core.validation` (NEW) | Compare sim output to reference data | `solver`, database | New module: runs sim with reference load data, computes error metrics |
| `app.api.simulate` | HTTP endpoint coordination | `solver`, database models | Extend DirectSimulationResponse with new curve arrays; add burn_progress_curve, energy_curve, temperature_curve |
| `app.api.import_` (NEW) | Bulk data import endpoints | `grt_parser`, `grt_converter`, `manufacturer_etl`, database | New router: POST /import/grt-powders, POST /import/bullets, POST /import/cartridges |
| `app.api.community` (NEW) | Community data submission endpoints | `reverse_engineer`, database | New router: POST /community/submit-chrono, GET /community/shared-loads |
| `app.api.validate` (NEW) | Validation test reporting | `validation`, database | New router: POST /validate/run-suite, GET /validate/results |
| Frontend 3D Viewers (NEW) | Interactive 3D rifle/cartridge models | React Three Fiber, Next.js dynamic import | New component directory: `components/viewers/` with RifleViewer3D, CartridgeViewer3D |
| Frontend Charts (EXTENDED) | Simulation result visualization | Recharts, simulation hooks | Add BurnProgressChart, EnergyChart, TemperatureChart to `components/charts/` |
| Frontend Community Pages (NEW) | Community interaction UI | TanStack Query, new API hooks | New pages: `community/submit/page.tsx`, `community/browse/page.tsx` |

## Data Flow: 3-Curve Burn Model

This is the most architecturally significant change. The 3-curve model modifies the innermost loop of the physics engine.

### Current 2-Curve Model Flow

```
PowderParams (burn_rate_coeff, burn_rate_exp, theta)
  |
  v
form_function(Z, theta) -> psi = (theta+1)*Z - theta*Z^2  [single quadratic]
  |
  v
vieille_burn_rate(P, a1, n) -> r_b = a1 * P^n  [single law for all Z]
  |
  v
ODE: dZ/dt = r_b / e1  [single burn rate equation]
```

### Proposed 3-Curve Model Flow

```
PowderParams (Ba, Bp, Br, Brp, k, z1, z2, a0, web_thickness)
  |
  v
burn_model.select_phase(Z, z1, z2) -> phase (INITIAL | MAIN | TAILOFF)
  |
  v
form_function_3curve(Z, phase, Bp, Br, Brp) -> psi
  |   Phase 1 (Z < z1): psi = f1(Z, Bp)         [initial ignition]
  |   Phase 2 (z1 <= Z < z2): psi = f2(Z, Bp, Br)  [main combustion]
  |   Phase 3 (Z >= z2): psi = f3(Z, Br, Brp)    [tail-off]
  |
  v
vieille_burn_rate_phased(P, Ba, phase) -> r_b
  |   Each phase can have different rate law coefficients
  |
  v
ODE: dZ/dt = r_b / e1  [same structure, different rate function]
```

**Key architectural decision: The ODE system structure does NOT need to change.** The 3-curve model changes the `form_function` and `vieille_burn_rate` implementations, not the ODE variables. The existing 4-variable system (Z, x, v, Q_loss) remains sufficient. The Z variable already tracks burn progress from 0 to 1; the 3-curve model simply changes what happens at different Z values.

**Backward compatibility:** The existing 2-curve powders (with `burn_rate_coeff` and `burn_rate_exp` but no `z1`, `z2`, `Bp`, `Br`, `Brp`) continue to work unchanged. The `burn_model` dispatcher checks whether 3-curve parameters exist and falls back to the 2-curve model if they do not. This is implemented by checking `PowderParams.z1` -- if it is None or 0.0, use the 2-curve model.

**Implementation approach:**

```python
# app/core/burn_model.py

@dataclass
class BurnPhase:
    INITIAL = 1   # Z < z1
    MAIN = 2      # z1 <= Z < z2
    TAILOFF = 3   # Z >= z2

def form_function_3curve(Z: float, z1: float, z2: float,
                          Bp: float, Br: float, Brp: float) -> float:
    """GRT-style 3-curve form function.

    Phase 1 (0 <= Z < z1): Progressive ignition
      psi = (1 + Bp) * Z - Bp * Z^2
    Phase 2 (z1 <= Z < z2): Main combustion
      psi = psi(z1) + slope * (Z - z1)  [matched at z1]
    Phase 3 (z2 <= Z <= 1): Tail-off
      psi = psi(z2) + Br * (Z - z2) + Brp * (Z - z2)^2  [matched at z2]
    """
    # ... continuous piecewise implementation with C0 continuity at breakpoints

def get_burn_rate(Z: float, P: float, powder: PowderParams) -> float:
    """Select burn rate based on whether 3-curve params exist."""
    if powder.z1 is not None and powder.z1 > 0:
        return _burn_rate_3curve(Z, P, powder)
    else:
        return vieille_burn_rate(P, powder.burn_rate_coeff, powder.burn_rate_exp)
```

**Confidence: MEDIUM.** The exact form function equations for GRT's 3 curves are not published in official documentation. The z1/z2 breakpoint model with Bp/Br/Brp coefficients is reconstructed from GRT parameter names and ballistics literature. The implementation will need calibration against known GRT results for validation.

## Data Flow: 3D Viewer Components

The 3D viewers are purely frontend components. They do not require any backend changes. They generate parametric geometry from existing dimension data already stored in the database.

### Component Architecture

```
Rifle Detail Page (rifles/[id]/page.tsx)
  |
  +--- RifleInfo (existing data display)
  +--- RifleViewer3D (NEW, dynamically loaded)
        |
        +--- next/dynamic({ ssr: false }) -- critical: Three.js cannot render on server
        |
        v
      React Three Fiber <Canvas>
        +--- <RifleModel rifle={rifleData} cartridge={cartridgeData} />
        |       |
        |       +--- BarrelGeometry (LatheGeometry from barrel profile points)
        |       +--- ChamberGeometry (LatheGeometry from chamber dimensions)
        |       +--- ReceiverGeometry (simplified box/cylinder)
        |
        +--- <OrbitControls /> (from @react-three/drei)
        +--- <ambientLight />, <directionalLight />
        +--- <CutawayToggle /> (state: full | cutaway)
```

### Parametric Geometry Generation

The 3D models are NOT pre-built assets. They are generated parametrically from the dimension data already in the database:

- **Barrel**: `LatheGeometry` from a 2D profile defined by `barrel_length_mm`, `bore_diameter_mm`, `groove_diameter_mm`, and a standard barrel taper profile
- **Chamber**: `LatheGeometry` from `case_length_mm`, `bore_diameter_mm`, shoulder angle (derived from cartridge family)
- **Cartridge**: `LatheGeometry` from `case_length_mm`, `overall_length_mm`, `bore_diameter_mm`, neck diameter, shoulder angle, rim diameter

This approach means:
1. No 3D asset files to manage or store
2. Every rifle/cartridge gets a unique accurate model
3. Dimensions update automatically when the user edits them
4. The cutaway view is achieved by clipping planes, not separate geometry

### Performance Considerations

| Concern | Approach |
|---------|----------|
| Bundle size | Dynamic import with `ssr: false`; Three.js (~600KB) only loads on pages that need it |
| Initial load | The 3D viewer is below the fold; lazy load with IntersectionObserver |
| Render performance | Parametric geometry is simple (< 10K vertices); no performance concern |
| Mobile | Detect touch devices; offer 2D SVG fallback for low-end devices |

### Technology Choice

**Use React Three Fiber (@react-three/fiber) + @react-three/drei** because:
- React component model integrates naturally with Next.js
- Drei provides OrbitControls, PerspectiveCamera, and other helpers out of the box
- The pmndrs/react-three-next starter demonstrates the integration pattern
- Three.js LatheGeometry is perfect for rotationally symmetric objects (barrels, cartridges)

**Do NOT use raw Three.js** because it requires imperative scene management that conflicts with React's declarative model.

**Confidence: HIGH.** React Three Fiber is the established standard for Three.js + React integration. LatheGeometry for rotationally symmetric objects is a well-documented Three.js pattern.

## Data Flow: Community Data Submission Pipeline

This is the most architecturally complex new feature because it introduces user-generated content and a reverse-engineering algorithm.

### Submission Flow

```
User fires 10 rounds, measures velocities with chronograph
  |
  v
Frontend: Community Submit Page
  |  User enters:
  |    - Rifle ID (from their rifles)
  |    - Powder ID + charge weight
  |    - Bullet ID
  |    - Measured velocities (array of FPS values, or CSV import)
  |    - Ambient temperature (optional)
  |
  | POST /api/v1/community/submit-chrono
  v
Backend: community.py endpoint
  |  1. Validate input (minimum 5 shots required)
  |  2. Calculate measured stats (mean velocity, SD, ES)
  |  3. Run current sim with user's components -> predicted velocity
  |  4. Calculate prediction error (measured vs predicted)
  |  5. Store submission in community_submissions table
  |
  | If enough submissions exist for this powder:
  v
Reverse Engineering Pipeline (triggered async or on-demand)
  |
  +--- reverse_engineer.py
  |      |
  |      | Optimization loop:
  |      |   1. Collect all submissions for powder X
  |      |   2. Define objective: minimize sum of (predicted_vel - measured_vel)^2
  |      |      across all submissions
  |      |   3. Parameters to optimize: Ba, Bp (and z1, z2, Br, Brp if 3-curve)
  |      |   4. Use scipy.optimize.minimize (L-BFGS-B, bounded)
  |      |      or scipy.optimize.least_squares (Levenberg-Marquardt)
  |      |   5. Each evaluation: run simulate() with candidate params
  |      |   6. Output: optimized powder parameters + residual error
  |      |
  |      v
  |   Updated powder parameters (stored as new quality level)
  |
  v
Powder Quality System
  |  RED: < 3 submissions, parameters are manufacturer defaults or estimates
  |  YELLOW: 3-10 submissions, parameters partially calibrated
  |  GREEN: 10+ submissions with < 2% mean velocity error
```

### Reverse Engineering Algorithm

```python
# app/core/reverse_engineer.py

from scipy.optimize import least_squares

def reverse_engineer_powder(
    submissions: list[CommunitySubmission],
    powder: PowderParams,
    bullets: dict[UUID, BulletParams],
    cartridges: dict[UUID, CartridgeParams],
    rifles: dict[UUID, RifleParams],
) -> OptimizedPowderResult:
    """Optimize powder burn parameters to match community velocity data.

    Each submission has: rifle_id, bullet_id, charge_grains, measured_velocity_fps.
    We vary Ba (and optionally Bp, Br) to minimize velocity prediction error.
    """
    def residuals(params):
        # params = [Ba, burn_rate_exp] for 2-curve
        #        = [Ba, Bp, Br, z1, z2] for 3-curve
        test_powder = powder._replace(burn_rate_coeff=params[0], ...)
        errors = []
        for sub in submissions:
            sim = simulate(test_powder, bullets[sub.bullet_id], ...)
            errors.append(sim.muzzle_velocity_fps - sub.measured_velocity_fps)
        return errors

    result = least_squares(residuals, x0=initial_guess, bounds=bounds)
    return OptimizedPowderResult(params=result.x, residual=result.cost)
```

**Performance concern:** Each optimization evaluation calls `simulate()`, which runs `solve_ivp`. With 20 submissions and 50 optimization iterations, that is 1000 solver calls. At ~5ms per call, this takes ~5 seconds. This is acceptable for a background task but too slow for a synchronous API call.

**Solution: Run reverse-engineering as a background task.** Use FastAPI's `BackgroundTasks` or a simple queue. The API endpoint accepts the request and returns immediately with a job ID. The frontend polls for completion.

**Confidence: HIGH.** SciPy's `least_squares` with Levenberg-Marquardt is the standard tool for this type of parameter optimization. The GRT community uses a similar approach (OBT tuning adjusts Ba +/-3%).

## Data Flow: Bulk Data Import (GRT Database)

### Import Pipeline

```
GitHub: zen/grt_databases/powders/*.propellant
  |
  | Clone or download ZIP
  v
POST /api/v1/import/grt-powders (multipart file upload: ZIP of .propellant files)
  |
  v
Backend: import_.py endpoint
  |
  +--- grt_parser.parse_propellant_zip(zip_bytes)
  |      -> list[dict] (raw GRT params per powder)
  |
  +--- For each parsed powder:
  |      |
  |      +--- grt_converter.convert_grt_to_powder(raw_params)
  |      |      -> PowderCreate dict with:
  |      |           force_constant_j_kg (from Qex * 1000 * (k-1))
  |      |           covolume_m3_kg (from eta/1000)
  |      |           gamma (k directly)
  |      |           density_g_cm3 (pc/1000)
  |      |           flame_temp_k (derived)
  |      |           burn_rate_coeff (from Ba via vivacity conversion)
  |      |           burn_rate_exp (estimated from Bp/Ba ratio)
  |      |           grt_params (raw JSON storage of ALL GRT fields)
  |      |           NEW: z1, z2, Bp, Br, Brp (3-curve params, stored directly)
  |      |           NEW: quality_level ('red'|'yellow'|'green' from Qlty field)
  |      |
  |      +--- Upsert: INSERT ON CONFLICT (name) DO UPDATE
  |             Skip if existing record has higher quality_level
  |
  +--- import_batch record (track what was imported, when, from where)
  |
  v
Response: { created: N, updated: N, skipped: N, errors: [...] }
```

### Schema Changes Required for Import

The `powders` table needs these new columns for 3-curve support:

```sql
ALTER TABLE powders ADD COLUMN z1 FLOAT;           -- burn-up limit 1 (phase transition)
ALTER TABLE powders ADD COLUMN z2 FLOAT;           -- burn-up limit 2 (tail-off transition)
ALTER TABLE powders ADD COLUMN bp FLOAT;           -- progressivity factor
ALTER TABLE powders ADD COLUMN br FLOAT;           -- regressivity factor
ALTER TABLE powders ADD COLUMN brp FLOAT;          -- combined factor
ALTER TABLE powders ADD COLUMN a0 FLOAT;           -- initial burn coefficient
ALTER TABLE powders ADD COLUMN qex_kj_kg FLOAT;    -- specific explosive heat
ALTER TABLE powders ADD COLUMN quality_level VARCHAR(10) DEFAULT 'red';
ALTER TABLE powders ADD COLUMN temp_coefficient FLOAT;  -- temperature sensitivity
```

These are all nullable -- existing 2-curve powders have NULLs and continue to work with the 2-curve model. The solver checks for the presence of z1/z2 to decide which model to use.

**Confidence: HIGH.** The GRT parser and converter already exist in the codebase. The 3-curve parameter columns are a straightforward Alembic migration. The grt_params JSON column already stores raw GRT data; the new columns make the 3-curve fields queryable.

## Data Flow: Validation Test Suite

### Validation Architecture

```
Published Load Data (manual entry or structured import)
  |
  +--- validation_references table:
  |      cartridge_id, powder_id, bullet_id, charge_grains,
  |      published_velocity_fps, published_pressure_psi,
  |      source (e.g., "Hodgdon 2024 Manual"),
  |      barrel_length_inches
  |
  v
POST /api/v1/validate/run-suite
  |
  v
validation.py
  |  For each reference record:
  |    1. Build simulation params from reference data
  |    2. Run simulate()
  |    3. Compare predicted vs published:
  |       - velocity_error_pct = (predicted - published) / published * 100
  |       - pressure_error_pct = (predicted - published) / published * 100
  |    4. Aggregate: mean error, max error, std dev
  |
  v
Validation Report
  {
    total_cases: 150,
    velocity_mean_error_pct: 3.2,
    velocity_max_error_pct: 8.1,
    pressure_mean_error_pct: 5.4,
    by_cartridge: { ".308 Win": { ... }, "6.5 CM": { ... } },
    by_powder: { "Varget": { ... }, "H4350": { ... } },
    worst_cases: [ ... ]
  }
```

This is essentially a CI-compatible test harness. The validation suite can be run:
1. On demand via API (for development)
2. As part of `pytest` (for CI/CD)
3. After a bulk powder import (to verify new data quality)

**Confidence: HIGH.** This is a standard testing pattern -- compare model predictions to known-good reference data. No novel architecture needed.

## Data Flow: Additional Chart Types

### New Charts and Their Data Sources

All new charts consume data that the solver ALREADY computes internally but does not currently expose.

| Chart | X-Axis | Y-Axis | Data Source | Backend Change |
|-------|--------|--------|-------------|----------------|
| Burn Progress | Time (ms) | Z (burn fraction, 0-1) | `Z_arr` from solver | Add `burn_curve` to SimResult |
| Gas Generation Rate | Time (ms) | dZ/dt (1/s) | Derivative of Z_arr | Add `gas_generation_curve` to SimResult |
| Energy | Distance (mm) | KE (ft-lbs or J) | `v_arr` + bullet mass | Add `energy_curve` to SimResult |
| Recoil Impulse | Time (ms) | Impulse (N*s) | Momentum integration | Add `recoil_curve` to SimResult |
| Gas Temperature | Time (ms) | T (K) | T_gas from heat transfer | Add `temperature_curve` to SimResult |
| Heat Flux | Time (ms) | q (W/m2) | dQ_dt from ODE | Add `heat_flux_curve` to SimResult |
| Sensitivity Bands | Charge (gr) | Velocity/Pressure | Multiple sim runs at +/- charge | Endpoint change: run 3 sims (nominal, +delta, -delta) |

### Implementation Pattern

The solver currently computes 200 sample points along the trajectory. For each new curve, we add a list of dicts to SimResult following the exact same pattern as `pressure_curve` and `velocity_curve`:

```python
# In solver.py, after the main integration loop:
burn_curve = []
energy_curve = []
temperature_curve = []

for i in range(n_points):
    burn_curve.append({"t_ms": float(t_eval[i] * 1000.0), "z": float(Z_arr[i])})
    ke_j = 0.5 * bullet.mass_kg * v_arr[i]**2
    energy_curve.append({"x_mm": float(x_arr[i] / MM_TO_M), "ke_ft_lbs": float(ke_j * J_TO_FT_LBS)})
    # temperature from ODE internal state or recomputed
    ...
```

Frontend chart components follow the existing pattern exactly (PressureTimeChart.tsx is the template):

```typescript
// components/charts/BurnProgressChart.tsx
export default function BurnProgressChart({ data }: { data: BurnPoint[] }) {
  return (
    <ResponsiveContainer>
      <LineChart data={data}>
        <XAxis dataKey="t_ms" />
        <YAxis dataKey="z" domain={[0, 1]} />
        <Line dataKey="z" stroke="#22c55e" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Key decision: Add curves to SimResult, NOT as separate endpoints.** The data is computed during the same solver run. Splitting into separate API calls would mean re-running the simulation. The JSONB storage in PostgreSQL handles the additional curve data without schema changes.

**Confidence: HIGH.** This is a direct extension of existing patterns. No architectural decisions needed -- just more data points from the same computation.

## Database Schema Additions

### New and Modified Tables

```
MODIFIED: powders
  + z1 FLOAT NULL                    -- 3-curve: burn-up limit 1
  + z2 FLOAT NULL                    -- 3-curve: burn-up limit 2
  + bp FLOAT NULL                    -- progressivity factor
  + br FLOAT NULL                    -- regressivity factor
  + brp FLOAT NULL                   -- combined brisance/progressivity
  + a0 FLOAT NULL                    -- initial burn coefficient
  + qex_kj_kg FLOAT NULL            -- specific explosive heat (kJ/kg)
  + quality_level VARCHAR(10) DEFAULT 'red'  -- red/yellow/green
  + temp_coefficient FLOAT NULL      -- temperature sensitivity (%/degC)

NEW: community_submissions
  id UUID PK
  user_identifier VARCHAR(100)       -- device ID or future user ID
  powder_id UUID FK -> powders
  bullet_id UUID FK -> bullets
  rifle_id UUID FK -> rifles
  charge_grains FLOAT NOT NULL
  measured_velocities JSONB NOT NULL  -- array of FPS values
  mean_velocity_fps FLOAT NOT NULL
  sd_fps FLOAT NOT NULL
  es_fps FLOAT NOT NULL
  predicted_velocity_fps FLOAT       -- sim result at time of submission
  prediction_error_pct FLOAT         -- (predicted - measured) / measured * 100
  ambient_temp_c FLOAT NULL
  notes TEXT NULL
  created_at TIMESTAMPTZ NOT NULL

NEW: validation_references
  id UUID PK
  cartridge_name VARCHAR(100) NOT NULL
  powder_name VARCHAR(100) NOT NULL
  bullet_weight_gr FLOAT NOT NULL
  bullet_name VARCHAR(100) NULL
  charge_grains FLOAT NOT NULL
  published_velocity_fps FLOAT NOT NULL
  published_pressure_psi FLOAT NULL
  barrel_length_inches FLOAT NOT NULL
  source VARCHAR(200) NOT NULL       -- "Hodgdon 2024", "Sierra 6th Edition", etc.
  cartridge_id UUID FK -> cartridges NULL  -- linked after matching
  powder_id UUID FK -> powders NULL        -- linked after matching
  bullet_id UUID FK -> bullets NULL        -- linked after matching
  created_at TIMESTAMPTZ NOT NULL

NEW: shared_loads
  id UUID PK
  user_identifier VARCHAR(100)
  load_id UUID FK -> loads
  title VARCHAR(200) NOT NULL
  description TEXT NULL
  tags JSONB NULL                     -- ["precision", "hunting", "competition"]
  votes INT DEFAULT 0
  is_public BOOLEAN DEFAULT true
  created_at TIMESTAMPTZ NOT NULL

NEW: import_batches
  id UUID PK
  source VARCHAR(100) NOT NULL       -- "grt_community", "hodgdon_manual", etc.
  file_name VARCHAR(200) NULL
  records_created INT DEFAULT 0
  records_updated INT DEFAULT 0
  records_skipped INT DEFAULT 0
  errors JSONB NULL
  created_at TIMESTAMPTZ NOT NULL
```

### Migration Strategy

All schema changes are additive (new columns with NULL defaults, new tables). This means:
1. No data loss
2. No downtime
3. Existing API contracts preserved
4. Alembic migrations can be applied incrementally per phase

## Patterns to Follow

### Pattern 1: Solver Extension via Composition

**What:** Extend the solver by composing new modules, not modifying the ODE structure.

**When:** Adding the 3-curve model, new output curves, or new physics models.

**Example:**
```python
# burn_model.py acts as a dispatcher
def get_form_function(Z, powder):
    if powder.has_3curve_params():
        return form_function_3curve(Z, powder.z1, powder.z2, powder.Bp, powder.Br, powder.Brp)
    else:
        return form_function(Z, powder.theta)

# solver.py calls the dispatcher instead of form_function directly
psi = burn_model.get_form_function(Z_c, powder)
```

**Why:** Preserves backward compatibility. Existing tests continue to pass. New model is testable in isolation.

### Pattern 2: Dynamic Component Loading for 3D

**What:** Use Next.js `dynamic()` with `{ ssr: false }` for all Three.js components.

**When:** Any component that imports from `@react-three/fiber` or `three`.

**Example:**
```typescript
// pages/rifles/[id]/page.tsx
import dynamic from 'next/dynamic';

const RifleViewer3D = dynamic(
  () => import('@/components/viewers/RifleViewer3D'),
  { ssr: false, loading: () => <div className="h-96 bg-slate-800 animate-pulse" /> }
);
```

**Why:** Three.js requires browser APIs (WebGL, canvas). SSR will crash. Dynamic import also splits the bundle so Three.js is only loaded when the 3D viewer is visible.

### Pattern 3: Background Processing for Heavy Computation

**What:** Use FastAPI BackgroundTasks for operations that take > 2 seconds.

**When:** Reverse engineering, bulk import, validation suite.

**Example:**
```python
@router.post("/community/reverse-engineer/{powder_id}")
async def trigger_reverse_engineering(
    powder_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    # Validate powder exists and has enough submissions
    job_id = uuid4()
    background_tasks.add_task(run_reverse_engineering, powder_id, job_id)
    return {"job_id": job_id, "status": "processing"}
```

**Why:** The reverse-engineering loop runs 100-1000 solver evaluations. This would timeout a synchronous HTTP request.

### Pattern 4: Incremental Curve Emission

**What:** Add new curve arrays to SimResult without changing the API contract for existing clients.

**When:** Adding burn progress, energy, temperature curves.

**Example:**
```python
# SimResult gains optional fields with defaults
@dataclass
class SimResult:
    # ... existing fields ...
    burn_curve: list[dict] | None = None
    energy_curve: list[dict] | None = None
    temperature_curve: list[dict] | None = None
```

**Why:** Existing frontend code ignores fields it does not use. New charts are added to the simulation page independently. No breaking changes.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Monolithic Solver Function

**What:** Adding all 3-curve logic directly into `solver.py`'s `_build_ode_system()`.

**Why bad:** `solver.py` is already 445 lines. Adding 3-curve logic, new curve emissions, and sensitivity analysis inline would make it unmaintainable and untestable.

**Instead:** Create `burn_model.py` as a dispatcher. Each burn model variant is a separate function with its own unit tests. The solver calls the dispatcher.

### Anti-Pattern 2: Pre-built 3D Assets

**What:** Creating .glTF/.glb files for each rifle/cartridge combination.

**Why bad:** There are thousands of rifle/cartridge combinations. Managing a 3D asset library is a content management problem, not a software problem. Assets go stale when dimensions change.

**Instead:** Generate geometry parametrically from dimension data using Three.js LatheGeometry. The dimensions already exist in the database.

### Anti-Pattern 3: Synchronous Reverse Engineering

**What:** Running the scipy.optimize loop inside the HTTP request handler.

**Why bad:** 100+ solver evaluations take 5-30 seconds. This blocks the API worker thread and will hit the rate limiter and/or timeout.

**Instead:** Background task with job ID. Frontend polls for completion. Consider FastAPI BackgroundTasks for simplicity (no need for Celery/Redis at this scale).

### Anti-Pattern 4: Separate Endpoints per Chart

**What:** Creating `/api/v1/simulate/burn-curve`, `/api/v1/simulate/energy-curve`, etc.

**Why bad:** Each endpoint would re-run the same simulation. The data is computed in a single solver call. Separate endpoints waste CPU and introduce consistency issues (different random seeds, timing).

**Instead:** Return all curves in a single response. Frontend components pick the curves they need.

## Suggested Build Order (Dependencies)

The v2 features have clear dependency chains. Build order must respect these:

```
Phase 1: 3-Curve Model Foundation
  |  - Extend PowderParams dataclass with 3-curve fields
  |  - Create burn_model.py dispatcher
  |  - Implement form_function_3curve()
  |  - Modify solver to call dispatcher
  |  - Alembic migration for powders table
  |  - Tests: 3-curve vs 2-curve parity, known GRT test cases
  |
  |  WHY FIRST: Every other feature benefits from better accuracy.
  |  The 3-curve model is the core engine upgrade.
  v
Phase 2: Bulk Data Import + Additional Charts
  |  (These two are independent and can run in parallel)
  |
  +--- 2a: Bulk Import Pipeline
  |      - Extend grt_converter for 3-curve params
  |      - POST /import/grt-powders endpoint
  |      - Manufacturer bullet/cartridge ETL
  |      - import_batches table
  |
  |      WHY SECOND: Populates the database with 200+ powders.
  |      All downstream features need data to work with.
  |
  +--- 2b: Additional Charts
  |      - Add burn_curve, energy_curve, temp_curve to SimResult
  |      - BurnProgressChart, EnergyChart, TemperatureChart components
  |      - Sensitivity analysis (run sim at +/- charge)
  |
  |      WHY PARALLEL: Pure additive. No dependency on import.
  |      Extends existing solver output.
  v
Phase 3: Validation Test Suite
  |  - validation_references table + seed data from load manuals
  |  - validation.py comparison engine
  |  - POST /validate/run-suite endpoint
  |  - pytest integration for CI
  |
  |  DEPENDS ON: Phase 1 (3-curve model) + Phase 2a (imported powders)
  |  Need accurate model + real data to validate against.
  v
Phase 4: Community Features
  |  - community_submissions table
  |  - POST /community/submit-chrono endpoint
  |  - reverse_engineer.py optimization loop
  |  - Powder quality level system
  |  - shared_loads table + browse/submit pages
  |
  |  DEPENDS ON: Phase 1 (3-curve model) + Phase 3 (validation)
  |  Need validated model before accepting community data.
  |  Reverse engineering needs 3-curve params to optimize.
  v
Phase 5: 3D Viewers (Independent)
  |  - Install @react-three/fiber + @react-three/drei
  |  - RifleViewer3D component (LatheGeometry from dimensions)
  |  - CartridgeViewer3D component
  |  - 2D SVG cutaway fallback
  |  - Integration into rifle/cartridge detail pages
  |
  |  INDEPENDENT: No backend dependency. Can be built any time.
  |  Deferred because it is the lowest-impact feature for accuracy.
```

### Dependency Graph (Simplified)

```
3-Curve Model (P1)
  |
  +---> Bulk Import (P2a) ---> Validation Suite (P3) ---> Community Features (P4)
  |
  +---> Additional Charts (P2b) [independent]

3D Viewers (P5) [fully independent, no dependencies]
```

## Scalability Considerations

| Concern | Current (v1) | v2 Target | Approach |
|---------|-------------|-----------|----------|
| Powder database size | 22 powders | 200+ powders | No concern; index on name for search |
| Simulation response size | ~50KB (200 points x 2 curves) | ~150KB (200 points x 7 curves) | Still small; JSONB handles it. Consider optional curve flag if needed |
| Bulk import throughput | N/A | 200 powders in one batch | Sequential processing fine; ~1s total for parsing + DB writes |
| Community submissions | N/A | 100-1000 records | Standard CRUD; no scaling concern |
| Reverse engineering | N/A | ~5s per powder (100 evals x 50ms) | Background task; fine for single-user |
| 3D rendering | N/A | Client-side only | Browser GPU handles it; parametric geometry is tiny |
| Validation suite | N/A | 150 reference cases x ~50ms each = ~7.5s | Background task or dedicated endpoint; cache results |

## Sources

### Context7 / Official Documentation
- SciPy solve_ivp documentation: https://docs.scipy.org/doc/scipy/reference/generated/scipy.integrate.solve_ivp.html (HIGH confidence)
- SciPy least_squares documentation: https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.least_squares.html (HIGH confidence)
- React Three Fiber official docs: https://r3f.docs.pmnd.rs/ (HIGH confidence)
- pmndrs/react-three-next starter: https://github.com/pmndrs/react-three-next (HIGH confidence)

### Codebase Analysis (HIGH confidence)
- Existing solver.py, thermodynamics.py, grt_parser.py, grt_converter.py analyzed directly
- Current ODE system structure: 4 variables (Z, x, v, Q_loss)
- Current GRT parameter handling: Ba, Bp, Br, Brp, k, z1, z2, eta, pc, pcd already parsed

### GRT Technical References (MEDIUM confidence)
- GRT propellant database page: https://grtools.de/doku.php?id=en:doku:dbpropellant (page currently 404, but parameter names confirmed via existing parser)
- GRT community databases: https://github.com/zen/grt_databases (confirmed file structure)
- GRT manual (Scribd): https://www.scribd.com/document/866321500/grt-manual-2021-09-29-en (limited technical depth accessible)
- GRT powder model development discussion: https://forum.accurateshooter.com/threads/gathering-data-for-powder-model-development-gordons-reloading-tool.4072119/ (MEDIUM confidence)

### Ballistics Literature (MEDIUM confidence)
- Form function and z1/z2 breakpoints: https://www.jes.or.jp/mag/stem/Vol.76/documents/Vol.76,No.1,p.1-7.pdf
- Internal ballistics modeling review: https://www.sciencedirect.com/science/article/pii/S2214914724001120
- Experimental form function derivation: https://www.ballistics.org/docs/posterISB32.pdf

### Web Search (LOW-MEDIUM confidence)
- Three.js LatheGeometry documentation: https://threejs.org/docs/#api/en/geometries/LatheGeometry
- React Three Fiber Next.js integration patterns: https://medium.com/@divyanshsharma0631/unlocking-the-third-dimension-building-immersive-3d-experiences-with-react-three-fiber-in-next-js-153397f27802
- Reverse engineering powder models community discussion: https://www.shootersforum.com/threads/reverse-engineering-powder-for-gordons-reloading-tool.245682/
