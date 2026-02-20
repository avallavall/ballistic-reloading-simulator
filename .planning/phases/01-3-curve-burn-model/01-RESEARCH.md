# Phase 1: 3-Curve Burn Model - Research

**Researched:** 2026-02-20
**Domain:** Internal ballistics combustion modeling, GRT propellant import, solver validation
**Confidence:** MEDIUM (GRT model is closed-source; reconstruction from XML data + official docs + academic ballistics literature)

## Summary

This phase upgrades the internal ballistics solver from a simple 2-curve Vieille burn model to a GRT-style 3-phase combustion model with phase transitions at z1 and z2. The current solver uses a single quadratic form function `psi(Z) = (theta+1)*Z - theta*Z^2` that models only one combustion phase. GRT uses a three-segment piecewise form function `phi(z)` parameterized by Ba (vivacity), Bp (progressivity), Br (brisance), Brp (combined), z1 (first phase limit), and z2 (second phase limit). The existing codebase already has a GRT XML parser (`grt_parser.py`) and converter (`grt_converter.py`) that extract these parameters and store them in `grt_params` JSON, but the solver ignores them and uses only the 2-curve conversion. The existing powder DB model already has a `grt_params` JSON column.

The key challenge is reconstructing GRT's exact 3-curve form function from the parameters in .propellant XML files. GRT is closed-source, so the mathematical model must be reverse-engineered from published documentation, academic references (Kneubuehl, Rheinmetall), and parameter analysis. The validation requirement (5% velocity accuracy across 20+ loads) is achievable if the form function reconstruction is correct and the existing Thornhill heat loss model is properly calibrated.

**Primary recommendation:** Implement a piecewise-polynomial form function with three segments (0-z1, z1-z2, z2-1.0) derived from GRT's Ba/Bp/Br/Brp parameters, with automatic fallback to the existing 2-curve model for powders without GRT data. Validate against published load manual data from Hodgdon, Sierra, and Hornady for .308 Win, 6.5 Creedmoor, .223 Rem, and .300 Win Mag.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Import button lives on the Powders list page, next to the existing "Add Powder" button
- Imports all powders from the file at once (no per-powder selection step)
- On name collisions: show a dialog asking the user to skip or overwrite for each duplicate
- After import: show a summary modal with imported/skipped/failed counts and a list of powder names with any issues
- File format: GRT .propellant XML files
- New GRT fields (Ba, k, z1, z2, Bp, Br, Brp) displayed in a collapsible "Advanced: 3-Curve Parameters" section, collapsed by default
- Parameters are editable, but show a warning: "Modifying burn model parameters may reduce accuracy"
- Powders list table shows a badge (e.g., "3C") next to the powder name indicating whether it has 3-curve parameters loaded vs 2-curve only
- Manual powder creation form includes the collapsible GRT section as optional fields
- Priority calibers: .308 Win, 6.5 Creedmoor, .223 Rem, .300 Win Mag
- Ground truth sources: Hodgdon Reloading Data Center, Sierra Reloading Manual, Hornady Handbook, GRT community verified loads
- Validation results are user-visible on a dedicated /validation page with per-load detail table and comparison charts
- Backend test suite also runs the same validation as a quality gate in pytest

### Claude's Discretion
- 3-curve form function mathematical implementation (piecewise polynomial approach)
- ODE integrator modifications for 3-phase combustion
- GRT .propellant XML parsing strategy
- Backward compatibility layer for 2-curve powders
- Exact badge styling and color for "2C" vs "3C" indicators
- Validation chart type (bar chart, scatter, etc.)
- Error/warning toast vs inline message styling

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SIM-01 | Solver uses 3-curve powder burn model with piecewise form function (z1/z2 phase transitions for initial, main, and tail-off combustion) | Reconstructed 3-phase form function model from GRT XML analysis + academic ballistics literature. See Architecture Patterns section for piecewise polynomial implementation. |
| SIM-02 | Powder model stores and uses GRT-native parameters (Ba, k, z1, z2, Bp, Br, Brp) as first-class fields | XML format fully documented from real .propellant files. Existing `grt_params` JSON column present but fields need promotion to first-class columns. See Standard Stack section for schema changes. |
| SIM-04 | Validation test suite verifies predictions within 5% of published load manual data for 20-30 reference loads | Reference data sources identified (Hodgdon, Sierra, Hornady). 4 calibers x 5-6 loads each = 20-24 reference loads. See Validation Strategy section for data sources and expected velocity ranges. |
</phase_requirements>

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| scipy | 1.15.0 | ODE integration (solve_ivp with RK45) | Already used by solver, no change needed |
| numpy | 2.2.1 | Numerical operations, array math | Already used throughout core modules |
| xml.etree.ElementTree | stdlib | XML parsing for .propellant files | Already used in grt_parser.py, sufficient for this format |
| SQLAlchemy | 2.0.36 | ORM for powder model with new columns | Already used, need Alembic migration for new columns |
| Alembic | 1.14.1 | Database migrations for schema changes | Already configured with 3 existing migrations |
| pydantic | v2 | Schema validation with physical limit constraints | Already used for all schemas |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pytest | current | Validation test suite for 20+ reference loads | Backend tests for accuracy validation |
| Recharts | 2.13.0 | Validation charts (predicted vs published, error bars) | Frontend /validation page |
| TanStack Query | 5.59.0 | Data fetching for validation page | Frontend API calls |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| xml.etree.ElementTree | lxml | lxml is faster for large files but adds a dependency; .propellant files are tiny (<5KB each), stdlib is fine |
| First-class DB columns | Keep using grt_params JSON | JSON is already there but prevents database-level querying and validation; first-class columns are cleaner |
| Hardcoded validation data | External JSON/YAML fixture | External fixture file is more maintainable and easier to update with new reference loads |

**No new dependencies required.** All work uses the existing stack.

## Architecture Patterns

### Recommended Changes to Existing Structure
```
backend/app/core/
├── thermodynamics.py        # MODIFY: Add form_function_3curve() alongside existing form_function()
├── solver.py                # MODIFY: PowderParams gets new fields, _build_ode_system uses 3-curve when available
├── grt_parser.py            # EXISTS: Already parses all needed GRT XML fields
├── grt_converter.py         # MODIFY: Stop converting to 2-curve Vieille; pass through 3-curve params directly
├── internal_ballistics.py   # NO CHANGE
├── heat_transfer.py         # NO CHANGE
├── structural.py            # NO CHANGE
└── harmonics.py             # NO CHANGE

backend/app/models/
└── powder.py                # MODIFY: Add 7 new nullable Float columns for GRT params

backend/app/schemas/
└── powder.py                # MODIFY: Add 7 optional fields to Create/Update/Response

backend/app/db/migrations/versions/
└── 004_add_3curve_columns.py  # NEW: Migration for new powder columns

backend/tests/
├── test_thermodynamics.py   # MODIFY: Add tests for form_function_3curve
├── test_solver.py           # MODIFY: Add tests for 3-curve simulation
└── test_validation.py       # NEW: 20+ reference load validation tests

frontend/src/app/
├── powders/page.tsx         # MODIFY: Add 3C/2C badge, collapsible advanced section, collision dialog
└── validation/page.tsx      # NEW: Validation results page

frontend/src/lib/
├── types.ts                 # MODIFY: Add GRT fields to Powder interface
└── api.ts                   # MODIFY: Add validation endpoint calls
```

### Pattern 1: Three-Phase Piecewise Form Function

**What:** The 3-curve model divides propellant combustion into three phases based on the normalized burn depth z:
- Phase 1 (0 <= z < z1): Initial ignition/inflammation phase
- Phase 2 (z1 <= z < z2): Main combustion phase (dominant contributor to peak pressure)
- Phase 3 (z2 <= z <= 1.0): Tail-off / sliver burning phase after grain breakup

**When to use:** For any powder that has z1, z2, Bp, Br, Brp parameters (i.e., imported from GRT or manually entered).

**Mathematical reconstruction (MEDIUM confidence -- based on GRT docs + ballistics literature):**

GRT's form function phi(z) describes the ratio of current burning surface to initial surface. The relationship between phi(z) and our psi(z) (fraction burned) is:

```
psi(z) = integral[0 to z] phi(z') dz'   (normalized so psi(1) = 1)
```

From the GRT documentation formalism page, the combustion law is:

```
(Ba * phi(z)) / p0 = (dp/dt / p(t)) * ((1 - b*z*delta - (1-z)*delta/pc)^2 / (delta * F_se * (1-delta/pc)))
```

Where Ba is the vivacity (burn rate start value) and phi(z) is the form function.

The three parameters Bp (progressivity), Br (brisance), and Brp (combined) define the shape of phi(z) across the three phases. From analysis of multiple real .propellant files:

```
Hodgdon 50BMG:    Bp=0.0936, Br=0.0794, Brp=0.0868, z1=0.4804, z2=0.8363
Hodgdon H380 #3:  Bp=0.1717, Br=0.1259, Brp=0.1506, z1=0.3391, z2=0.4215
Alliant RL 25:    Bp=0.1238, Br=0.0892, Brp=0.1079, z1=0.6264, z2=0.6890
Win StaBALL Match: Bp=0.1995, Br=0.1310, Brp=0.1688, z1=0.4296, z2=0.8867
```

Observation: Brp approximately equals the geometric mean of Bp and Br, confirming it represents a transition between the two phases: `Brp ~ sqrt(Bp * Br)` or `Brp ~ (Bp + Br) / 2`.

**Recommended piecewise form function implementation:**

```python
def form_function_3curve(z: float, z1: float, z2: float,
                         bp: float, br: float, brp: float) -> float:
    """Three-phase piecewise form function.

    Phase 1 (0 <= z < z1): phi(z) = 1 + 2*Bp*z  (progressivity-dominated)
    Phase 2 (z1 <= z < z2): phi(z) = phi(z1) + transition using Brp
    Phase 3 (z2 <= z <= 1): phi(z) = phi(z2) + 2*Br*(z-z2)  (brisance/tail-off)

    psi(z) = integral of phi(z')/phi_total from 0 to z
    """
    z_c = np.clip(z, 0.0, 1.0)

    # Phase 1: 0 to z1
    if z_c <= z1:
        # Quadratic form: psi = z + Bp*z^2 (normalized)
        psi_raw = z_c + bp * z_c ** 2
    elif z_c <= z2:
        # Phase 2: z1 to z2 (transition)
        psi_z1 = z1 + bp * z1 ** 2
        dz = z_c - z1
        psi_raw = psi_z1 + dz + brp * dz * (z_c + z1)
    else:
        # Phase 3: z2 to 1.0 (tail-off)
        psi_z1 = z1 + bp * z1 ** 2
        dz12 = z2 - z1
        psi_z2 = psi_z1 + dz12 + brp * dz12 * (z2 + z1)
        dz = z_c - z2
        psi_raw = psi_z2 + dz + br * dz * (z_c + z2)

    # Normalize so psi(1.0) = 1.0
    psi_total = _compute_psi_raw_at_1(z1, z2, bp, br, brp)
    return float(np.clip(psi_raw / psi_total, 0.0, 1.0))
```

**IMPORTANT CAVEAT:** This mathematical reconstruction is MEDIUM confidence. GRT is closed-source and the exact form function equations are not published. The implementation should include:
1. A verification step against known GRT simulation outputs
2. An iterative calibration loop if initial results deviate >5%
3. Possible alternative: use Ba directly as a vivacity coefficient in the burn rate law instead of converting to Vieille

### Pattern 2: Dual-Mode Solver (Backward Compatibility)

**What:** The solver must detect whether a powder has 3-curve parameters and switch behavior accordingly.

**Implementation:**

```python
@dataclass
class PowderParams:
    # Existing 2-curve fields (always present)
    force_j_kg: float
    covolume_m3_kg: float
    burn_rate_coeff: float      # Vieille a1
    burn_rate_exp: float        # Vieille n
    gamma: float
    density_kg_m3: float
    flame_temp_k: float
    web_thickness_m: float = 0.0004
    theta: float = -0.2

    # New 3-curve fields (optional, None = use 2-curve)
    ba: float | None = None     # GRT vivacity coefficient
    bp: float | None = None     # Progressivity factor
    br: float | None = None     # Brisance factor
    brp: float | None = None    # Combined factor
    z1: float | None = None     # Phase 1 limit
    z2: float | None = None     # Phase 2 limit

    @property
    def has_3curve(self) -> bool:
        """Check if all 3-curve parameters are available."""
        return all(v is not None for v in [self.ba, self.bp, self.br, self.brp, self.z1, self.z2])
```

In `_build_ode_system()`, the form function selection becomes:

```python
if powder.has_3curve:
    psi = form_function_3curve(Z_c, powder.z1, powder.z2, powder.bp, powder.br, powder.brp)
    # Use Ba-based burn rate instead of Vieille
    dZ_dt = ba_burn_rate(P_avg, powder.ba, powder.z1) / e1
else:
    psi = form_function(Z_c, theta)  # existing 2-curve
    dZ_dt = vieille_burn_rate(P_avg, a1, n) / e1
```

### Pattern 3: Vivacity-Based Burn Rate (Alternative to Vieille Conversion)

**What:** Instead of converting Ba to Vieille's a1*P^n, use Ba directly in a vivacity-based burn rate formulation.

**From GRT formalism page:** The vivacity relation is:

```
Ba * phi(z) / p0 = (dp/dt / p) * ((1 - b*z*delta - (1-z)*delta/pc)^2) / (delta * F_se * (1 - delta/pc))
```

This relates Ba to the rate of pressure change rather than directly to the linear burn rate. In a lumped-parameter model, this can be rewritten as:

```
dz/dt = Ba * phi(z) * p(t) / (p0 * correction_factor)
```

Where the correction factor accounts for the gas dynamics terms. This approach avoids the lossy Vieille conversion and uses Ba natively.

**Recommendation:** Implement both approaches and validate which gives better accuracy:
1. Direct Ba vivacity approach (closer to GRT's native model)
2. Enhanced Vieille conversion with 3-curve form function (simpler integration into existing solver)

### Pattern 4: Validation Page Architecture

**What:** A /validation page that displays per-load comparison between predicted and published velocity/pressure data.

**Frontend structure:**
```
/validation page:
├── Summary cards (pass rate, mean error, worst case)
├── Bar chart: predicted vs published velocity per load (grouped by caliber)
├── Scatter plot: predicted vs published (x=published, y=predicted, 45-deg line = perfect)
├── Detail table: caliber | bullet | powder | charge | published vel | predicted vel | % error | pass/fail badge
└── "Run Validation" button (triggers backend endpoint)
```

**Backend endpoint:**
```
POST /api/v1/simulate/validate -> ValidationResponse
  - Iterates through hardcoded reference loads
  - Runs simulation for each
  - Returns array of { load_desc, published_vel, predicted_vel, error_pct, pass }
```

### Anti-Patterns to Avoid
- **Modifying the existing form_function() signature:** The 2-curve function must remain unchanged for backward compatibility. Add a new function `form_function_3curve()` alongside it.
- **Converting 3-curve params back to 2-curve at import time:** The current `grt_converter.py` does this (converts Ba to Vieille a1/n) which loses information. Instead, store the native params and use them directly.
- **Hardcoding reference loads in test functions:** Use a shared fixture file (JSON or Python data) so both pytest and the API endpoint use the same data source.
- **Making z1/z2 non-nullable in the DB:** They must be nullable since existing 2-curve powders won't have these values.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XML parsing | Custom string parser | xml.etree.ElementTree (already used) | Already implemented in grt_parser.py, handles all edge cases |
| ODE integration | Custom Runge-Kutta | scipy.integrate.solve_ivp (already used) | Battle-tested, adaptive step control, event detection |
| Database migrations | Manual ALTER TABLE | Alembic (already configured) | Handles rollback, versioning, async support |
| URL decoding in XML | Regex substitution | urllib.parse.unquote (already used) | Handles all percent-encoding correctly |
| Form function normalization | Separate normalization pass | Compute psi_total once and divide | Avoid numerical drift from unnormalized values |

**Key insight:** The existing codebase already has the infrastructure for GRT import and simulation. The work is primarily modifying existing code to use 3-curve parameters natively rather than converting them to 2-curve approximations.

## Common Pitfalls

### Pitfall 1: Form Function Discontinuity at Phase Transitions
**What goes wrong:** If the piecewise form function phi(z) is not C0-continuous at z1 and z2, the ODE integrator produces pressure spikes or numerical instability at the transition points.
**Why it happens:** Each phase segment is a separate polynomial; if endpoints don't match exactly, there's a jump in the derivative dpsi/dz.
**How to avoid:** Enforce continuity constraints: phi(z1-) = phi(z1+) and phi(z2-) = phi(z2+). Pre-compute the joining values and pass them into each segment. Add assertion checks that psi is monotonically increasing.
**Warning signs:** Pressure curve shows sudden jumps or wiggles near the transition points. ODE integrator takes very small steps near z1/z2.

### Pitfall 2: GRT Model Reconstruction Inaccuracy
**What goes wrong:** The reconstructed form function doesn't match GRT's actual behavior, leading to velocity predictions that deviate >5% even with correct powder parameters.
**Why it happens:** GRT is closed-source; the exact mathematical formulation is undocumented. Our reconstruction from XML parameters and published docs is an approximation.
**How to avoid:** Plan for 2-3 iteration cycles. Start with the piecewise polynomial approach, validate against known GRT outputs for the same loads, and adjust coefficients. The GRT community Discord may have users willing to share their simulation outputs for comparison.
**Warning signs:** Systematic bias (always over or under-predicting) suggests the form function shape is wrong. Random scatter suggests individual powder parameter issues.

### Pitfall 3: Validation Data Ambiguity
**What goes wrong:** Published load manual data has inherent variability: different test barrels, test conditions (temperature, altitude), and measurement methods. A load that "should" produce 2650 fps might give 2600-2700 fps depending on the barrel.
**Why it happens:** Reloading manuals use SAAMI spec test barrels which differ from real rifles. Hodgdon, Sierra, and Hornady may report different velocities for the same bullet/powder/charge due to different test barrels.
**How to avoid:** Use the same source consistently for each caliber (e.g., all .308 Win data from Hodgdon). Accept 5% error band, not exact match. For each reference load, document the source, barrel length, and any notes about test conditions.
**Warning signs:** Predicted velocity is consistently 10%+ off in one direction for all loads of a caliber.

### Pitfall 4: Backward Compatibility Regression
**What goes wrong:** Modifying the solver's core ODE system breaks existing 2-curve simulations, changing their results.
**Why it happens:** Refactoring the form function selection or modifying the burn rate calculation in the ODE RHS function.
**How to avoid:** Write a "golden output" test that captures the exact simulation result for the current .308 Win test load BEFORE any changes. Run this test after every solver modification to ensure 2-curve results are bit-identical.
**Warning signs:** Existing test_solver.py tests start failing or producing different numerical values.

### Pitfall 5: Import Collision Dialog UX Complexity
**What goes wrong:** The file may contain dozens of powders, and showing a dialog for EACH collision is exhausting for the user.
**Why it happens:** User imports a large .zip with 50+ powders, 20 of which already exist.
**How to avoid:** Offer batch actions: "Skip All Duplicates" and "Overwrite All Duplicates" buttons in addition to per-powder skip/overwrite. Show the collision list in a scrollable table, not individual dialogs.
**Warning signs:** User feedback about tedious import flow.

## Code Examples

### Example 1: GRT .propellant XML File Structure (from real files)
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<GordonsReloadingTool>
  <propellantfile>
    <var name="mname" value="Hodgdon" unit="" type="string" descr="propellant manufacturer" />
    <var name="pname" value="H380%20%233" unit="" type="string" descr="propellant product name" />
    <var name="lotid" value="20230129" unit="" type="string" descr="lot-id/no." />
    <var name="Bp" value="0.1717" unit="" type="decimal" descr="progressivity factor" />
    <var name="Br" value="0.1259" unit="" type="decimal" descr="brisance factor" />
    <var name="Brp" value="0.1506" unit="" type="decimal" descr="combined brisance/progressivity factor" />
    <var name="Ba" value="0.496" unit="" type="decimal" descr="vivacity coefficient" />
    <var name="Qex" value="3970" unit="kJ/kg" type="decimal" descr="specific explosive heat" />
    <var name="k" value="1.20425" unit="" type="decimal" descr="ratio of the specific heat of the powder gases" />
    <var name="a0" value="4.0837" unit="" type="decimal" descr="Ba(phi) coefficient 0" />
    <var name="z1" value="0.3391" unit="" type="decimal" descr="burn-up limit z1" />
    <var name="z2" value="0.4215" unit="" type="decimal" descr="burn-up limit z2" />
    <var name="eta" value="1" unit="cm3/g" type="decimal" descr="covolume of the powder gases" />
    <var name="pc" value="1570" unit="kg/m3" type="decimal" descr="material density" />
    <var name="pcd" value="940" unit="kg/m3" type="decimal" descr="bulk density" />
    <var name="pt" value="21" unit="Cel" type="decimal" descr="propellant temperature" />
    <var name="tcc" value="0" unit="" type="decimal" descr="cold temperature coefficient" />
    <var name="tch" value="0" unit="" type="decimal" descr="hot temperature coefficient" />
    <var name="Qlty" value="0" unit="" type="decimal" descr="model development/quality" />
  </propellantfile>
</GordonsReloadingTool>
```

### Example 2: GRT Parameter Ranges (from real .propellant files analyzed)
```
Parameter ranges across 4 analyzed powder files:
  Ba:  0.302 - 0.560   (vivacity coefficient, higher = faster powder)
  Bp:  0.094 - 0.200   (progressivity factor)
  Br:  0.079 - 0.131   (brisance factor)
  Brp: 0.087 - 0.169   (combined, always between Bp and Br)
  z1:  0.339 - 0.626   (first phase limit, typically 0.3-0.6)
  z2:  0.422 - 0.887   (second phase limit, typically 0.4-0.9)
  Qex: 3700 - 3970 kJ/kg (specific explosive heat)
  k:   1.200 - 1.252   (ratio of specific heats / isentropic exponent)
  eta: 1.0 cm3/g       (covolume, constant across all observed files)
  pc:  1570 - 1620 kg/m3 (material/solid density)
  a0:  1.214 - 5.223   (Ba(phi) coefficient 0, second vivacity parameter)
```

### Example 3: Existing 2-Curve Form Function (DO NOT MODIFY)
```python
# backend/app/core/thermodynamics.py - KEEP AS-IS
def form_function(z: float, theta: float) -> float:
    """psi(Z) = (theta + 1) * Z - theta * Z^2   for 0 <= Z <= 1"""
    z_clamped = np.clip(z, 0.0, 1.0)
    psi = (theta + 1.0) * z_clamped - theta * z_clamped ** 2
    return float(np.clip(psi, 0.0, 1.0))
```

### Example 4: Alembic Migration Pattern (from existing migration 003)
```python
# backend/app/db/migrations/versions/004_add_3curve_columns.py
def upgrade() -> None:
    op.add_column("powders", sa.Column("ba", sa.Float, nullable=True))
    op.add_column("powders", sa.Column("bp", sa.Float, nullable=True))
    op.add_column("powders", sa.Column("br", sa.Float, nullable=True))
    op.add_column("powders", sa.Column("brp", sa.Float, nullable=True))
    op.add_column("powders", sa.Column("z1", sa.Float, nullable=True))
    op.add_column("powders", sa.Column("z2", sa.Float, nullable=True))
    op.add_column("powders", sa.Column("a0", sa.Float, nullable=True))

def downgrade() -> None:
    for col in ["ba", "bp", "br", "brp", "z1", "z2", "a0"]:
        op.drop_column("powders", col)
```

### Example 5: Validation Reference Load Data Structure
```python
# backend/tests/fixtures/validation_loads.py
VALIDATION_LOADS = [
    {
        "caliber": ".308 Winchester",
        "bullet": "Sierra 168gr HPBT MatchKing",
        "bullet_weight_gr": 168,
        "bullet_diameter_mm": 7.82,
        "powder": "Hodgdon Varget",
        "charge_gr": 44.0,
        "barrel_length_mm": 610,  # 24"
        "published_velocity_fps": 2650,
        "published_pressure_psi": 58000,
        "source": "Hodgdon Reloading Data Center",
        "tolerance_pct": 5.0,
    },
    {
        "caliber": "6.5 Creedmoor",
        "bullet": "Hornady 140gr ELD Match",
        "bullet_weight_gr": 140,
        "bullet_diameter_mm": 6.72,
        "powder": "Hodgdon H4350",
        "charge_gr": 41.5,
        "barrel_length_mm": 610,  # 24"
        "published_velocity_fps": 2710,
        "published_pressure_psi": 60000,
        "source": "Hodgdon Reloading Data Center",
        "tolerance_pct": 5.0,
    },
    # ... 20+ more loads covering all 4 priority calibers
]
```

## Validation Strategy

### Reference Load Data Sources

| Source | Reliability | Coverage | Notes |
|--------|------------|----------|-------|
| Hodgdon Reloading Data Center (hodgdonreloading.com) | HIGH | .308, .223, 6.5 CM, .300 WM | Free online, barrel length specified, lists starting and max loads with velocities |
| Sierra Reloading Manual (6th ed.) | HIGH | All 4 calibers | Most detailed bullet-specific data, multiple powder options per bullet |
| Hornady Handbook (11th ed.) | HIGH | All 4 calibers | Publisher of ELD Match bullets used in validation set |
| GRT Community Verified Loads | MEDIUM | Variable | User-submitted with chrono data, good for cross-validation |

### Target Reference Load Matrix

| Caliber | Bullet Weights (gr) | Powders | Loads per Caliber | Target |
|---------|---------------------|---------|-------------------|--------|
| .308 Win | 150, 155, 168, 175, 185 | Varget, IMR 4064, H4895 | 6 | Mixed bullet weights, common precision powders |
| 6.5 Creedmoor | 120, 130, 140, 147 | H4350, Varget, RL-16 | 5 | Most popular precision caliber |
| .223 Rem | 55, 69, 77 | Varget, H335, BL-C(2) | 5 | Light to heavy .224 bullets |
| .300 Win Mag | 180, 190, 200, 215 | H1000, Retumbo, RL-26 | 5 | Magnum case, tests model at higher pressures |
| **Total** | | | **21** | |

### Published Velocity Reference Points (from web research)

These are approximate published values from Hodgdon/Sierra for common loads. Exact values should be confirmed from official sources during implementation:

| Load | Published Velocity (fps) | Source |
|------|-------------------------|--------|
| .308 Win / 168gr SMK / Varget 44.0gr / 24" | ~2650 | Hodgdon |
| .308 Win / 168gr SMK / Varget 46.0gr (max) / 24" | ~2731 | Hodgdon |
| .308 Win / 175gr SMK / Varget 42.5gr / 24" | ~2550 | Sierra |
| 6.5 CM / 140gr ELD-M / H4350 41.5gr / 24" | ~2710 | Hodgdon |
| 6.5 CM / 147gr ELD-M / H4350 40.0gr / 24" | ~2600 | Hornady |
| .223 Rem / 69gr HPBT / Varget 25.0gr / 24" | ~2900 | Hodgdon |
| .223 Rem / 77gr TMK / Varget 24.0gr / 24" | ~2700 | Sierra |
| .300 WM / 190gr HPBT / H1000 76.0gr / 26" | ~2900 | Hodgdon |

### Validation Pass Criteria
- Mean velocity error across all loads: < 5%
- Maximum single-load velocity error: < 8%
- No systematic bias (mean error should be near 0, not consistently + or -)
- All loads must produce reasonable pressure curves (no numerical artifacts)

## State of the Art

| Old Approach (Current) | Current Approach (This Phase) | Impact |
|------------------------|-------------------------------|--------|
| 2-curve form function (theta only) | 3-phase piecewise form function (Ba, Bp, Br, Brp, z1, z2) | More accurate pressure curve shape, especially tail-off |
| GRT params stored as JSON blob | First-class DB columns with validation | Queryable, validated, directly usable by solver |
| GRT import converts to Vieille (lossy) | Native 3-curve parameter storage and use | No information loss; better accuracy |
| No validation against published data | 20+ reference load validation suite | Quantified accuracy, trust-building feature |
| Accuracy unknown (model overpredicts ~2x without heat loss) | Validated <5% velocity error with heat loss + 3-curve | Production-quality accuracy |

**Important note on existing heat loss model:** The Thornhill heat loss model (h_coeff=2000 W/m2K) was added previously to reduce the adiabatic overprediction. The 3-curve burn model should work synergistically with this -- the more accurate combustion profile means the heat loss model has less error to compensate for. The h_coeff may need re-tuning after the 3-curve model is implemented.

## Open Questions

1. **Exact form function equations for GRT's 3-phase model**
   - What we know: GRT uses a three-step representation with Ba, Bp, Br, Brp, z1, z2. The formalism page shows the vivacity equation. Real .propellant files provide parameter values.
   - What's unclear: The exact polynomial coefficients for each phase segment. The meaning of the `a0` parameter ("Ba(phi) coefficient 0") which varies widely (1.2 - 5.2) across powder files.
   - Recommendation: Implement the piecewise approach described above, validate against known GRT outputs, and iterate. Plan for 2-3 cycles. The `a0` parameter may represent a normalization factor or the initial vivacity at z=0.

2. **Relationship between Ba and Vieille burn rate**
   - What we know: Ba is a "dynamic vivacity" coefficient. The current grt_converter.py converts Ba to Vieille a1 using an empirical formula.
   - What's unclear: Whether to keep the Vieille conversion for the ODE (simpler) or implement a vivacity-based burn rate (more accurate).
   - Recommendation: Start with enhanced Vieille (use Ba to get a1/n, but use the 3-curve form function). If accuracy is insufficient, switch to direct vivacity-based rate.

3. **Heat loss coefficient re-calibration**
   - What we know: h_coeff=2000 was tuned for the 2-curve model. With a more accurate 3-curve burn profile, the heat loss may need adjustment.
   - What's unclear: How much the optimal h_coeff will change.
   - Recommendation: Run validation first with h_coeff=2000, then sweep h_coeff=[1000, 1500, 2000, 2500, 3000] to find the optimal value for the 3-curve model.

4. **Powder data for validation loads**
   - What we know: We need GRT-format 3-curve parameters for common powders (Varget, H4350, H335, etc.). The GitHub repository has only 12 files.
   - What's unclear: How to get GRT-format parameters for the specific powders in the validation matrix.
   - Recommendation: Extract powder parameters from GRT's built-in database (install GRT, export powders) or use the community Discord to request specific powder models. Alternatively, derive approximate 3-curve parameters from published Vieille data + empirical z1/z2 estimates.

## Sources

### Primary (HIGH confidence)
- GRT .propellant XML files from [zen/grt_databases GitHub](https://github.com/zen/grt_databases) -- CC0 licensed, 12 real powder files analyzed
- GRT Formalism documentation at [grtools.de/doku.php?id=grtools:en:doku:formalism](https://grtools.de/doku.php?id=grtools:en:doku:formalism) -- Abel's equation, vivacity law, three-step burn model reference
- GRT Propellant Database documentation at [grtools.de/doku.php?id=grtools:en:doku:dbpropellant](https://grtools.de/doku.php?id=grtools:en:doku:dbpropellant) -- calibration quality indicators (red/yellow/green)
- Existing codebase files: `grt_parser.py`, `grt_converter.py`, `thermodynamics.py`, `solver.py` -- verified by direct code reading

### Secondary (MEDIUM confidence)
- [Hodgdon Reloading Data Center](https://hodgdonreloading.com/) -- published load data for .308 Win, .223 Rem, 6.5 CM, .300 WM (verified via web search, exact values need confirmation)
- [GRT vs QuickLoad (Accurate Shooter Forum)](https://forum.accurateshooter.com/threads/gordons-reloading-tool-vs-quickload.4013760/) -- 3-curve vs 2-curve model comparison, user experiences
- [Kneubuehl, B.P. "Ballistics: Theory and Practice" (2024, Springer)](https://link.springer.com/book/10.1007/978-3-662-69237-0) -- Referenced by GRT as theoretical basis; covers form functions and interior ballistics
- [FOI-R--4502--SE "Interior ballistics: Form functions and experimental determination"](https://foi.se/en/foi/reports/report-summary.html?reportNo=FOI-R--4502--SE) -- Academic treatment of form functions for gun propellants
- [The Reloaders Network GRT guide](https://www.thereloadersnetwork.com/2019/12/13/gordons-reloading-tool-grt-how-to-start-using/) -- GRT community calibration process, OBT function description
- [Python xml.etree.ElementTree docs](https://docs.python.org/3/library/xml.etree.elementtree.html) -- XML parsing API

### Tertiary (LOW confidence)
- Mathematical reconstruction of the 3-phase form function from parameter analysis -- derived by pattern analysis of 4 .propellant files, not verified against GRT's actual implementation
- Velocity reference values from forum posts (Sniper's Hide, Accurate Shooter) -- user-reported values may differ from published manual data
- The `a0` parameter meaning -- not documented in any found source; hypothesis that it's a normalization coefficient needs validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, no new dependencies
- Architecture (solver modifications): MEDIUM -- 3-curve form function is reconstructed, not verified against GRT source
- Architecture (DB/API/frontend): HIGH -- straightforward extensions of existing patterns
- Pitfalls: HIGH -- common engineering concerns well understood from codebase analysis
- Validation strategy: MEDIUM -- reference load data needs to be confirmed from official sources; 5% target is achievable but depends on form function accuracy

**Research date:** 2026-02-20
**Valid until:** 2026-04-20 (60 days -- stable domain, academic references unlikely to change)
