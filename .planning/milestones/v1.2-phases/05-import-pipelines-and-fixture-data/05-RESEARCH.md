# Phase 5: Import Pipelines and Fixture Data - Research

**Researched:** 2026-02-22
**Domain:** Data import pipelines, fixture compilation, seed automation, powder aliasing
**Confidence:** HIGH (core patterns) / MEDIUM (data sourcing feasibility)

## Summary

Phase 5 transforms the simulator from a demo with ~10 powders, ~10 bullets, and ~5 cartridges into a production-ready tool with 200+ powders, 100-200 bullets, and 50+ cartridges pre-loaded on first Docker boot. The existing codebase already has strong infrastructure: a GRT XML parser/converter (`grt_parser.py`, `grt_converter.py`), a GRT import endpoint (`POST /powders/import-grt`), quality scoring (`quality.py`), caliber family derivation (`search.py`), and a seed system in `initial_data.py`. The main work is: (1) compiling large fixture datasets as JSON files under `backend/seed/`, (2) adding schema columns for powder aliases and cartridge lineage, (3) extending the import endpoint with 3-mode collision handling (skip/overwrite/merge) and user-record protection, (4) building batch import endpoints for bullets and cartridges, and (5) refactoring the seed system to load fixtures from JSON files on first boot.

**Primary recommendation:** Build fixture data as version-controlled JSON files in `backend/seed/fixtures/`. Extend `initial_data.py` to load from these files instead of inline Python dicts. Add an `alias_group` column to the powder model (simpler than a join table for the current requirements). Add `parent_cartridge_name` to cartridge fixtures for lineage. Build batch import endpoints for bullets and cartridges mirroring the existing GRT import pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Calibers**: All popular rifle calibers -- .308 Win, 6.5 Creedmoor, .223 Rem, .300 WM plus .270 Win, .30-06, 7mm Rem Mag, .22-250, .243 Win, 6mm Creedmoor, .338 Lapua Mag, and other widely used calibers
- **Bullet types**: Match/precision AND hunting lines -- Sierra MatchKing + GameKing, Hornady ELD-M + ELD-X, Berger Target/Hybrid + VLD Hunting, Nosler AccuBond/Partition, Lapua Scenar. Exclude varmint/plinking/FMJ
- **Powders**: Import the full GRT database (600+ powders). Let search/filtering handle discoverability
- **Cartridges**: Claude's discretion on including popular proprietary cartridges (6.5 PRC, .224 Valkyrie, .300 PRC) beyond CIP/SAAMI standardized ones, based on data availability
- **Powder alias behavior**: Separate records for each alias, linked together (both ADI AR2208 and Hodgdon Varget exist as distinct records with a visible link/badge indicating equivalence). Independent simulation parameters per record -- link is informational only
- **Alias data**: Pre-loaded from GRT known alias mappings during import, PLUS users can manually link powders they know are equivalent
- **Import collision handling**: Import endpoint accepts a mode parameter: skip, overwrite, or merge -- user chooses per import operation. User-created records (source='manual') are NEVER overwritten. On collision, the imported version gets a renamed name so both coexist
- **On fresh Docker boot (first-ever seed)**: data loads automatically, no manual import needed. Extends current seed behavior with larger dataset
- **Data sourcing**: GRT community data for powders (Claude researches format). Claude's discretion on bullet sources. CIP/SAAMI official tables for cartridge specs
- **Fixture storage**: JSON fixture files committed to the repo under `backend/seed/`. Version-controlled and auditable, no build-time generation

### Claude's Discretion
- GRT XML parsing approach and field mapping
- Alias storage model (group field vs join table)
- Rename pattern for collision imports
- Bullet data compilation strategy (catalog scraping vs open datasets vs manual)
- Cartridge selection for proprietary/non-SAAMI entries
- Fixture file structure and organization within `backend/seed/`

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PWD-01 | User can batch-import 200+ powders from GRT community database XML files with collision handling (skip/overwrite) | Existing `grt_parser.py` + `grt_converter.py` handle XML parsing. Import endpoint at `POST /powders/import-grt` exists but needs collision mode parameter and merge support. Fixture files provide the 200+ powder seed data |
| PWD-05 | Powder aliases are resolved so duplicate entries across markets are linked (e.g., ADI AR2208 = Hodgdon Varget) | New `alias_group` column on Powder model. Pre-loaded alias mappings in fixture file. User manual linking via PUT endpoint |
| BUL-01 | Simulator ships with 100-200 pre-loaded bullets from major manufacturers covering .308, 6.5CM, .223, .300WM calibers | JSON fixture files with manually compiled bullet data from manufacturer public catalogs. Seed system loads on first boot |
| BUL-02 | Bullet records include manufacturer, model number, weight, diameter, BC (G1/G7), bullet type, and base type | New columns `model_number`, `bullet_type`, `base_type` needed on Bullet model. Existing columns cover weight, diameter, BC, manufacturer |
| BUL-03 | Bullet schema tolerates missing fields (nullable length_mm, bc_g7) with completeness indicators | `bc_g7` already nullable. `length_mm` currently NOT NULL -- needs migration to make nullable. Quality scoring already handles missing fields for completeness indicators |
| BUL-04 | User can batch-import bullets from JSON fixture files via scriptable pipeline | New `POST /bullets/import` endpoint accepting JSON array, with same collision modes as powder import |
| CRT-01 | Simulator ships with 50+ pre-loaded cartridges with CIP/SAAMI specs | JSON fixture file with cartridge data compiled from SAAMI/CIP public specifications |
| CRT-02 | Cartridge records include parent cartridge lineage and extended dimensions | New `parent_cartridge_name` column on Cartridge model. Extended dimension columns as needed (shoulder_diameter_mm, neck_diameter_mm, etc.) |
| CRT-03 | User can batch-import cartridges from JSON fixture files via scriptable pipeline | New `POST /cartridges/import` endpoint accepting JSON array, with same collision modes |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | 0.115.6 | API endpoints for import | Already in project, import endpoints follow existing CRUD pattern |
| SQLAlchemy | 2.0.36 | ORM models, bulk operations | Already in project, async session for batch inserts |
| Alembic | 1.14.1 | Schema migrations | Already configured with 6 migrations |
| Pydantic | 2.10.4 | Request/response schemas | Already used for all schemas |
| xml.etree.ElementTree | stdlib | GRT XML parsing | Already used in `grt_parser.py` -- sufficient for files under 10MB |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| python-multipart | 0.0.20 | File upload handling | Already used for GRT import and chrono endpoints |
| aiosqlite | 0.20.0 | Test database | Already used for API integration tests |

### No New Dependencies Required
The existing stack handles everything needed for Phase 5. No new pip packages are required. The `xml.etree.ElementTree` stdlib module is already used in `grt_parser.py` and handles GRT XML parsing adequately. JSON loading is stdlib. Bulk SQLAlchemy inserts use `session.add_all()` which is already available.

## Architecture Patterns

### Recommended Project Structure
```
backend/
├── seed/
│   ├── __init__.py
│   ├── initial_data.py          # REFACTORED: load from fixtures/ JSON files
│   └── fixtures/                # NEW: all fixture data as JSON
│       ├── powders.json         # 200+ powders (from GRT data compilation)
│       ├── powder_aliases.json  # Alias group mappings
│       ├── bullets.json         # 100-200 bullets
│       └── cartridges.json     # 50+ cartridges with parent lineage
├── app/
│   ├── models/
│   │   ├── powder.py            # ADD: alias_group column
│   │   ├── bullet.py            # ADD: model_number, bullet_type, base_type columns
│   │   └── cartridge.py         # ADD: parent_cartridge_name, extended dims
│   ├── schemas/
│   │   ├── powder.py            # UPDATE: GrtImportResult with mode, alias fields
│   │   ├── bullet.py            # ADD: BulletImportRequest/Result schemas
│   │   └── cartridge.py         # ADD: CartridgeImportRequest/Result schemas
│   ├── api/
│   │   ├── powders.py           # UPDATE: collision mode param, merge logic
│   │   ├── bullets.py           # ADD: POST /bullets/import endpoint
│   │   └── cartridges.py        # ADD: POST /cartridges/import endpoint
│   └── db/migrations/versions/
│       └── 007_import_pipelines.py  # New columns migration
```

### Pattern 1: Fixture-Based Seeding (replace inline dicts)
**What:** Load seed data from JSON files instead of Python dicts in `initial_data.py`
**When to use:** When seed data exceeds ~20 records (becomes unwieldy as inline Python)
**Why:** 200+ powders as Python dicts would be 5000+ lines. JSON is auditable, diffable, and can be regenerated from source data.
**Example:**
```python
# backend/seed/initial_data.py
import json
from pathlib import Path

FIXTURES_DIR = Path(__file__).parent / "fixtures"

def _load_fixture(filename: str) -> list[dict]:
    filepath = FIXTURES_DIR / filename
    if not filepath.exists():
        return []
    with open(filepath) as f:
        return json.load(f)

async def seed_initial_data(db: AsyncSession):
    existing = await db.execute(select(Powder).limit(1))
    if existing.scalar():
        logger.info("Seed data already exists, skipping")
        return

    # Load from JSON fixtures
    powders_data = _load_fixture("powders.json")
    for data in powders_data:
        powder = Powder(**data)
        powder.data_source = data.get("data_source", "grt_community")
        # Compute quality score
        breakdown = compute_quality_score(...)
        powder.quality_score = breakdown.score
        db.add(powder)
    # ... similar for bullets, cartridges
```

### Pattern 2: Three-Mode Collision Handling
**What:** Import endpoint accepts `mode` parameter: `skip`, `overwrite`, `merge`
**When to use:** All batch import endpoints (powders, bullets, cartridges)
**Example:**
```python
from enum import Enum

class ImportMode(str, Enum):
    skip = "skip"        # Skip records that already exist by name
    overwrite = "overwrite"  # Replace existing records (NEVER user-created)
    merge = "merge"      # Update only NULL fields in existing records

@router.post("/import", response_model=ImportResult)
async def batch_import(
    file: UploadFile,
    mode: ImportMode = Query(ImportMode.skip),
    db: AsyncSession = Depends(get_db),
):
    # Pre-fetch existing records by name (case-insensitive)
    existing_map = {p.name.lower(): p for p in existing_records}

    for record_data in parsed_records:
        name_lower = record_data["name"].lower()
        existing = existing_map.get(name_lower)

        if existing:
            if existing.data_source == "manual":
                # NEVER overwrite user data -- rename the import
                record_data["name"] = f"{record_data['name']} (Import)"
                # Create as new record
            elif mode == ImportMode.skip:
                skipped.append(record_data["name"])
                continue
            elif mode == ImportMode.overwrite:
                # Update all fields on existing record
                for key, value in record_data.items():
                    setattr(existing, key, value)
            elif mode == ImportMode.merge:
                # Only fill NULL fields
                for key, value in record_data.items():
                    if getattr(existing, key) is None and value is not None:
                        setattr(existing, key, value)
        else:
            # New record -- create it
            db.add(Model(**record_data))
```

### Pattern 3: Powder Alias Groups (simple column approach)
**What:** An `alias_group` string column that links equivalent powders
**When to use:** When aliases are informational only (no shared simulation parameters)
**Why simpler than join table:** User decided aliases are informational only, independent parameters per record. A join table adds complexity for no functional benefit. A shared string identifier (e.g., "varget-group") links all members.
**Example:**
```python
# Model
class Powder(UUIDMixin, Base):
    __tablename__ = "powders"
    # ... existing columns ...
    alias_group = Column(String(100), nullable=True, index=True)

# Query aliases for a powder
async def get_aliases(powder_id: UUID, db: AsyncSession):
    powder = await db.get(Powder, powder_id)
    if not powder or not powder.alias_group:
        return []
    result = await db.execute(
        select(Powder)
        .where(Powder.alias_group == powder.alias_group)
        .where(Powder.id != powder_id)
    )
    return result.scalars().all()
```

### Pattern 4: Nullable Fields with Quality Scoring
**What:** Make BUL-03 fields nullable while maintaining quality completeness tracking
**When to use:** Bullet records where length_mm or bc_g7 may be unknown
**Example:**
```python
# Migration: make length_mm nullable
op.alter_column("bullets", "length_mm",
    existing_type=sa.Float,
    nullable=True,
    existing_nullable=False)

# Schema: update BulletCreate to allow None
length_mm: float | None = Field(None, gt=0, le=100)

# Quality: already handled -- BULLET_BONUS_FIELDS includes length_mm and bc_g7
```

### Anti-Patterns to Avoid
- **Inline fixture data in Python code:** 200+ powder dicts as Python code is unreadable and undiffable. Use JSON files.
- **Single monolithic fixture file:** Powders, bullets, and cartridges should be separate JSON files. Alias mappings should also be separate.
- **Bulk insert with `session.execute(insert(...).values(records))` for 200 records:** SQLAlchemy async requires careful handling. Use `session.add_all()` + `await session.flush()` in reasonable batches (50-100 at a time) to avoid memory issues.
- **Overwriting user records during import:** User decision explicitly forbids this. Always check `data_source == "manual"` and rename the imported record on collision.
- **Building GRT XML fixtures from scratch:** The user does not have GRT files. Fixture data should be compiled as JSON directly, with the GRT XML parser remaining for future user-initiated imports.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XML parsing | Custom parser | `xml.etree.ElementTree` (already in `grt_parser.py`) | Stdlib, well-tested, handles GRT format perfectly |
| Quality scoring | Per-import scoring logic | Existing `compute_quality_score()` / `compute_bullet_quality_score()` / `compute_cartridge_quality_score()` | Already implemented and tested, deterministic |
| Caliber family derivation | Manual mapping per import | Existing `derive_caliber_family()` in `search.py` | Already handles 11 caliber families |
| Duplicate detection | Custom name matching | Simple `name.lower()` dict lookup (already in GRT import) | Case-insensitive, O(1) lookup |
| JSON fixture loading | Database dump/restore | `json.load()` from committed files | Simple, auditable, version-controlled |

**Key insight:** The existing codebase already has 80% of the import infrastructure built. The GRT parser, converter, quality scoring, and caliber derivation are all production-ready. The main work is data compilation and extending existing patterns to bullets/cartridges.

## Common Pitfalls

### Pitfall 1: Seed data blocks Docker startup on large datasets
**What goes wrong:** Loading 200+ powders, 100+ bullets, and 50+ cartridges with individual `db.add()` + quality score computation on every startup adds seconds to boot time.
**Why it happens:** Current seed checks `if existing.scalar()` (any powder exists = skip all). With fixtures, this check still works but the initial seed will take longer.
**How to avoid:** Batch inserts in chunks of 50-100. Use `session.add_all()` + single `flush()` per batch. Compute quality scores in a loop without individual commits. Only commit once at the end.
**Warning signs:** Docker boot takes >10 seconds with "Seeding initial data..." log message.

### Pitfall 2: GRT powder data compilation -- fewer than 200 powders available
**What goes wrong:** The user expects "full GRT database (600+ powders)" but the GitHub repo (zen/grt_databases) only has 12 .propellant files. The full GRT database is inside the desktop application, not freely available as a bulk export.
**Why it happens:** GRT is a Windows desktop app. Its community database is compiled from user submissions and distributed inside the app. No public API or bulk export exists.
**How to avoid:** Compile the 200+ powder fixture from multiple sources: (1) the 22 existing seed powders, (2) the 12 zen/grt_databases .propellant files parsed through our existing converter, (3) manual compilation from published thermochemical data for remaining popular powders. Set `data_source` appropriately for each source tier.
**Warning signs:** Running GRT import on the 12 GitHub files produces only 12 records.

### Pitfall 3: Unique constraint violations during batch import
**What goes wrong:** `IntegrityError` on powder/bullet/cartridge name during bulk seed or import.
**Why it happens:** All three tables have `unique=True` on the `name` column. If fixture JSON has duplicates or the import collides with existing seed data.
**How to avoid:** Pre-fetch all existing names into a set before batch insert. Deduplicate fixture JSON during compilation. The collision handling pattern (skip/overwrite/merge) addresses runtime imports.
**Warning signs:** `sqlalchemy.exc.IntegrityError: UNIQUE constraint failed` during seed or import.

### Pitfall 4: Missing bullet data fields (BUL-03 tolerance)
**What goes wrong:** Fixture JSON has bullets without `length_mm` or `bc_g7`, but the current schema requires `length_mm` as NOT NULL and `bc_g1` as NOT NULL.
**Why it happens:** Manufacturer catalogs often publish weight, diameter, and G1 BC but omit length. Some only publish G1 BC, not G7.
**How to avoid:** Migration to make `length_mm` nullable (currently NOT NULL in model). `bc_g7` is already nullable. `sectional_density` can be computed from weight and diameter if missing. Update `BulletCreate` schema to accept nullable `length_mm`.
**Warning signs:** Validation errors during fixture loading for bullets without length data.

### Pitfall 5: Cartridge parent_cartridge_name referencing nonexistent cartridges
**What goes wrong:** Cartridge fixture sets `parent_cartridge_name: ".30-06 Springfield"` but the parent is loaded after the child, or the parent name doesn't exactly match.
**Why it happens:** Parent-child relationships in fixtures assume load order.
**How to avoid:** Use `parent_cartridge_name` as a string field (not a FK), matching by exact name string. Load cartridges in a single pass, then resolve parent references in a second pass. Or simply store as a string that matches the name of another cartridge (informational, not enforced by FK).
**Warning signs:** Orphan parent references in the cartridge table.

### Pitfall 6: Alias group assignment during seed conflicts with user manual aliasing
**What goes wrong:** Fixture pre-loads alias groups, but user later wants to unlink or re-link aliases. The alias_group field has no clear "owner".
**Why it happens:** Both automated seed and manual user action write to the same field.
**How to avoid:** Alias group is a simple string. Any powder's alias_group can be changed via PUT. When user manually links two powders, they just set the same alias_group value on both. When unlinking, set alias_group to NULL. No ownership tracking needed -- it's just a label.
**Warning signs:** User edits alias_group on one powder but forgets to update the linked powder.

## Code Examples

### Fixture JSON Structure for Powders
```json
[
  {
    "name": "Hodgdon Varget",
    "manufacturer": "Hodgdon/ADI",
    "burn_rate_relative": 82,
    "force_constant_j_kg": 950000,
    "covolume_m3_kg": 0.001,
    "flame_temp_k": 4050,
    "gamma": 1.24,
    "density_g_cm3": 1.60,
    "burn_rate_coeff": 1.6e-8,
    "burn_rate_exp": 0.86,
    "data_source": "grt_community",
    "web_thickness_mm": 0.45,
    "alias_group": "varget-ar2208",
    "ba": 1.82,
    "bp": 0.62,
    "br": 0.55,
    "brp": 0.58,
    "z1": 0.28,
    "z2": 0.78
  },
  {
    "name": "ADI AR2208",
    "manufacturer": "ADI/Thales",
    "burn_rate_relative": 82,
    "force_constant_j_kg": 950000,
    "covolume_m3_kg": 0.001,
    "flame_temp_k": 4050,
    "gamma": 1.24,
    "density_g_cm3": 1.60,
    "burn_rate_coeff": 1.6e-8,
    "burn_rate_exp": 0.86,
    "data_source": "grt_community",
    "web_thickness_mm": 0.45,
    "alias_group": "varget-ar2208"
  }
]
```

### Fixture JSON Structure for Bullets
```json
[
  {
    "name": "Sierra 168gr HPBT MatchKing #2200",
    "manufacturer": "Sierra",
    "model_number": "2200",
    "weight_grains": 168,
    "diameter_mm": 7.82,
    "length_mm": 31.2,
    "bc_g1": 0.462,
    "bc_g7": 0.218,
    "sectional_density": 0.253,
    "material": "copper",
    "bullet_type": "match",
    "base_type": "hollow_point_boat_tail",
    "data_source": "manufacturer"
  },
  {
    "name": "Hornady 143gr ELD-X #2635",
    "manufacturer": "Hornady",
    "model_number": "2635",
    "weight_grains": 143,
    "diameter_mm": 6.72,
    "length_mm": null,
    "bc_g1": 0.625,
    "bc_g7": 0.315,
    "sectional_density": 0.293,
    "material": "copper",
    "bullet_type": "hunting",
    "base_type": "polymer_tip_boat_tail",
    "data_source": "manufacturer"
  }
]
```

### Fixture JSON Structure for Cartridges
```json
[
  {
    "name": ".308 Winchester",
    "saami_max_pressure_psi": 62000,
    "cip_max_pressure_mpa": 415.0,
    "case_capacity_grains_h2o": 54.0,
    "case_length_mm": 51.18,
    "overall_length_mm": 71.12,
    "bore_diameter_mm": 7.62,
    "groove_diameter_mm": 7.82,
    "parent_cartridge_name": ".300 Savage",
    "shoulder_diameter_mm": 11.53,
    "neck_diameter_mm": 8.72,
    "base_diameter_mm": 11.96,
    "rim_diameter_mm": 12.01,
    "data_source": "saami"
  },
  {
    "name": "6.5 Creedmoor",
    "saami_max_pressure_psi": 62000,
    "cip_max_pressure_mpa": 420.0,
    "case_capacity_grains_h2o": 52.5,
    "case_length_mm": 48.77,
    "overall_length_mm": 72.39,
    "bore_diameter_mm": 6.50,
    "groove_diameter_mm": 6.72,
    "parent_cartridge_name": ".30 TC",
    "data_source": "saami"
  }
]
```

### Powder Alias Mappings Fixture
```json
{
  "varget-ar2208": ["Hodgdon Varget", "ADI AR2208"],
  "h4350-ar2209": ["Hodgdon H4350", "ADI AR2209"],
  "h4895-ar2206h": ["Hodgdon H4895", "ADI AR2206H"],
  "h1000-ar2217": ["Hodgdon H1000", "ADI AR2217"],
  "retumbo-ar2225": ["Hodgdon Retumbo", "ADI AR2225"],
  "h4198-ar2207": ["Hodgdon H4198", "ADI AR2207"],
  "h4831-ar2213sc": ["Hodgdon H4831SC", "ADI AR2213SC"],
  "h50bmg-ar2218": ["Hodgdon H50BMG", "ADI AR2218"],
  "h322-ar2219": ["Hodgdon H322", "ADI AR2219"],
  "benchmark-bm2": ["Hodgdon Benchmark", "ADI BM2"]
}
```

### Batch Import Endpoint for Bullets
```python
class BulletImportRequest(BaseModel):
    bullets: list[BulletCreate]

class ImportResult(BaseModel):
    created: int
    updated: int
    skipped: list[str]
    errors: list[str]

@router.post("/import", response_model=ImportResult)
async def import_bullets(
    data: BulletImportRequest,
    mode: ImportMode = Query(ImportMode.skip),
    db: AsyncSession = Depends(get_db),
):
    # Pre-fetch existing bullets for collision detection
    result = await db.execute(select(Bullet))
    existing_map = {b.name.lower(): b for b in result.scalars().all()}

    created_count = 0
    updated_count = 0
    skipped = []
    errors = []

    for bullet_data in data.bullets:
        try:
            name_lower = bullet_data.name.lower()
            existing = existing_map.get(name_lower)

            if existing:
                if existing.data_source == "manual":
                    # Never overwrite user data
                    new_name = f"{bullet_data.name} (Import)"
                    bullet = Bullet(**bullet_data.model_dump())
                    bullet.name = new_name
                    bullet.caliber_family = derive_caliber_family(bullet.diameter_mm)
                    db.add(bullet)
                    created_count += 1
                elif mode == ImportMode.skip:
                    skipped.append(bullet_data.name)
                elif mode == ImportMode.overwrite:
                    for key, value in bullet_data.model_dump(exclude_unset=True).items():
                        setattr(existing, key, value)
                    existing.caliber_family = derive_caliber_family(existing.diameter_mm)
                    updated_count += 1
                elif mode == ImportMode.merge:
                    for key, value in bullet_data.model_dump(exclude_unset=True).items():
                        if getattr(existing, key) is None and value is not None:
                            setattr(existing, key, value)
                    updated_count += 1
            else:
                bullet = Bullet(**bullet_data.model_dump())
                bullet.caliber_family = derive_caliber_family(bullet.diameter_mm)
                db.add(bullet)
                existing_map[name_lower] = bullet
                created_count += 1
        except Exception as e:
            errors.append(f"{bullet_data.name}: {e}")

    await db.commit()
    return ImportResult(
        created=created_count,
        updated=updated_count,
        skipped=skipped,
        errors=errors,
    )
```

### Updated Seed Loading
```python
async def seed_initial_data(db: AsyncSession):
    """Load fixture data on first boot if tables are empty."""
    existing = await db.execute(select(Powder).limit(1))
    if existing.scalar():
        logger.info("Seed data already exists, skipping")
        return

    logger.info("Seeding fixture data...")

    # Load powders
    powders_data = _load_fixture("powders.json")
    powder_objects = []
    for data in powders_data:
        powder = Powder(**{k: v for k, v in data.items() if hasattr(Powder, k)})
        breakdown = compute_quality_score(data, data.get("data_source", "manual"))
        powder.quality_score = breakdown.score
        powder_objects.append(powder)
    db.add_all(powder_objects)

    # Apply alias groups from separate file
    aliases_data = _load_fixture("powder_aliases.json")
    if aliases_data:
        await db.flush()  # ensure powder names are committed
        for group_name, powder_names in aliases_data.items():
            for pname in powder_names:
                # Find powder by name and set alias_group
                result = await db.execute(
                    select(Powder).where(Powder.name == pname)
                )
                p = result.scalar_one_or_none()
                if p:
                    p.alias_group = group_name

    # Load bullets
    bullets_data = _load_fixture("bullets.json")
    bullet_objects = []
    for data in bullets_data:
        bullet = Bullet(**{k: v for k, v in data.items() if hasattr(Bullet, k)})
        bullet.caliber_family = derive_caliber_family(bullet.diameter_mm)
        breakdown = compute_bullet_quality_score(data, data.get("data_source", "manual"))
        bullet.quality_score = breakdown.score
        bullet_objects.append(bullet)
    db.add_all(bullet_objects)

    # Load cartridges (similar pattern)
    # ...

    await db.commit()
    logger.info("Fixture data seeded: %d powders, %d bullets, %d cartridges",
                len(powder_objects), len(bullet_objects), len(cartridge_objects))
```

## Data Sourcing Strategy

### Powders (200+ target)
**Confidence: MEDIUM** -- The full GRT database is not publicly available as a bulk export. Strategy:

1. **Existing seed data (22 powders):** Already in `initial_data.py`. Keep as baseline with `data_source: "manual"`.
2. **zen/grt_databases GitHub (12 .propellant files):** Parse through existing `grt_parser.py` + `grt_converter.py`. Set `data_source: "grt_community"`.
3. **Manual compilation (170+ powders):** Compile from published thermochemical data sources:
   - Hodgdon burn rate chart (relative positions for ~80 powders)
   - Vihtavuori published data (N-series: N110 through N570, ~20 powders)
   - Alliant published data (Reloder series, ~15 powders)
   - IMR published data (~15 powders)
   - ADI powders (mirror Hodgdon equivalents with separate records)
   - Accurate Arms, Norma, Ramshot, Winchester (~30 powders)
   - For thermochemical constants (F, eta, gamma, T_flame): use generic SB/DB defaults from `materials_database.md` when specific data is unavailable
   - For burn rate parameters (Ba, Bp, Br, z1, z2): leave NULL when not from GRT data
   - Set `data_source: "estimated"` for powders with only generic constants

**Reality check:** Getting full GRT-quality Ba/Bp/Br parameters for 200+ powders is not feasible without GRT application access. Many powders will have basic thermochemical data (force constant, flame temp, density) but lack 3-curve burn model parameters. The quality scoring system will correctly flag these as lower quality (yellow/red badges).

### Bullets (100-200 target)
**Confidence: MEDIUM** -- No structured open dataset exists. Strategy:

1. **Existing seed data (10 bullets):** Keep and enhance with new fields.
2. **Manual compilation from manufacturer public catalogs (100-190 bullets):**
   - Sierra: MatchKing (12-15 bullets) + GameKing (10-12 bullets) across .224, .264, .308, .338
   - Hornady: ELD Match (10-12 bullets) + ELD-X (10-12 bullets) across target calibers
   - Berger: Target/Hybrid (10-12 bullets) + VLD Hunting (8-10 bullets)
   - Nosler: AccuBond (8-10 bullets) + Partition (6-8 bullets)
   - Lapua: Scenar/Scenar-L (8-10 bullets)
   - Total: ~100-130 bullets from manufacturer published specs (weight, diameter, BC G1/G7)
   - Set `data_source: "manufacturer"` for catalog-sourced data
3. **AccurateShooter.com bullet database (3900+ bullets):** Contains weight, length, SD, BC data from QuickLOAD. However, this is a web resource, not a downloadable dataset. Manual extraction of our target subset is feasible.

**Data available per bullet from manufacturer catalogs:**
- Always: weight (grains), diameter (mm/inches), BC G1
- Usually: BC G7, sectional density
- Sometimes: bullet length
- Rarely: exact base type classification

### Cartridges (50+ target)
**Confidence: HIGH** -- SAAMI and CIP publish specifications publicly.

1. **Existing seed data (5 cartridges):** .223 Rem, 6.5 CM, .308 Win, .30-06, .338 Lapua.
2. **SAAMI/CIP published specifications (45+ more):**
   - Core calibers from user decision: .270 Win, 7mm Rem Mag, .22-250, .243 Win, 6mm CM, plus popular proprietary
   - SAAMI specs include: max pressure, case dimensions, bore/groove diameter
   - CIP specs include: max pressure (MPa), dimensional tolerances
   - Parent cartridge lineage is well-documented in firearms literature
3. **Data readily available:** case_capacity (grains H2O), case_length, overall_length, bore/groove diameters, max pressure, parent cartridge

### Known Powder Alias Mappings (pre-load in fixture)
**Confidence: HIGH** -- ADI/Hodgdon equivalencies are manufacturer-confirmed.

| Group | Powder A | Powder B |
|-------|----------|----------|
| varget-ar2208 | Hodgdon Varget | ADI AR2208 |
| h4350-ar2209 | Hodgdon H4350 | ADI AR2209 |
| h4895-ar2206h | Hodgdon H4895 | ADI AR2206H |
| h1000-ar2217 | Hodgdon H1000 | ADI AR2217 |
| retumbo-ar2225 | Hodgdon Retumbo | ADI AR2225 |
| h4198-ar2207 | Hodgdon H4198 | ADI AR2207 |
| h322-ar2219 | Hodgdon H322 | ADI AR2219 |
| h4831-ar2213sc | Hodgdon H4831SC | ADI AR2213SC |
| h50bmg-ar2218 | Hodgdon H50BMG | ADI AR2218 |
| benchmark-bm2 | Hodgdon Benchmark | ADI BM2 |
| trailboss | Hodgdon Trail Boss | ADI Trail Boss |

## Schema Changes Required

### Powder Model Additions
```python
# New column
alias_group = Column(String(100), nullable=True, index=True)
```

### Bullet Model Additions
```python
# New columns for BUL-02
model_number = Column(String(50), nullable=True)    # Manufacturer part number
bullet_type = Column(String(30), nullable=True)      # match, hunting, target, varmint
base_type = Column(String(50), nullable=True)         # hollow_point_boat_tail, polymer_tip, flat_base, etc.

# Existing column change for BUL-03
length_mm = Column(Float, nullable=True)  # Currently nullable=False, needs migration
```

### Cartridge Model Additions
```python
# New columns for CRT-02
parent_cartridge_name = Column(String(100), nullable=True)  # e.g., ".300 Savage"
shoulder_diameter_mm = Column(Float, nullable=True)
neck_diameter_mm = Column(Float, nullable=True)
base_diameter_mm = Column(Float, nullable=True)
rim_diameter_mm = Column(Float, nullable=True)
```

### Migration 007
```python
def upgrade():
    # Powder alias group
    op.add_column("powders", sa.Column("alias_group", sa.String(100), nullable=True))
    op.create_index("ix_powders_alias_group", "powders", ["alias_group"])

    # Bullet new columns
    op.add_column("bullets", sa.Column("model_number", sa.String(50), nullable=True))
    op.add_column("bullets", sa.Column("bullet_type", sa.String(30), nullable=True))
    op.add_column("bullets", sa.Column("base_type", sa.String(50), nullable=True))
    op.alter_column("bullets", "length_mm", nullable=True)

    # Cartridge new columns
    op.add_column("cartridges", sa.Column("parent_cartridge_name", sa.String(100), nullable=True))
    op.add_column("cartridges", sa.Column("shoulder_diameter_mm", sa.Float, nullable=True))
    op.add_column("cartridges", sa.Column("neck_diameter_mm", sa.Float, nullable=True))
    op.add_column("cartridges", sa.Column("base_diameter_mm", sa.Float, nullable=True))
    op.add_column("cartridges", sa.Column("rim_diameter_mm", sa.Float, nullable=True))
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline Python dicts for seed data | JSON fixture files loaded at startup | This phase | Enables 200+ records without code bloat |
| Single `overwrite: bool` param on GRT import | `mode: skip/overwrite/merge` enum | This phase | Finer control, safer for user data |
| No powder aliasing | `alias_group` column linking equivalent records | This phase | Users can discover cross-market equivalents |
| Hardcoded 22 powders, 10 bullets, 5 cartridges | 200+ / 100+ / 50+ from fixture files | This phase | Production-ready component databases |

## Open Questions

1. **Full GRT database access**
   - What we know: The GitHub repo (zen/grt_databases) has only 12 .propellant files. The full GRT database with 600+ powders is distributed inside the GRT desktop application.
   - What's unclear: Whether the user expects us to compile 600+ powders or whether 200+ with mixed data quality is acceptable.
   - Recommendation: Target 200+ powders as stated in the success criteria. Use GRT data where available (12 files + our existing converter), supplement with manually compiled thermochemical data for popular powders. Set `data_source` accurately and let quality badges communicate data confidence. The import endpoint allows users who have GRT to import their full database later.

2. **Bullet length_mm data availability**
   - What we know: Many manufacturer catalogs do not publish bullet overall length. Only weight, diameter, and BC are consistently available.
   - What's unclear: What percentage of our 100-200 bullet target will have length_mm data.
   - Recommendation: Make `length_mm` nullable (migration). Accept it in quality scoring as a bonus field (already the case). Most match bullets from Sierra/Hornady publish length; hunting bullets less consistently.

3. **Merge mode semantics for powders with 3-curve parameters**
   - What we know: Merge mode fills NULL fields. If an existing powder has Ba/Bp/Br from seed and an import has different Ba/Bp/Br values, merge won't overwrite.
   - What's unclear: Whether users expect merge to update all fields or only fill gaps.
   - Recommendation: Merge = only fill NULL fields. This is the safest default. Users who want full replacement should use overwrite mode. Document this clearly in API docs.

4. **Cartridge extended dimensions completeness**
   - What we know: SAAMI publishes case dimensions for all standardized cartridges. CIP has a slightly different set.
   - What's unclear: Whether all 50+ target cartridges will have complete shoulder/neck/base/rim diameter data.
   - Recommendation: Make all extended dimension columns nullable. Include what's available. Quality scoring handles incompleteness naturally.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `backend/app/core/grt_parser.py`, `grt_converter.py` -- existing GRT XML format handling
- Codebase analysis: `backend/app/api/powders.py` -- existing import-grt endpoint pattern
- Codebase analysis: `backend/app/core/quality.py` -- existing quality scoring system
- Codebase analysis: `backend/app/seed/initial_data.py` -- existing seed system
- Codebase analysis: `backend/app/models/` -- current schema (6 migrations)
- [GRT Propellant File Format](https://grtools.de/doku.php?id=en:doku:file_propellant) -- XML var element structure
- [ADI Powder Equivalents](https://www.adiworldclass.com.au/powder-equivalents/) -- official ADI/Hodgdon mapping
- [SAAMI Standards](https://saami.org/technical-information/ansi-saami-standards/) -- cartridge specifications

### Secondary (MEDIUM confidence)
- [zen/grt_databases GitHub](https://github.com/zen/grt_databases) -- community GRT data (12 .propellant files only)
- [AccurateShooter Bullet Database](https://www.accurateshooter.com/ballistics/bullet-database-with-2900-projectiles/) -- 3900+ bullet specs from QuickLOAD
- [Hodgdon ADI Equivalents (Daily Bulletin)](https://bulletin.accurateshooter.com/2010/12/hodgdon-equivalents-for-adi-product-codes/) -- cross-reference list
- [GRT Propellant Database](https://grtools.de/doku.php?id=en:doku:dbpropellant) -- database overview

### Tertiary (LOW confidence)
- GRT total powder count (~600+): multiple forum references but no official count verified. Actual number may vary by GRT version.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns already in codebase
- Architecture: HIGH -- extending existing import/seed patterns with well-defined changes
- Data sourcing: MEDIUM -- full GRT database not publicly available as bulk export; bullet data requires manual compilation
- Pitfalls: HIGH -- well-understood from existing import implementation experience

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stable domain, no fast-moving dependencies)
