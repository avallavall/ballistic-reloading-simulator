# Technology Stack - v2 Features

**Project:** Simulador de Balistica de Precision v2
**Researched:** 2026-02-20
**Scope:** New libraries and technical approaches for v2 features (3-curve model, 3D rendering, community DB, data import, additional charts)

---

## 1. Three-Curve Powder Burn Model

### 1.1 Mathematical Extension

**Confidence: MEDIUM** (GRT is closed-source; equations reconstructed from documentation, community discussion, and internal ballistics literature)

The current solver uses a single Vieille law `r_b = a1 * P^n` with a quadratic form function `psi(Z) = (theta+1)*Z - theta*Z^2`. GRT's 3-curve model adds a **piecewise form function** with three distinct burn phases.

**GRT Parameters (from .propellant XML files):**

| Parameter | Meaning | Units | Current Model Equivalent |
|-----------|---------|-------|--------------------------|
| `Ba` | Vivacity (combustion coefficient) | dimensionless | `burn_rate_coeff` (via conversion) |
| `k` | Isentropic exponent (gamma) | dimensionless | `gamma` |
| `Qex` | Specific explosive energy | kJ/kg | `force_constant_j_kg / (k-1) / 1000` |
| `a0` | Initial burn surface fraction | dimensionless | **NEW** -- no equivalent |
| `z1` | Burn-up limit phase 1 | dimensionless (0-1) | **NEW** -- no equivalent |
| `z2` | Burn-up limit phase 2 | dimensionless (0-1) | **NEW** -- no equivalent |
| `pc` | Solid grain density | kg/m3 | `density_g_cm3 * 1000` |
| `pcd` | Bulk (loading) density | kg/m3 | Not used |
| `eta` | Covolume | cm3/g | `covolume_m3_kg * 1000` |
| `Bp` | Progressivity factor | dimensionless | Not used |
| `Br` | Brisance factor | dimensionless | Not used |
| `Brp` | Combined brisance/progressivity | dimensionless | Not used |
| `pt` | Reference temperature | Celsius | Not used (future temp sensitivity) |
| `tcc` | Temperature coefficient combustion | 1/K | **NEW** -- for temp sensitivity |
| `tch` | Temperature coefficient heat | 1/K | **NEW** -- for temp sensitivity |

**3-Phase Form Function (reconstructed):**

The key insight: GRT splits the form function `psi(Z)` into three piecewise regions controlled by `a0`, `z1`, and `z2`:

```
Phase 1 (ignition):     0   <= Z <= z1   -- initial surface geometry, controlled by a0
Phase 2 (main burn):    z1  <= Z <= z2   -- primary combustion, progressive/regressive
Phase 3 (tail-off):     z2  <= Z <= 1.0  -- grain slivering and fragment burnout
```

The form function in each phase uses different coefficients derived from `a0`, `z1`, `z2`, `Bp`, and `Br`. The vivacity (instantaneous burn rate normalized by pressure) changes across these three regions, which is what GRT visualizes as the "3-curve vivacity diagram" with three colored segments.

**Implementation approach for the solver:**

```python
def form_function_3curve(Z: float, a0: float, z1: float, z2: float, Bp: float, Br: float) -> float:
    """Piecewise form function matching GRT's 3-curve model.

    Phase 1 (0 <= Z <= z1): Initial ignition / surface-area-limited
    Phase 2 (z1 <= Z <= z2): Main burn, geometry-driven
    Phase 3 (z2 <= Z <= 1.0): Tail-off / sliver burnout
    """
    Z = max(0.0, min(1.0, Z))

    if Z <= z1:
        # Phase 1: ignition ramp
        # Linear ramp from 0 to psi_1, scaled by a0
        t = Z / z1 if z1 > 0 else 1.0
        psi = a0 * t  # a0 controls how much burns by z1
    elif Z <= z2:
        # Phase 2: main progressive/regressive burn
        # Quadratic with progressivity factor Bp
        t = (Z - z1) / (z2 - z1)
        psi_1 = a0
        psi_2 = a0 + (1.0 - a0) * (1.0 + Bp) * t - Bp * t**2
        psi = min(psi_2, 1.0)
    else:
        # Phase 3: tail-off / sliver burnout
        t = (Z - z2) / (1.0 - z2) if z2 < 1.0 else 1.0
        psi_at_z2 = ...  # evaluate phase 2 at z2
        psi = psi_at_z2 + (1.0 - psi_at_z2) * (1.0 - (1.0 - t) ** (1.0 + Br))

    return max(0.0, min(1.0, psi))
```

**NOTE:** The exact mathematical form inside each phase is **LOW confidence** because GRT is closed-source. The approach above is reconstructed from:
- Known parameter meanings (a0 = initial surface fraction, z1/z2 = phase boundaries)
- GRT community documentation about the vivacity diagram
- Standard internal ballistics literature on multi-phase grain burning
- Example powder data (e.g., H4831SC: a0=0.44, z1=0.49, z2=0.8374)

The implementation should be validated against GRT predictions for known loads. The strategy is:
1. Implement the piecewise form function
2. Run solver with GRT parameters for well-known loads (e.g., .308 Win with Varget)
3. Compare predicted velocity/pressure to GRT's published values
4. Iterate on the phase functions until predictions match within 2%

### 1.2 ODE System Changes

**No new libraries needed.** SciPy `solve_ivp` (RK45) handles the 3-curve model with zero changes to the integrator. The change is entirely within `_build_ode_system()`:

- Replace `form_function(Z_c, theta)` calls with `form_function_3curve(Z_c, a0, z1, z2, Bp, Br)`
- Add new fields to `PowderParams` dataclass: `a0`, `z1`, `z2`, `Bp`, `Br`
- Backward compatibility: when `z1`/`z2` are None (old 2-curve powders), fall back to current `form_function()`

### 1.3 Database Schema Extension

The `Powder` model already has a `grt_params: JSON` column that stores raw GRT parameters. The 3-curve model needs the GRT params to be **first-class columns** rather than buried in JSON, because the solver reads them directly:

**New columns on `powders` table:**

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `a0` | Float, nullable | None | Initial burn surface fraction |
| `z1` | Float, nullable | None | Phase 1/2 boundary |
| `z2` | Float, nullable | None | Phase 2/3 boundary |
| `Bp` | Float, nullable | None | Progressivity factor |
| `Br` | Float, nullable | None | Brisance factor |
| `temp_coeff` | Float, nullable | None | Temperature sensitivity (sigma_p, 1/K) |
| `model_quality` | String(10), nullable | None | 'red'/'yellow'/'green' confidence |

**Migration:** Alembic `ALTER TABLE powders ADD COLUMN` for each new field. Nullable so existing 22 powders work without changes.

### 1.4 Required Libraries

| Library | Version | Already Installed | Purpose |
|---------|---------|-------------------|---------|
| SciPy | 1.15.0 | Yes | `solve_ivp` ODE integrator -- no change |
| NumPy | 2.2.1 | Yes | Array operations -- no change |

**No new backend dependencies for the 3-curve model.** This is pure math implemented in Python.

---

## 2. 3D/2D Viewers (Three.js / React Three Fiber)

### 2.1 Recommended Stack

**Confidence: HIGH** (verified via npm registry, official documentation)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `three` | 0.183.0 | 3D rendering engine | Only viable browser-native 3D library. Monthly releases, 2.7M weekly npm downloads. |
| `@react-three/fiber` | 9.5.0 | React renderer for Three.js | Official React binding from pmndrs. Declarative JSX syntax for 3D scenes. Compatible with React 18. |
| `@react-three/drei` | 10.7.7 | Helper components for R3F | OrbitControls, PerspectiveCamera, Environment, Html overlays, annotations. Saves hundreds of lines of boilerplate. |
| `@react-three/csg` | 4.0.0 | Constructive Solid Geometry | Boolean operations (subtract bore from barrel cylinder). Essential for cutaway views. |
| `@types/three` | latest | TypeScript types for Three.js | Type safety for Three.js objects. |

### 2.2 Architecture: Procedural Geometry (Not 3D Model Files)

**Use procedural/parametric geometry, NOT pre-made .glTF/.obj models.** The entire value of our 3D viewers is that they update dynamically from component dimensions:

- **Rifle barrel**: `THREE.LatheGeometry` -- define 2D profile from barrel contour (bore diameter, outer diameter, taper), revolve around axis. CSG subtraction for bore hole, chamber, gas port.
- **Cartridge**: `THREE.LatheGeometry` for case body (from case dimensions) + `THREE.SphereGeometry` truncated for ogive bullet shape. CSG subtraction for primer pocket.
- **Cross-section cutaway**: `@react-three/csg` Subtraction with a half-plane to create technical cutaway views.

**Why LatheGeometry:**
- Rifle barrels and cartridges are rotationally symmetric (axisymmetric)
- LatheGeometry takes an array of `Vector2` points defining the profile curve and revolves them
- Profile points are generated directly from database dimensions (barrel length, bore diameter, chamber length, case neck diameter, shoulder angle, etc.)
- No external 3D models to load, no asset pipeline, no CORS issues
- Geometry updates instantly when user changes dimensions

**Annotation approach:** `@react-three/drei`'s `Html` component overlays dimension labels (2D HTML elements) positioned at 3D coordinates. The labels show actual measurements from the database.

### 2.3 Next.js Integration

React Three Fiber requires client-side rendering (uses WebGL/canvas). In Next.js 14 App Router:

```tsx
// components/viewers/RifleViewer.tsx
'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html } from '@react-three/drei';
```

**Use `dynamic()` with `ssr: false`** for the page-level import to prevent SSR hydration errors:

```tsx
// app/rifles/[id]/page.tsx
import dynamic from 'next/dynamic';
const RifleViewer = dynamic(() => import('@/components/viewers/RifleViewer'), { ssr: false });
```

**Add to `next.config.js`:**
```js
transpilePackages: ['three', '@react-three/fiber', '@react-three/drei', '@react-three/csg']
```

### 2.4 2D Technical Drawings

For annotated 2D technical drawings (CIP-style cartridge dimensioning), use **SVG directly** -- not Three.js:

- SVG is lighter weight, more accessible, and prints cleanly
- Generate SVG paths from cartridge dimensions (case length, neck diameter, shoulder angle, overall length)
- Dimension lines with arrowheads and measurement labels
- No additional library needed -- React can render SVG natively

**Use Three.js only for the interactive 3D rotatable views.** 2D technical drawings are SVG.

### 2.5 Installation

```bash
cd frontend
npm install three @react-three/fiber @react-three/drei @react-three/csg
npm install -D @types/three
```

**Bundle size impact:** Three.js adds ~600KB to the bundle (gzipped ~150KB). Mitigate with:
- `next/dynamic` with `ssr: false` (only loads on viewer pages)
- Tree-shaking: import specific geometries, not `import * as THREE`

---

## 3. Additional Simulation Charts

### 3.1 Recharts Extensions (No New Libraries)

**Confidence: HIGH** (Recharts 2.13.0 already installed, components verified in documentation)

The existing Recharts installation supports all needed chart types with no additional dependencies:

| Chart | Recharts Components | Data Source |
|-------|---------------------|-------------|
| **Burn progress (Z vs t)** | `LineChart` + `Line` | `Z_arr` already in solver output |
| **Energy curves (KE vs x)** | `LineChart` + `Line` | `0.5 * m * v^2` from `v_arr` |
| **Temperature curves** | `LineChart` + multiple `Line` | Gas temp from ODE state, wall temp |
| **Heat flux (Q_loss vs t)** | `AreaChart` + `Area` | `Q_arr` already in solver output |
| **Sensitivity bands** | `AreaChart` + `Area` (fill between) + `ReferenceArea` | Run simulation 3x: nominal, +delta, -delta |

**Sensitivity analysis approach:**
Run the simulation three times (nominal, +2% charge, -2% charge). Return all three pressure and velocity curves. In the frontend, use two overlapping `<Area>` components to create a shaded band:

```tsx
<AreaChart data={sensitivityData}>
  <Area dataKey="p_upper" stroke="none" fill="#ff0000" fillOpacity={0.15} />
  <Area dataKey="p_lower" stroke="none" fill="#ffffff" fillOpacity={1} />
  <Line dataKey="p_nominal" stroke="#ff0000" />
</AreaChart>
```

Or use `ReferenceArea` for highlighting specific pressure/velocity regions of interest.

**ErrorBar** component (built into Recharts) can show whiskers on data points for individual error bars.

### 3.2 Backend API Changes

The solver currently returns only `pressure_curve` and `velocity_curve`. Extend `SimResult` with additional output arrays:

```python
@dataclass
class SimResult:
    # ... existing fields ...
    burn_progress_curve: list[dict] | None = None   # [{t_ms, Z, psi}]
    energy_curve: list[dict] | None = None          # [{x_mm, ke_j, momentum_ns}]
    temperature_curve: list[dict] | None = None     # [{t_ms, t_gas_k, t_wall_k, q_loss_j}]
```

These arrays are derived from data already computed during integration (`Z_arr`, `v_arr`, `Q_arr`, `T_gas`). Zero additional computation cost -- just formatting existing intermediate values.

### 3.3 Sensitivity Analysis Endpoint

Add `POST /simulate/sensitivity` that runs the solver 3 times:
- Nominal charge weight
- +N% charge (configurable, default 2%)
- -N% charge

Returns three sets of curves that the frontend overlays. Rate-limit to 3/min (same as parametric search) since it runs 3x simulations.

### 3.4 Required Libraries

**None.** All charts use existing Recharts 2.13.0 installation.

---

## 4. Pre-loaded Data Import Pipeline

### 4.1 GRT Community Database Import

**Confidence: HIGH** (parser already exists at `backend/app/core/grt_parser.py`)

The existing codebase already has:
- `grt_parser.py` -- parses `.propellant` XML files and ZIP archives
- `grt_converter.py` -- converts GRT params (Ba, Qex, k, etc.) to internal Powder schema
- `grt_params` JSON column on `Powder` model -- stores raw GRT data
- `GrtImportResult` schema -- tracks created/skipped/errors

**What needs to change for v2:**
1. **Bulk import from GitHub**: Script to clone/download `zen/grt_databases` repo and import all 12+ .propellant files
2. **3-curve param extraction**: Update `grt_converter.py` to also extract `a0`, `z1`, `z2`, `Bp`, `Br` as first-class columns (not just in grt_params JSON)
3. **Quality indicator mapping**: GRT's `Qlty` field maps to `model_quality` ('red'/'yellow'/'green')
4. **Deduplication**: Match by powder name + manufacturer to avoid duplicates on re-import
5. **Seed data expansion**: Convert the 22 existing powders to include GRT params where available

**Bulk import tool (management command):**

```bash
# Download GRT databases
python -m app.tools.import_grt --source https://github.com/zen/grt_databases --type powders

# Or from local directory
python -m app.tools.import_grt --source ./grt_databases/powders/ --type powders
```

### 4.2 Bullet Database from Manufacturer Specs

**Confidence: MEDIUM** (no existing parser; data must be manually compiled or scraped)

No standard machine-readable format exists for bullet data across manufacturers. Approach:

| Source | Format | Fields | Method |
|--------|--------|--------|--------|
| Sierra | PDF catalogs, website | weight, diameter, BC G1/G7, length, type | Manual compilation into JSON/CSV seed file |
| Hornady | Website product pages | weight, diameter, BC G1, sectional density | Structured JSON seed file |
| Nosler | Website product pages | weight, diameter, BC, type | Structured JSON seed file |
| Berger | Website with detailed BC tables | weight, diameter, BC G1/G7 by velocity range | Structured JSON seed file |
| Lapua | Website product pages | weight, diameter, BC G1/G7 | Structured JSON seed file |

**Implementation:**
- Create `backend/app/seed/bullet_data.py` with 500+ bullet records as Python dicts
- Each record: `{name, manufacturer, weight_grains, diameter_mm, bc_g1, bc_g7, length_mm, type}`
- Import via seed script during database initialization
- License: all data from publicly available manufacturer specs (no proprietary data)

### 4.3 Cartridge Database

**Confidence: MEDIUM**

Source CIP/SAAMI specs from public domain. GRT databases repo has `.caliber` files -- extend `grt_parser.py` to parse these.

### 4.4 Required Libraries

| Library | Version | Already Installed | Purpose |
|---------|---------|-------------------|---------|
| `xml.etree.ElementTree` | stdlib | Yes | Parse .propellant XML files |
| `httpx` | 0.28.1 | Yes | Download GRT databases from GitHub |
| `zipfile` | stdlib | Yes | Extract ZIP archives |

**No new backend dependencies for data import.** All parsing uses Python stdlib.

---

## 5. Community Features

### 5.1 Authentication Architecture

**Confidence: HIGH** (FastAPI JWT auth is well-documented, Auth.js v5 verified)

**Backend (FastAPI):**

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `python-jose[cryptography]` | 3.3.0 | JWT token encoding/decoding | Official FastAPI recommendation. Handles HS256/RS256 JWT creation and validation. |
| `passlib[bcrypt]` | 1.7.4 | Password hashing | bcrypt is slow-by-design, resistant to brute force. Industry standard. |
| `python-multipart` | 0.0.20 | Already installed | Form data for login requests |

**Frontend (Next.js):**

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `next-auth` (Auth.js v5) | 5.x (beta) | Session management, auth UI | Official Next.js auth solution. App Router compatible. Works with custom backend. |
| `@auth/core` | latest | Core auth logic | Required by Auth.js v5. |

**Why NOT use Auth.js's built-in database adapter:**
Our auth backend is FastAPI, not Next.js API routes. Auth.js handles frontend session cookies and calls our FastAPI `/auth/login` and `/auth/register` endpoints via the Credentials provider. User data lives in PostgreSQL, managed by SQLAlchemy.

**Auth flow:**
1. User registers via Next.js form -> calls FastAPI `POST /auth/register` (bcrypt hash, store in `users` table)
2. User logs in via Next.js form -> calls FastAPI `POST /auth/login` -> returns JWT
3. Auth.js stores JWT in httpOnly cookie
4. Subsequent API calls include JWT in Authorization header
5. FastAPI middleware validates JWT, extracts `user_id`

### 5.2 New Database Tables

```
users
  id: UUID (PK)
  email: str (unique)
  password_hash: str
  display_name: str
  created_at: datetime

community_submissions
  id: UUID (PK)
  user_id: UUID (FK -> users)
  powder_id: UUID (FK -> powders)
  rifle_id: UUID (FK -> rifles, nullable)
  chrono_data: JSON  -- {velocities: [float], sd: float, es: float, n_rounds: int}
  charge_grains: float
  coal_mm: float
  ambient_temp_c: float (nullable)
  notes: str (nullable)
  status: str  -- 'pending' / 'approved' / 'rejected'
  created_at: datetime

shared_loads
  id: UUID (PK)
  user_id: UUID (FK -> users)
  load_id: UUID (FK -> loads)
  description: str
  is_public: bool
  rating_sum: int (default 0)
  rating_count: int (default 0)
  created_at: datetime

powder_ratings
  id: UUID (PK)
  user_id: UUID (FK -> users)
  powder_id: UUID (FK -> powders)
  data_quality: int (1-5)
  accuracy_rating: int (1-5)  -- how well simulation matched real data
  created_at: datetime
```

### 5.3 Reverse-Engineering Algorithm

**Confidence: MEDIUM** (approach is sound; calibration accuracy depends on data quality)

Given chronograph velocity data for a known load, reverse-engineer the powder burn parameters (Ba/a1, n) that make the simulation match reality.

**Use `scipy.optimize.minimize`** (already installed, SciPy 1.15.0):

```python
from scipy.optimize import minimize, differential_evolution

def calibration_objective(params, target_velocity, target_pressure, known_config):
    """Objective function: minimize error between simulated and measured values."""
    a1, n = params
    powder = PowderParams(..., burn_rate_coeff=a1, burn_rate_exp=n)
    result = simulate(powder, bullet, cartridge, rifle, load)

    vel_error = (result.muzzle_velocity_fps - target_velocity) ** 2
    # Optional: include pressure error if PressureTrace data available
    pres_error = (result.peak_pressure_psi - target_pressure) ** 2 if target_pressure else 0

    return vel_error + 0.1 * pres_error

# Use differential_evolution for global optimization (avoids local minima)
result = differential_evolution(
    calibration_objective,
    bounds=[(1e-10, 1e-6), (0.6, 1.0)],  # a1 and n bounds
    args=(measured_velocity, measured_pressure, config),
    maxiter=200,
    tol=0.01,
)
```

**Why `differential_evolution` over `curve_fit`:**
- Our objective function runs a full ODE integration (not a closed-form function)
- Non-differentiable (can't compute gradients through `solve_ivp`)
- Global optimizer avoids getting stuck in local minima
- Slow but acceptable for calibration (runs once, not per-request)

**Rate-limit:** 1/min per user. Calibration is expensive (~200 simulation runs per optimization).

### 5.4 Required Libraries

| Library | Version | Already Installed | Purpose |
|---------|---------|-------------------|---------|
| `python-jose[cryptography]` | 3.3.0 | **No** | JWT tokens |
| `passlib[bcrypt]` | 1.7.4 | **No** | Password hashing |
| `next-auth` | 5.x-beta | **No** | Frontend auth (Auth.js v5) |
| `scipy.optimize` | 1.15.0 | Yes | `differential_evolution` for calibration |

---

## 6. Temperature Sensitivity

### 6.1 Implementation

**Confidence: HIGH** (standard physics, equation already documented in physics_core.md)

Temperature sensitivity modifies the burn rate coefficient:

```
a1(T_amb) = a1(T_ref) * exp(sigma_p * (T_amb - T_ref))
```

Where `sigma_p` is the temperature coefficient (typically 0.001 to 0.004 K^-1).

**Changes needed:**
- Add `temp_coeff` column to `powders` table (from GRT `tcc` parameter)
- Add `ambient_temp_c` field to simulation request schemas
- Modify `_build_ode_system()` to adjust `a1` based on temperature before integration
- Default to T_ref = 21C (70F) when no temperature specified

**No new libraries required.**

---

## 7. Complete Installation Commands

### Backend (new dependencies only)

```bash
cd backend
pip install python-jose[cryptography]==3.3.0 passlib[bcrypt]==1.7.4
```

Then add to `requirements.txt`:
```
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
```

### Frontend (new dependencies only)

```bash
cd frontend

# 3D rendering
npm install three @react-three/fiber @react-three/drei @react-three/csg
npm install -D @types/three

# Authentication (when community features are built)
npm install next-auth@beta @auth/core
```

---

## 8. Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| 3D Engine | Three.js + R3F | Babylon.js | Babylon is heavier (1.3MB vs 600KB), no React renderer equivalent to R3F, smaller React community. Three.js has 2.7M weekly npm downloads vs Babylon's ~50K. |
| 3D Engine | Three.js + R3F | react-three-map / Spline | Spline is a hosted service (vendor lock-in). react-three-map is for maps, not engineering visualization. |
| CSG Operations | @react-three/csg | three-csg-ts | @react-three/csg is maintained by the same pmndrs team as R3F, uses modern three-bvh-csg internally, declarative JSX API. three-csg-ts is imperative and less maintained. |
| Frontend Auth | Auth.js v5 (next-auth) | Clerk, Supabase Auth | Clerk is a paid service. Supabase Auth couples you to Supabase. Auth.js is open-source, self-hosted, works with our existing FastAPI backend. |
| Backend Auth | python-jose + passlib | authlib, fastapi-users | authlib is heavier than needed for simple JWT. fastapi-users is opinionated and would conflict with our existing SQLAlchemy models. python-jose + passlib is the approach recommended in FastAPI's official tutorial. |
| Optimization | scipy.optimize.differential_evolution | lmfit, pymoo | lmfit adds a dependency for what scipy already does. pymoo is for multi-objective optimization (overkill). differential_evolution is built into our existing SciPy. |
| Charting | Recharts (existing) | D3.js, Victory, Nivo | Already installed, already integrated with 3 chart types. Adding D3 raw would mean rewriting existing charts. Victory and Nivo offer nothing Recharts can't do for our line/area charts. |
| SVG Drawings | Native React SVG | D3.js, svg.js, Rough.js | React renders SVG natively -- `<svg>`, `<line>`, `<text>`, `<path>` -- no library needed for technical drawings. Adding D3 for SVG is massive overkill. |
| XML Parsing | xml.etree.ElementTree (stdlib) | lxml, BeautifulSoup | ElementTree is already used in `grt_parser.py` and handles GRT's simple XML format perfectly. lxml would add a C dependency to Docker builds for no benefit. |
| Password Hashing | bcrypt (via passlib) | argon2-cffi, scrypt | bcrypt is the industry standard, well-tested, recommended by OWASP. argon2 is theoretically stronger but has less library ecosystem support in Python. |

---

## 9. What NOT To Use

| Technology | Why Avoid |
|------------|-----------|
| **Pre-made 3D model files (.glTF, .OBJ)** | Cannot be parameterized from database dimensions. Static models defeat the purpose of a data-driven viewer. |
| **WebGPU renderer** | Three.js 0.183 supports it, but browser support is still incomplete (no Firefox stable). Stick with WebGL renderer which works everywhere. |
| **Three.js post-processing** | No need for bloom, DOF, or SSAO in an engineering visualization tool. Adds GPU load and bundle size for no user value. |
| **GraphQL** | The existing REST API is simple CRUD + simulation endpoints. GraphQL adds complexity (schema definition, resolver layer, caching strategy) for a data shape that doesn't benefit from it. |
| **WebSockets for real-time** | Community features don't need real-time updates. REST polling or TanStack Query refetch intervals are sufficient for powder quality rating updates. |
| **Redis** | No caching layer needed yet. PostgreSQL handles the data volume (hundreds of powders, not millions). Add Redis only if performance profiling shows database bottleneck. |
| **Prisma** | Would require rewriting all SQLAlchemy models and migrations. The backend is Python/SQLAlchemy -- Prisma is for Node.js/TypeScript ORMs. |
| **Docker multi-stage builds for frontend** | Already have a working Dockerfile. The 3D dependencies don't change the build process -- they're npm packages that tree-shake normally. |

---

## 10. Version Summary

### Current Stack (no changes)

| Technology | Version | Role |
|------------|---------|------|
| Python | 3.12 | Backend runtime |
| FastAPI | 0.115.6 | REST API |
| SQLAlchemy | 2.0.36 | Async ORM |
| Alembic | 1.14.1 | Migrations |
| SciPy | 1.15.0 | ODE solver + optimization |
| NumPy | 2.2.1 | Numerical computing |
| Next.js | 14.2.15 | Frontend framework |
| React | 18.3.1 | UI library |
| TanStack Query | 5.59.0 | Server state |
| Recharts | 2.13.0 | Charts |
| PostgreSQL | 16 | Database |
| Docker Compose | latest | Orchestration |

### New Dependencies (v2)

| Technology | Version | Role | Phase |
|------------|---------|------|-------|
| `three` | ^0.183.0 | 3D rendering | 3D viewers |
| `@react-three/fiber` | ^9.5.0 | React + Three.js bridge | 3D viewers |
| `@react-three/drei` | ^10.7.7 | R3F helpers (controls, camera, annotations) | 3D viewers |
| `@react-three/csg` | ^4.0.0 | Boolean geometry ops (cutaway views) | 3D viewers |
| `@types/three` | latest | TypeScript types | 3D viewers |
| `python-jose[cryptography]` | 3.3.0 | JWT token handling | Community features |
| `passlib[bcrypt]` | 1.7.4 | Password hashing | Community features |
| `next-auth` | 5.x-beta | Frontend auth / sessions | Community features |
| `@auth/core` | latest | Auth.js core | Community features |

---

## Sources

### Verified (HIGH confidence)
- [npm: @react-three/fiber 9.5.0](https://www.npmjs.com/package/@react-three/fiber)
- [npm: @react-three/drei 10.7.7](https://www.npmjs.com/package/@react-three/drei)
- [npm: @react-three/csg 4.0.0](https://www.npmjs.com/package/@react-three/csg)
- [npm: three 0.183.0](https://www.npmjs.com/package/three)
- [React Three Fiber installation docs](https://r3f.docs.pmnd.rs/getting-started/installation)
- [Recharts ReferenceArea API](https://recharts.github.io/en-US/api/ReferenceArea/)
- [Recharts ErrorBar API](https://recharts.github.io/en-US/api/ErrorBar/)
- [FastAPI OAuth2 JWT tutorial](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)
- [Auth.js PostgreSQL adapter](https://authjs.dev/getting-started/adapters/pg)
- [SciPy differential_evolution](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.differential_evolution.html)
- [GRT databases GitHub repo](https://github.com/zen/grt_databases)

### Partially verified (MEDIUM confidence)
- [GRT propellant database documentation](https://grtools.de/doku.php?id=en:doku:dbpropellant) -- page exists but content was sparse
- [GRT manual (Scribd)](https://www.scribd.com/document/866321500/grt-manual-2021-09-29-en) -- paywall prevented full access
- [GRT community discussions on 3-curve model](https://forum.accurateshooter.com/threads/gordons-reloading-tool-vs-quickload.4013760/)

### Internal references
- Existing codebase: `backend/app/core/grt_parser.py` -- GRT XML parser already implemented
- Existing codebase: `backend/app/core/grt_converter.py` -- GRT-to-internal conversion already implemented
- Existing codebase: `backend/app/core/solver.py` -- current 4-variable ODE system
- Existing codebase: `backend/app/core/thermodynamics.py` -- current form function
- Project docs: `docs/physics_core.md` -- form function and Vieille law documentation
- Project docs: `docs/grtools_analysis.md` -- GRT feature analysis with 3-curve model section

---

*Stack research: 2026-02-20*
