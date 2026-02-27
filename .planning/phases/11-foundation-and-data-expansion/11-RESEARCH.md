# Phase 11: Foundation and Data Expansion - Research

**Researched:** 2026-02-27
**Domain:** Schema extensions, geometry engine, bullet seed data expansion, npm dependencies
**Confidence:** HIGH

## Summary

Phase 11 is a foundation phase that delivers four capabilities consumed by Phases 12-14: (1) schema extensions adding 5 optional cartridge fields and 4 optional bullet fields plus velocity-banded BC fields for Sierra, (2) a shared geometry engine producing both SVG path data and Three.js Vector2 arrays from component dimensions, (3) expansion of the bullet seed database from 127 to 500+ covering 7 manufacturers, and (4) installation of React Three Fiber v8 / drei v9 / Three.js npm dependencies.

The existing codebase already has a mature pattern for schema extensions (Alembic migrations, Pydantic schemas with optional nullable fields, quality scoring, seed fixtures as JSON). The primary technical challenge is the geometry engine design -- a pure TypeScript library that must produce both SVG `d` path strings and Three.js `Vector2[]` profile arrays from the same dimension data, with graceful fallbacks when optional fields are null. The bullet data expansion is labor-intensive but mechanically straightforward, requiring careful sourcing from manufacturer public specifications.

**Primary recommendation:** Use String columns (not PostgreSQL native ENUM) for `case_type` and `ogive_type` to avoid Alembic ENUM migration complexity. Build the geometry engine as two pure functions (`generateCartridgeProfile` and `generateBulletProfile`) that return a `GeometryResult` containing both SVG path data and Vector2 coordinate arrays. Organize bullet seed data as 7 manufacturer JSON files that replace the existing single `bullets.json`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Prioritize match bullets first: Sierra MatchKing, Berger Hybrid/Target, Hornady ELD-M, Lapua Scenar
- Then expand to broader coverage (hunting, varmint) from Barnes, Speer, Nosler
- Leave BC G7 null when manufacturer doesn't publish it -- do NOT estimate from G1
- Store all 3 velocity-banded G1 BCs for Sierra bullets (bc_g1_high, bc_g1_mid, bc_g1_low fields)
- Store velocity threshold values alongside BCs (bc_g1_high_vel, bc_g1_mid_vel) so users know which band applies at what speed
- Estimate bullet length_mm from weight + caliber when not published, mark estimated fields with data_source flag
- Include popular discontinued bullets (Sierra 168gr HPBT #2200, etc.) since reloaders still have stockpiles
- Full estimated silhouette for visual appeal, but dimension labels only on known values
- Estimated geometry shown slightly transparent or dashed to signal uncertainty
- Type-aware ogive profiles: different curves per bullet_type (tangent for "match", secant for "vld", flat-nose for "hunting", etc.)
- Single shared geometry engine (cartridge-geometry.ts) outputting both SVG path data and Three.js Vector2 arrays -- guarantees 2D and 3D match exactly
- No powder charge visualization in geometry engine -- keep it pure component geometry
- Backfill all 53 existing cartridges with estimated values for new fields (shoulder_angle, neck_length, body_length, rim_thickness, case_type) from CIP/SAAMI reference data
- case_type enum: rimless, belted, rimmed, rebated, semi_rimmed, straight_wall (6 values)
- ogive_type enum: tangent, secant, hybrid, flat_nose, round_nose, spitzer (6 values)
- New dimension fields boost quality_score when filled -- incentivizes data completeness
- JSON files organized by manufacturer: sierra.json, hornady.json, berger.json, nosler.json, lapua.json, barnes.json, speer.json
- Replace existing 127 bullets with new comprehensive seed data (overwrites, ensures consistency)
- Startup seed pattern (same as current) -- check threshold, import if needed

### Claude's Discretion
- Velocity band range design for BC fields (Sierra's own ranges vs standardized)
- Data source labeling strategy (tiered by field confidence: 'manufacturer' for published, 'estimated' for derived)
- Seed version tracking approach (version string vs hash-based)
- Exact estimation formulas for shoulder_angle, neck_length, body_length from existing cartridge dimensions
- Bullet length estimation formula from weight + caliber + typical density

### Deferred Ideas (OUT OF SCOPE)
- Weekly cron job to fetch/update bullet data from external sources -- future phase (requires scheduled task infrastructure, data source API design)
- CSV column mapping UI for flexible file format support -- deferred to v1.4
- Applied Ballistics Doppler-verified G7 BCs -- proprietary, cannot use without license
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCHM-01 | Cartridge model extended with 5 optional drawing fields (shoulder_angle_deg, neck_length_mm, body_length_mm, rim_thickness_mm, case_type) | Alembic migration pattern (ADD COLUMN nullable), String column for case_type enum, Pydantic schema extension, quality scoring update |
| SCHM-02 | Bullet model extended with 4 optional rendering fields (bearing_surface_mm, boat_tail_length_mm, meplat_diameter_mm, ogive_type) + 5 velocity-banded BC fields | Same Alembic pattern, String column for ogive_type, Sierra velocity-banded BC schema (3 BCs + 2 thresholds) |
| SCHM-03 | Geometry engine estimates missing dimensions from existing data with documented heuristics | Pure TypeScript geometry engine with fallback estimation formulas, two output formats (SVG path + Vector2[]) |
| DATA-01 | User can browse 500+ bullets covering Sierra, Hornady, Berger, Nosler, Lapua, Barnes, and Speer | 7 manufacturer JSON seed files, updated seed loader with threshold-based import, quality score computation |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SQLAlchemy | 2.0.36 | ORM + async PostgreSQL | Already in project, mature migration path |
| Alembic | 1.14.1 | Database migrations | Already configured async, 8 migrations exist |
| Pydantic | v2 | Schema validation + serialization | Already in project, `from_attributes` pattern |
| Three.js | ^0.170.0 | 3D rendering (Vector2 for geometry engine) | Required by R3F; pin to 0.170.x for stability |
| @react-three/fiber | ^8.18.0 | React renderer for Three.js | v8 = React 18 compatible (project uses React 18.3.1) |
| @react-three/drei | ^9.122.0 | R3F helpers (OrbitControls, etc.) | v9 peers: `@react-three/fiber ^8`, `react ^18` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/three | ^0.170.0 | TypeScript types for Three.js | Type-safe Vector2 usage in geometry engine |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| String columns for enums | PostgreSQL native ENUM type | Native ENUM is more efficient but Alembic cannot auto-detect ENUM changes; adding/removing values requires manual ALTER TYPE statements. String columns are simpler to migrate. |
| Hand-rolled SVG path builder | svg-path-commander library | External library adds a dependency for something that is straightforward string concatenation of M/L/C/A/Z commands. Not worth the dependency. |
| Separate 2D/3D geometry files | Single shared geometry engine | User locked decision: single file guarantees 2D and 3D profiles match exactly |

**Installation:**
```bash
cd frontend && npm install three @react-three/fiber @react-three/drei @types/three
```

Note: `@react-three/fiber@8.18.0` requires `react >=18 <19` and `three >=0.133`. Our project has React 18.3.1, which is compatible. Pin Three.js to `^0.170.0` (not latest 0.183.x) for stability with R3F v8/drei v9.

## Architecture Patterns

### Recommended Project Structure
```
backend/
├── app/
│   ├── models/
│   │   ├── bullet.py          # +9 new columns (4 rendering + 5 velocity-banded BC)
│   │   └── cartridge.py       # +5 new columns
│   ├── schemas/
│   │   ├── bullet.py          # +9 fields in Create/Update/Response
│   │   └── cartridge.py       # +5 fields in Create/Update/Response
│   ├── core/
│   │   └── quality.py         # Updated BULLET_BONUS_FIELDS, CARTRIDGE_BONUS_FIELDS
│   ├── seed/
│   │   ├── initial_data.py    # Updated loader: manufacturer-file-based, threshold logic
│   │   └── fixtures/
│   │       ├── bullets/       # NEW: 7 manufacturer JSON files
│   │       │   ├── sierra.json
│   │       │   ├── hornady.json
│   │       │   ├── berger.json
│   │       │   ├── nosler.json
│   │       │   ├── lapua.json
│   │       │   ├── barnes.json
│   │       │   └── speer.json
│   │       ├── cartridges.json  # Updated with 5 new fields backfilled
│   │       └── bullets.json     # REMOVED (replaced by manufacturer files)
│   └── db/migrations/versions/
│       └── 009_schema_extensions.py  # New Alembic migration
frontend/
├── src/
│   └── lib/
│       ├── geometry/
│       │   ├── cartridge-geometry.ts  # Cartridge profile generator
│       │   ├── bullet-geometry.ts     # Bullet profile generator
│       │   ├── types.ts               # GeometryResult, ProfilePoint interfaces
│       │   └── estimation.ts          # Heuristic estimation functions
│       └── types.ts                   # Updated Bullet/Cartridge interfaces
```

### Pattern 1: Nullable Optional Schema Fields
**What:** Add new optional fields as nullable columns with no default, preserving backward compatibility.
**When to use:** Every new dimension field in this phase.
**Example:**
```python
# Model (SQLAlchemy)
class Cartridge(UUIDMixin, Base):
    # ... existing fields ...
    shoulder_angle_deg = Column(Float, nullable=True)
    neck_length_mm = Column(Float, nullable=True)
    body_length_mm = Column(Float, nullable=True)
    rim_thickness_mm = Column(Float, nullable=True)
    case_type = Column(String(20), nullable=True)  # NOT native ENUM

# Schema (Pydantic)
class CartridgeCreate(BaseModel):
    # ... existing fields ...
    shoulder_angle_deg: float | None = Field(None, gt=0, le=90, description="Shoulder angle (degrees)")
    neck_length_mm: float | None = Field(None, gt=0, le=50, description="Neck length (mm)")
    body_length_mm: float | None = Field(None, gt=0, le=100, description="Body length (mm)")
    rim_thickness_mm: float | None = Field(None, gt=0, le=5, description="Rim thickness (mm)")
    case_type: str | None = Field(None, max_length=20, description="Case type: rimless, belted, rimmed, rebated, semi_rimmed, straight_wall")

# Migration (Alembic)
def upgrade() -> None:
    op.add_column('cartridges', sa.Column('shoulder_angle_deg', sa.Float(), nullable=True))
    op.add_column('cartridges', sa.Column('neck_length_mm', sa.Float(), nullable=True))
    op.add_column('cartridges', sa.Column('body_length_mm', sa.Float(), nullable=True))
    op.add_column('cartridges', sa.Column('rim_thickness_mm', sa.Float(), nullable=True))
    op.add_column('cartridges', sa.Column('case_type', sa.String(20), nullable=True))
```

### Pattern 2: Sierra Velocity-Banded BC Fields
**What:** Store Sierra's 3-range velocity-banded G1 BCs plus their velocity thresholds.
**When to use:** Only for Sierra bullets; other manufacturers use single BC values.
**Example:**
```python
# Sierra publishes BCs like:
# .505 @ 2800+ fps, .496 @ 1800-2800 fps, .485 @ <1800 fps
# We store:
class Bullet(UUIDMixin, Base):
    bc_g1_high = Column(Float, nullable=True)      # BC at high velocity
    bc_g1_mid = Column(Float, nullable=True)        # BC at mid velocity
    bc_g1_low = Column(Float, nullable=True)        # BC at low velocity
    bc_g1_high_vel = Column(Float, nullable=True)   # Threshold: above this = high BC (e.g. 2800)
    bc_g1_mid_vel = Column(Float, nullable=True)    # Threshold: above this = mid BC (e.g. 1800)
```

Sierra's own velocity ranges vary per bullet (some use 2800/1800, others 2500/1600). Store the manufacturer's actual ranges rather than standardizing.

### Pattern 3: Geometry Engine Dual Output
**What:** A pure function that produces both SVG path data and Three.js-compatible Vector2 arrays from the same dimension inputs.
**When to use:** The geometry engine used by both Phase 12 (2D SVG) and Phase 13 (3D viewer).
**Example:**
```typescript
// frontend/src/lib/geometry/types.ts
export interface ProfilePoint {
  x: number;  // mm, axial position
  y: number;  // mm, radial position (half-diameter)
}

export interface GeometryResult {
  svgPath: string;           // SVG 'd' attribute string (M/L/C/A/Z commands)
  profilePoints: ProfilePoint[];  // Ordered points for Three.js LatheGeometry
  estimatedFields: string[]; // Which fields were estimated (for transparency rendering)
  dataCompleteness: 'full' | 'basic' | 'insufficient';
}

// frontend/src/lib/geometry/cartridge-geometry.ts
export function generateCartridgeProfile(cartridge: CartridgeDimensions): GeometryResult {
  const estimated: string[] = [];

  // Use actual values when available, estimate when null
  const shoulderAngle = cartridge.shoulder_angle_deg
    ?? estimateShoulderAngle(cartridge);  // fallback
  if (!cartridge.shoulder_angle_deg) estimated.push('shoulder_angle_deg');

  // Build profile points (centerline-outward cross-section)
  const points: ProfilePoint[] = [];
  // ... rim -> base -> body -> shoulder -> neck sequence
  // Each segment is a series of (x,y) coordinates

  // Convert points to SVG path
  const svgPath = pointsToSvgPath(points);

  return {
    svgPath,
    profilePoints: points,
    estimatedFields: estimated,
    dataCompleteness: classifyCompleteness(estimated.length, totalFields),
  };
}
```

### Pattern 4: Manufacturer-Based Seed File Organization
**What:** Split bullet seed data into 7 manufacturer JSON files loaded sequentially.
**When to use:** The updated seed loader for 500+ bullets.
**Example:**
```python
# backend/app/seed/initial_data.py
BULLET_MANUFACTURERS = [
    "sierra", "hornady", "berger", "nosler", "lapua", "barnes", "speer"
]

async def seed_bullets(db: AsyncSession):
    """Load bullets from per-manufacturer fixture files."""
    all_bullets = []
    for mfg in BULLET_MANUFACTURERS:
        mfg_data = _load_fixture(f"bullets/{mfg}.json")
        all_bullets.extend(mfg_data)
    logger.info("Loaded %d bullets from %d manufacturer files", len(all_bullets), len(BULLET_MANUFACTURERS))
    # ... create Bullet objects with quality scoring
```

### Anti-Patterns to Avoid
- **PostgreSQL native ENUM for case_type/ogive_type:** Alembic cannot auto-detect ENUM changes. Adding or removing values requires manual `ALTER TYPE ... ADD VALUE` statements that cannot run inside a transaction. Use `String(20)` columns with Pydantic validation instead.
- **Estimating G7 BC from G1 BC:** The relationship between G1 and G7 depends on bullet shape in a complex, non-linear way. The user has explicitly forbidden this. Leave G7 null when the manufacturer does not publish it.
- **Single monolithic bullets.json for 500+ entries:** A 7000+ line JSON file is hard to review and maintain. Split by manufacturer for clear provenance tracking.
- **Framework-dependent geometry engine:** The geometry engine must be pure TypeScript with zero React/Three.js imports. It produces data structures (points, strings) that consumers convert as needed. The only Three.js type used is `Vector2` which can be constructed from the `ProfilePoint` arrays by the consumer.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 3D profile from 2D points | Custom mesh builder | Three.js `LatheGeometry` + `Vector2[]` | LatheGeometry handles revolution, normals, UVs automatically from profile points |
| Ogive curve (tangent/secant) | Piecewise linear approximation | Quadratic/cubic Bezier curves in SVG, `QuadraticBezierCurve` in Three.js | Bezier curves match ogive shapes accurately; linear segments look faceted |
| Quality score recomputation | Manual score assignment | Existing `compute_bullet_quality_score()` / `compute_cartridge_quality_score()` | Already handles weighted completeness + source tier; extend BONUS_FIELDS list |
| Alembic migration IDs | Manual string IDs | Sequential numbered scheme `009_description` | Project convention from existing 8 migrations |

**Key insight:** The geometry engine is fundamentally a coordinate generator -- it converts dimension values into (x,y) point sequences. The SVG path is just string formatting of those points (M/L/C/Z commands), and the Three.js profile is just the raw point array. Building one function that produces points, then two thin formatters, is far simpler than maintaining two separate geometry implementations.

## Common Pitfalls

### Pitfall 1: Seed Data Import Threshold Race Condition
**What goes wrong:** The current seed loader checks `SELECT powder LIMIT 1` -- if powders exist but bullets were cleared, bullets won't reseed.
**Why it happens:** The threshold check uses a single table (powders) as a proxy for "data exists." When replacing 127 bullets with 500+, the old check won't trigger.
**How to avoid:** Change the seed threshold to check bullet count specifically: if bullet count < 400, reseed bullets. Keep powder and cartridge checks separate.
**Warning signs:** After a DB wipe of only the bullets table, seeding doesn't run on next startup.

### Pitfall 2: Alembic Migration Column Order vs Create_All
**What goes wrong:** `create_all()` (dev fallback) creates columns in model definition order, but Alembic's `add_column` appends to the end of the table. Column order mismatch between environments.
**Why it happens:** PostgreSQL doesn't support column reordering after creation.
**How to avoid:** Don't rely on column order. The project already uses ORM column names, not positional access. This is a non-issue but worth documenting.
**Warning signs:** None -- only visible in `\d tablename` output.

### Pitfall 3: Quality Score Not Updated After Schema Extension
**What goes wrong:** New optional fields (bearing_surface_mm, boat_tail_length_mm, etc.) exist in DB but quality scoring ignores them, so filling these fields doesn't improve the quality badge.
**Why it happens:** `BULLET_BONUS_FIELDS` and `CARTRIDGE_BONUS_FIELDS` lists in `quality.py` need explicit updating.
**How to avoid:** Add ALL new optional fields to the corresponding BONUS_FIELDS list. Update quality computation to count the new fields.
**Warning signs:** Quality score doesn't change when editing a bullet to add bearing_surface_mm.

### Pitfall 4: Three.js Version Compatibility
**What goes wrong:** Installing latest Three.js (0.183.x) may have breaking API changes with R3F v8 / drei v9.
**Why it happens:** R3F v8 peer dependency says `three >=0.133` but internal code may use deprecated APIs.
**How to avoid:** Pin Three.js to `^0.170.0` which is well-tested with R3F v8. This phase only needs `Vector2` from Three.js (for the geometry engine type), which has been stable since version 0.100+.
**Warning signs:** TypeScript errors on Three.js imports, runtime "X is not a constructor" errors.

### Pitfall 5: Seed Data Overwrites User Edits
**What goes wrong:** The seed loader replaces all bullets on startup, deleting user-created bullets.
**Why it happens:** The user decision says "Replace existing 127 bullets with new comprehensive seed data."
**How to avoid:** Only replace on first load or when bullet count matches the old seed count (127). If count > 500, assume the new seed has already been loaded. If count is between 128 and 499, user has added custom bullets -- don't overwrite. Track seed version with a metadata field or separate table.
**Warning signs:** User-created bullets disappear after container restart.

### Pitfall 6: Geometry Engine Null Field Cascade
**What goes wrong:** When multiple optional fields are null, the fallback estimation for one field depends on another estimated field, creating cascading inaccuracy.
**Why it happens:** For example, estimating body_length from case_length and neck_length, when neck_length is itself estimated.
**How to avoid:** Document the estimation dependency chain. Use independent estimation formulas where possible (e.g., estimate neck_length from bore_diameter rather than from body_length). Flag multi-level estimates with lower confidence.
**Warning signs:** Geometry looks wrong for cartridges with only base dimensions filled.

## Code Examples

### Alembic Migration for Schema Extensions
```python
"""Add drawing dimension fields to cartridges and bullets

Revision ID: 009_schema_extensions
Revises: 008_fix_caliber_backfill
Create Date: 2026-02-27
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "009_schema_extensions"
down_revision: Union[str, None] = "008_fix_caliber_backfill"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Cartridge drawing fields
    op.add_column('cartridges', sa.Column('shoulder_angle_deg', sa.Float(), nullable=True))
    op.add_column('cartridges', sa.Column('neck_length_mm', sa.Float(), nullable=True))
    op.add_column('cartridges', sa.Column('body_length_mm', sa.Float(), nullable=True))
    op.add_column('cartridges', sa.Column('rim_thickness_mm', sa.Float(), nullable=True))
    op.add_column('cartridges', sa.Column('case_type', sa.String(20), nullable=True))

    # Bullet rendering fields
    op.add_column('bullets', sa.Column('bearing_surface_mm', sa.Float(), nullable=True))
    op.add_column('bullets', sa.Column('boat_tail_length_mm', sa.Float(), nullable=True))
    op.add_column('bullets', sa.Column('meplat_diameter_mm', sa.Float(), nullable=True))
    op.add_column('bullets', sa.Column('ogive_type', sa.String(20), nullable=True))

    # Sierra velocity-banded BC fields
    op.add_column('bullets', sa.Column('bc_g1_high', sa.Float(), nullable=True))
    op.add_column('bullets', sa.Column('bc_g1_mid', sa.Float(), nullable=True))
    op.add_column('bullets', sa.Column('bc_g1_low', sa.Float(), nullable=True))
    op.add_column('bullets', sa.Column('bc_g1_high_vel', sa.Float(), nullable=True))
    op.add_column('bullets', sa.Column('bc_g1_mid_vel', sa.Float(), nullable=True))

def downgrade() -> None:
    # Bullet velocity-banded BC fields
    op.drop_column('bullets', 'bc_g1_mid_vel')
    op.drop_column('bullets', 'bc_g1_high_vel')
    op.drop_column('bullets', 'bc_g1_low')
    op.drop_column('bullets', 'bc_g1_mid')
    op.drop_column('bullets', 'bc_g1_high')

    # Bullet rendering fields
    op.drop_column('bullets', 'ogive_type')
    op.drop_column('bullets', 'meplat_diameter_mm')
    op.drop_column('bullets', 'boat_tail_length_mm')
    op.drop_column('bullets', 'bearing_surface_mm')

    # Cartridge drawing fields
    op.drop_column('cartridges', 'case_type')
    op.drop_column('cartridges', 'rim_thickness_mm')
    op.drop_column('cartridges', 'body_length_mm')
    op.drop_column('cartridges', 'neck_length_mm')
    op.drop_column('cartridges', 'shoulder_angle_deg')
```

### Bullet Length Estimation Formula
```python
# Estimate bullet length from weight, diameter, and material density
# Assumes cylindrical approximation with correction factor for ogive shape
def estimate_bullet_length_mm(weight_grains: float, diameter_mm: float, material: str = "copper") -> float:
    """Estimate bullet length from weight and diameter.

    Uses cylindrical volume formula with shape correction factor.
    Lead core with copper jacket: density ~10.5 g/cm3 average
    Solid copper: density ~8.96 g/cm3
    """
    weight_grams = weight_grains * 0.06479891  # grains to grams

    # Average bullet density (lead core + copper jacket)
    density_g_cm3 = {
        "copper": 10.5,       # typical jacketed lead core
        "solid_copper": 8.96, # monolithic copper (Barnes TSX)
        "lead": 11.34,        # pure lead
    }.get(material, 10.5)

    radius_cm = (diameter_mm / 2) / 10  # mm to cm
    volume_cm3 = weight_grams / density_g_cm3
    # Cylinder length = volume / (pi * r^2)
    cylinder_length_cm = volume_cm3 / (3.14159 * radius_cm ** 2)

    # Shape correction: bullets are ~15-25% longer than a pure cylinder
    # due to ogive nose and boat tail. Use 1.2 as average correction.
    shape_factor = 1.20

    length_mm = cylinder_length_cm * 10 * shape_factor
    return round(length_mm, 1)
```

### Cartridge Dimension Estimation Heuristics
```python
# Estimation formulas for missing cartridge drawing fields
# All based on geometric relationships from CIP/SAAMI dimensional drawings

def estimate_shoulder_angle(cartridge: dict) -> float | None:
    """Estimate shoulder angle from shoulder/neck diameters and approximate geometry.

    Most bottleneck cartridges have shoulder angles between 20-40 degrees.
    Straight-wall cartridges have no shoulder (return None).
    """
    shoulder_d = cartridge.get("shoulder_diameter_mm")
    neck_d = cartridge.get("neck_diameter_mm")
    if not shoulder_d or not neck_d:
        return None
    if shoulder_d - neck_d < 0.5:  # straight wall or nearly so
        return None
    # Default to 25 degrees for standard bottleneck, 30 for short-fat magnum
    case_length = cartridge.get("case_length_mm", 50)
    return 30.0 if case_length < 50 else 25.0

def estimate_neck_length(cartridge: dict) -> float | None:
    """Estimate neck length from bore diameter.

    Rule of thumb: neck length ~= 1x caliber (bore diameter).
    """
    bore_d = cartridge.get("bore_diameter_mm")
    if not bore_d:
        return None
    return round(bore_d, 2)

def estimate_body_length(cartridge: dict) -> float | None:
    """Estimate body length from case_length minus neck and shoulder estimate.

    body_length ~= case_length - neck_length - shoulder_height
    """
    case_length = cartridge.get("case_length_mm")
    neck_length = cartridge.get("neck_length_mm") or estimate_neck_length(cartridge)
    if not case_length or not neck_length:
        return None
    # Shoulder region typically 4-8mm
    shoulder_region = 6.0  # mm average
    body = case_length - neck_length - shoulder_region
    return round(max(body, case_length * 0.5), 2)  # never less than 50% of case

def estimate_rim_thickness(cartridge: dict) -> float | None:
    """Estimate rim thickness. Most modern cartridges: 1.2-1.5mm."""
    return 1.3  # reasonable default for rimless cartridges
```

### Geometry Engine: Cartridge Profile
```typescript
// frontend/src/lib/geometry/cartridge-geometry.ts
import type { GeometryResult, ProfilePoint, CartridgeDimensions } from './types';

export function generateCartridgeProfile(dims: CartridgeDimensions): GeometryResult {
  const estimated: string[] = [];
  const points: ProfilePoint[] = [];

  // Helper: use actual value or estimate, tracking which were estimated
  function val(field: keyof CartridgeDimensions, estimator: () => number | null): number | null {
    const actual = dims[field] as number | null;
    if (actual != null) return actual;
    const est = estimator();
    if (est != null) estimated.push(field);
    return est;
  }

  // Core dimensions (required -- if missing, return insufficient)
  const caseLength = dims.case_length_mm;
  const baseDia = dims.base_diameter_mm;
  const neckDia = dims.neck_diameter_mm;
  if (!caseLength || !baseDia || !neckDia) {
    return {
      svgPath: '',
      profilePoints: [],
      estimatedFields: [],
      dataCompleteness: 'insufficient',
    };
  }

  // Optional dimensions with fallbacks
  const rimDia = dims.rim_diameter_mm ?? baseDia;
  const rimThickness = val('rim_thickness_mm', () => 1.3) ?? 1.3;
  const shoulderDia = dims.shoulder_diameter_mm ?? baseDia;
  const shoulderAngle = val('shoulder_angle_deg', () => 25) ?? 25;
  const neckLength = val('neck_length_mm', () => dims.bore_diameter_mm ?? neckDia * 0.8) ?? neckDia;
  const bodyLength = val('body_length_mm', () => caseLength - neckLength - 6) ?? caseLength * 0.6;

  // Build profile: rim base -> rim face -> body -> shoulder -> neck -> mouth
  // Cross-section (half profile, y = radius from centerline)
  const rimR = rimDia / 2;
  const baseR = baseDia / 2;
  const shoulderR = shoulderDia / 2;
  const neckR = neckDia / 2;

  // x=0 at case head
  points.push({ x: 0, y: rimR });                    // rim outer edge
  points.push({ x: rimThickness, y: rimR });          // rim face
  points.push({ x: rimThickness, y: baseR });         // extractor groove (simplified)
  points.push({ x: rimThickness + bodyLength, y: baseR }); // body end / shoulder start
  // Shoulder is a straight taper to neck
  const shoulderEnd = rimThickness + bodyLength + (shoulderR - neckR) / Math.tan(shoulderAngle * Math.PI / 180);
  points.push({ x: shoulderEnd, y: neckR });          // shoulder/neck junction
  points.push({ x: caseLength, y: neckR });           // case mouth

  const svgPath = pointsToSvgPath(points);
  const completeness = estimated.length === 0 ? 'full'
    : estimated.length <= 3 ? 'basic'
    : 'insufficient';

  return { svgPath, profilePoints: points, estimatedFields: estimated, dataCompleteness: completeness };
}

function pointsToSvgPath(points: ProfilePoint[]): string {
  if (points.length === 0) return '';
  const cmds = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length; i++) {
    cmds.push(`L ${points[i].x} ${points[i].y}`);
  }
  return cmds.join(' ');
}
```

### Sierra Bullet Seed Data Format
```json
{
  "name": "Sierra 175gr HPBT MK .308",
  "manufacturer": "Sierra",
  "model_number": "2275",
  "weight_grains": 175,
  "diameter_mm": 7.82,
  "length_mm": 32.3,
  "bc_g1": 0.505,
  "bc_g7": 0.264,
  "bc_g1_high": 0.505,
  "bc_g1_mid": 0.496,
  "bc_g1_low": 0.485,
  "bc_g1_high_vel": 2800,
  "bc_g1_mid_vel": 1800,
  "sectional_density": 0.264,
  "material": "copper",
  "bullet_type": "match",
  "base_type": "hollow_point_boat_tail",
  "bearing_surface_mm": 18.5,
  "boat_tail_length_mm": 5.0,
  "meplat_diameter_mm": 1.8,
  "ogive_type": "tangent",
  "data_source": "manufacturer"
}
```

### Non-Sierra Bullet Seed Data Format (Berger example)
```json
{
  "name": "Berger 140gr Hybrid Target .264",
  "manufacturer": "Berger",
  "model_number": "26414",
  "weight_grains": 140,
  "diameter_mm": 6.72,
  "length_mm": 32.77,
  "bc_g1": 0.607,
  "bc_g7": 0.311,
  "sectional_density": 0.287,
  "material": "copper",
  "bullet_type": "match",
  "base_type": "hybrid_boat_tail",
  "bearing_surface_mm": 14.5,
  "boat_tail_length_mm": 4.8,
  "meplat_diameter_mm": 1.5,
  "ogive_type": "hybrid",
  "data_source": "manufacturer"
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PostgreSQL native ENUM | String column with app-level validation | Ongoing best practice | Avoids Alembic ENUM migration headaches |
| Single flat bullets.json | Per-manufacturer JSON files | This phase | Easier to review, update, track provenance per manufacturer |
| Single G1 BC per bullet | Velocity-banded BC (Sierra: 3 bands) | This phase | More accurate for long-range trajectory prediction |
| R3F v9 + React 19 | R3F v8 + React 18 | R3F v9 targets React 19 only | Must stay on v8 for React 18 compat |

**Deprecated/outdated:**
- `@react-three/fiber@9.x`: Targets React 19, not compatible with our React 18.3.1 project. Use v8.18.0.
- `drei@10.x` (if exists): Would require R3F v9. Use drei@9.122.0.

## Open Questions

1. **Bullet Dimension Data Availability**
   - What we know: Berger publishes OAL, boat tail, nose length, base-to-ogive, bearing surface, G1/G7 in their Quick Reference Sheets PDF. Sierra publishes weight, BC (3 velocity bands), diameter, and model number but NOT bearing surface or boat tail dimensions publicly.
   - What's unclear: How many Sierra/Hornady/Barnes/Speer/Nosler bullets will have bearing_surface_mm and boat_tail_length_mm available. These fields may be null for many bullets.
   - Recommendation: Populate what's available from manufacturer data. For Sierra, the rendering fields (bearing_surface, boat_tail_length) will often be null -- the geometry engine must handle this gracefully with estimation. Accept that data completeness will vary by manufacturer.

2. **Seed Version Tracking**
   - What we know: User wants to replace existing 127 bullets with new 500+ seed data. Need to distinguish "first boot" from "already seeded with v2 data."
   - What's unclear: Exact mechanism for version tracking.
   - Recommendation: Use a simple approach -- check bullet count. If count <= 127 (old seed), delete all and reseed. If count > 400, assume new seed loaded. If between 128-400, user has custom data -- skip seed. This avoids needing a separate metadata table.

3. **Three.js Version Pinning**
   - What we know: R3F v8 peer dep says `three >=0.133`. Latest Three.js is 0.183.1. drei v9.122.0 peers `three >=0.137`.
   - What's unclear: Whether Three.js 0.170+ has breaking changes that affect R3F v8 internals.
   - Recommendation: Install `three@^0.170.0` (conservative). This phase only needs `Vector2` from Three.js for the geometry engine type definitions. The actual 3D rendering (Phase 13) can update the pin if needed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.x + pytest-asyncio + aiosqlite |
| Config file | `backend/tests/conftest.py` (sys.path setup) |
| Quick run command | `cd backend && python -m pytest tests/test_schema_validation.py -x` |
| Full suite command | `cd backend && python -m pytest tests/ -v` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHM-01 | Cartridge schema accepts 5 new optional fields; rejects invalid values | unit | `pytest tests/test_schema_validation.py::test_cartridge_new_fields -x` | Wave 0 |
| SCHM-01 | Cartridge API PUT with new fields saves to DB | integration | `pytest tests/test_api_integration.py::test_cartridge_schema_extension -x` | Wave 0 |
| SCHM-02 | Bullet schema accepts 4 rendering + 5 BC fields; rejects invalid values | unit | `pytest tests/test_schema_validation.py::test_bullet_new_fields -x` | Wave 0 |
| SCHM-02 | Bullet API PUT with new fields saves to DB | integration | `pytest tests/test_api_integration.py::test_bullet_schema_extension -x` | Wave 0 |
| SCHM-03 | Geometry engine returns valid SVG path for cartridge with all fields | unit | `cd frontend && npx jest lib/geometry/ --testPathPattern cartridge` | Wave 0 (needs jest setup) |
| SCHM-03 | Geometry engine returns 'basic' completeness when optional fields null | unit | `cd frontend && npx jest lib/geometry/ --testPathPattern fallback` | Wave 0 |
| DATA-01 | Seed data produces 500+ bullets across 7 manufacturers | integration | `pytest tests/test_seed_data.py::test_bullet_count -x` | Wave 0 |
| DATA-01 | Quality scores computed for all seeded bullets | integration | `pytest tests/test_seed_data.py::test_bullet_quality -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && python -m pytest tests/test_schema_validation.py tests/test_api_integration.py -x --tb=short`
- **Per wave merge:** `cd backend && python -m pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_seed_data.py` -- covers DATA-01 (bullet count, manufacturer coverage, quality scores)
- [ ] `tests/test_schema_validation.py` -- needs new test functions for SCHM-01 and SCHM-02 fields
- [ ] `tests/test_api_integration.py` -- needs new test functions for schema extension CRUD
- [ ] Frontend geometry engine tests -- needs Jest/Vitest setup (currently no frontend test runner)
  - Recommendation: Skip frontend unit tests in this phase. The geometry engine is pure TypeScript, testable but not worth setting up a test runner for Phase 11 alone. Phase 12 (2D SVG) will visually validate the geometry engine. Add a note for future test setup.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `backend/app/models/bullet.py`, `backend/app/models/cartridge.py` -- current model structure
- Codebase inspection: `backend/app/schemas/bullet.py`, `backend/app/schemas/cartridge.py` -- current Pydantic patterns
- Codebase inspection: `backend/app/core/quality.py` -- quality scoring with BONUS_FIELDS pattern
- Codebase inspection: `backend/app/seed/initial_data.py` -- seed loader with fixture files
- Codebase inspection: `backend/app/db/migrations/versions/` -- 8 existing Alembic migrations
- npm registry: `@react-three/fiber@8.18.0` peer deps `react >=18 <19`, `three >=0.133`
- npm registry: `@react-three/drei@9.122.0` peer deps `@react-three/fiber ^8`, `react ^18`, `three >=0.137`
- npm registry: `three@0.183.1` (latest), recommend pinning `^0.170.0`
- [Three.js LatheGeometry docs](https://threejs.org/docs/pages/LatheGeometry.html) -- Vector2 profile to 3D geometry
- [Berger Bullets Quick Reference Sheets PDF](https://bergerbullets.com/pdf/Quick-Reference-Sheets.pdf) -- OAL, boat tail, nose length, bearing surface, G1/G7

### Secondary (MEDIUM confidence)
- [Sierra Bullets BC Velocity Banding](https://www.sierrabullets.com/exterior-ballistics/2-4-lessons-learned-from-ballistic-coefficient-testing/) -- 3-range velocity-banded G1 BC system
- [Sierra Bullets BC Listing PDF](http://www.bondbywater.co.uk/doc_uploads/product%20info%20docs/Sierra/Sierra%20Ballistic%20Coefficients.pdf) -- Full BC data with velocity ranges
- [Berger Bullet Reference Charts](https://bergerbullets.com/information/lines-and-designs/bullet-reference-charts/) -- online dimension data
- [SQLAlchemy 2.0 ENUM documentation](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html) -- PostgreSQL ENUM considerations
- [Alembic PostgreSQL ENUM migration complexities](https://makimo.com/blog/upgrading-postgresqls-enum-type-with-sqlalchemy-using-alembic-migration/) -- why String columns are preferred

### Tertiary (LOW confidence)
- Barnes bullet specifications from forum posts and retailer listings -- dimensions vary by source, needs verification against manufacturer packaging
- Speer bullet data -- least available of the 7 manufacturers, may have the most null fields

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - versions verified via npm registry, peer deps confirmed compatible
- Architecture: HIGH - extends existing proven patterns (Alembic migrations, Pydantic schemas, seed fixtures)
- Pitfalls: HIGH - based on direct codebase inspection of current seed loader, quality scoring, and migration patterns
- Data sourcing: MEDIUM - Berger data is excellent (full PDF specs), Sierra BCs are well-documented, but Barnes/Speer dimension data availability is uncertain

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable domain, no fast-moving dependencies)
