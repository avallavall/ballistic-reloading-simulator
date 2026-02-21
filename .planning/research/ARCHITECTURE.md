# Architecture: Component Database Integration

**Domain:** Internal ballistics simulator -- component database expansion
**Researched:** 2026-02-21
**Confidence:** HIGH (based on direct codebase analysis + established PostgreSQL/SQLAlchemy patterns)

## System Overview: Current vs Target

### Current State

```
Frontend (Next.js 14)                    Backend (FastAPI)                Database (PostgreSQL 16)
+-----------------------+     REST      +---------------------------+    +---------------------+
| /powders  (flat list) | ----------->  | GET /api/v1/powders       | -> | powders (22 rows)   |
| /bullets  (flat list) | ----------->  | GET /api/v1/bullets       | -> | bullets (10 rows)   |
| /cartridges (flat)    | ----------->  | GET /api/v1/cartridges    | -> | cartridges (5 rows) |
+-----------------------+               | POST /powders/import-grt  |    +---------------------+
                                        +---------------------------+
```

**Problems at scale:**
- `GET /powders` returns `list[PowderResponse]` with no pagination (loads ALL)
- No search/filter query params on any list endpoint
- Seed data is Python dicts in `initial_data.py` (10 powders, 10 bullets, 5 cartridges)
- No data provenance tracking (who added it, when, from what source)
- No quality/confidence metadata on records
- Frontend `usePowders()` fetches entire list into memory on every mount
- `unique=True` constraint on `name` is good for dedup but insufficient for fuzzy matching

### Target State

```
Frontend (Next.js 14)                       Backend (FastAPI)                      Database (PostgreSQL 16)
+-----------------------------+   REST     +-------------------------------+      +--------------------------+
| /powders                    | -------->  | GET /powders?q=&mfg=&page=   | ---> | powders (200+ rows)      |
|   Search bar + filters      |            |   pg_trgm fuzzy + pagination |      |   + data_source          |
|   Paginated table           |            |                              |      |   + quality_score        |
|   Quality badge per row     |            | POST /powders/import/grt     |      |   + GIN trigram index    |
| /bullets                    | -------->  | GET /bullets?q=&cal=&page=   | ---> | bullets (500+ rows)      |
|   Search + caliber filter   |            |   pg_trgm fuzzy + pagination |      |   + data_source          |
|   Manufacturer facets       |            |                              |      |   + bullet_type          |
| /cartridges                 | -------->  | GET /cartridges?q=&page=     | ---> | cartridges (50+ rows)    |
|   Search + filter           |            |   pg_trgm fuzzy + pagination |      |   + parent_cartridge     |
+-----------------------------+            +-------------------------------+      +--------------------------+
                                           | POST /admin/import/bullets   |
                                           | POST /admin/import/cartridges|
                                           +-------------------------------+
```

## Component Boundaries: New vs Modified

### Modified Components (Existing Files)

| Component | File | Changes Required |
|-----------|------|-----------------|
| Powder model | `backend/app/models/powder.py` | Add `data_source`, `quality_score`, `quality_detail`, `created_at`, `updated_at` columns |
| Bullet model | `backend/app/models/bullet.py` | Add `bullet_type`, `data_source`, `quality_score`, `caliber_family`, `bearing_surface_mm`, timestamps |
| Cartridge model | `backend/app/models/cartridge.py` | Add `data_source`, `parent_cartridge_id` (self-FK), extra CIP/SAAMI dims, timestamps |
| Powder schema | `backend/app/schemas/powder.py` | Add quality/source fields to Response, pagination wrapper |
| Bullet schema | `backend/app/schemas/bullet.py` | Add quality/source/type fields, pagination wrapper |
| Cartridge schema | `backend/app/schemas/cartridge.py` | Add source/relationship fields, pagination wrapper |
| Powders API | `backend/app/api/powders.py` | Add pagination, search, filter query params to `list_powders()` |
| Bullets API | `backend/app/api/bullets.py` | Add pagination, search, filter query params to `list_bullets()` |
| Cartridges API | `backend/app/api/cartridges.py` | Add pagination, search, filter query params |
| Seed data | `backend/app/seed/initial_data.py` | Replace Python dicts with JSON fixture loader |
| Frontend types | `frontend/src/lib/types.ts` | Add quality/source/pagination fields to interfaces |
| Frontend API | `frontend/src/lib/api.ts` | Add search/filter/pagination params to get functions |
| usePowders hook | `frontend/src/hooks/usePowders.ts` | Paginated queries with search params |
| useBullets hook | `frontend/src/hooks/useBullets.ts` | Paginated queries with search params |
| Powders page | `frontend/src/app/powders/page.tsx` | Search bar, filter dropdowns, paginated table, quality badges |
| Bullets page | `frontend/src/app/bullets/page.tsx` | Search bar, caliber filter, paginated table |
| Cartridges page | `frontend/src/app/cartridges/page.tsx` | Search bar, filter, paginated table |

### New Components

| Component | File | Purpose |
|-----------|------|---------|
| Bullet import endpoint | `backend/app/api/import_bullets.py` | Batch JSON import with validation and dedup |
| Cartridge import endpoint | `backend/app/api/import_cartridges.py` | Batch JSON import for CIP/SAAMI specs |
| Import service | `backend/app/services/import_service.py` | Shared batch processing: validate, dedup, score, insert |
| Quality scorer | `backend/app/services/quality_scorer.py` | Compute quality_score from data completeness + source reliability |
| Search helpers | `backend/app/services/search.py` | Reusable pg_trgm search query builder |
| Pagination helper | `backend/app/services/pagination.py` | Offset/limit pagination with total count |
| Bullet JSON fixtures | `backend/app/seed/fixtures/bullets.json` | 500+ bullets from manufacturer specs |
| Cartridge JSON fixtures | `backend/app/seed/fixtures/cartridges.json` | 50+ cartridges with CIP/SAAMI specs |
| Powder JSON fixtures | `backend/app/seed/fixtures/powders.json` | 200+ powders (converted from GRT community DB) |
| Alembic migration 005 | `backend/app/db/migrations/versions/005_component_db_expansion.py` | Schema changes + pg_trgm extension + GIN indexes |
| SearchInput component | `frontend/src/components/ui/SearchInput.tsx` | Debounced search input with clear button |
| QualityBadge component | `frontend/src/components/ui/QualityBadge.tsx` | Red/yellow/green confidence badge |
| Pagination component | `frontend/src/components/ui/Pagination.tsx` | Page navigation controls |
| FilterDropdown component | `frontend/src/components/ui/FilterDropdown.tsx` | Multi-select filter for manufacturer/caliber |

## Architectural Patterns

### Pattern 1: Server-Side Paginated Search

**What:** All list endpoints gain `?q=`, `?page=`, `?size=`, and entity-specific filter params. Backend does the filtering/pagination, frontend only holds one page of data.

**Why this over client-side filtering:** At 500+ bullets the current approach of fetching all records and rendering them in a flat `<Table>` will cause noticeable lag. At 200+ powders it is already borderline. Server-side filtering is the correct architecture for datasets that grow continuously.

**Trade-offs:** More complex API (query params, total count), but eliminates frontend memory/rendering bottlenecks. Existing small datasets (rifles, loads) keep their simple list endpoints unchanged.

**Example backend pattern:**

```python
# backend/app/services/pagination.py
from dataclasses import dataclass
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

@dataclass
class PaginatedResult:
    items: list
    total: int
    page: int
    size: int

async def paginate(
    db: AsyncSession,
    query,
    page: int = 1,
    size: int = 50,
) -> PaginatedResult:
    # Count total
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Fetch page
    offset = (page - 1) * size
    result = await db.execute(query.offset(offset).limit(size))
    items = result.scalars().all()

    return PaginatedResult(items=items, total=total, page=page, size=size)
```

**Example endpoint:**

```python
# Modified GET /powders
@router.get("", response_model=PaginatedPowderResponse)
async def list_powders(
    q: str | None = None,
    manufacturer: str | None = None,
    has_3curve: bool | None = None,
    min_quality: int | None = None,
    sort_by: str = "name",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(Powder)
    if q:
        query = query.where(Powder.name.op("%")(q))  # pg_trgm similarity
    if manufacturer:
        query = query.where(Powder.manufacturer.ilike(f"%{manufacturer}%"))
    if has_3curve is True:
        query = query.where(Powder.ba.isnot(None))
    if min_quality is not None:
        query = query.where(Powder.quality_score >= min_quality)
    query = query.order_by(getattr(Powder, sort_by, Powder.name))
    return await paginate(db, query, page, size)
```

**Example frontend hook:**

```typescript
// Modified usePowders with search params
export function usePowders(params: PowderSearchParams = {}) {
  return useQuery({
    queryKey: ['powders', params],
    queryFn: () => getPowders(params),
    placeholderData: keepPreviousData,  // Smooth pagination transitions
  });
}
```

### Pattern 2: pg_trgm Fuzzy Search (Not Full-Text Search)

**What:** Use PostgreSQL's `pg_trgm` extension with GIN indexes for fuzzy name/manufacturer matching. NOT the full-text search (`tsvector/tsquery`) system.

**Why pg_trgm over full-text search:** Component names are short strings ("Hodgdon Varget", "Sierra 168gr HPBT MK"), not documents. pg_trgm excels at partial string matching, typo tolerance, and "contains" queries on short text. Full-text search is designed for stemming/ranking natural language documents -- overkill and wrong tool here.

**Why pg_trgm over application-level:** Pushing search to PostgreSQL uses GIN indexes for sub-millisecond response on 500+ rows. Application-level filtering loads all data into Python memory on every request.

**Trade-offs:** Requires `CREATE EXTENSION pg_trgm` in migration. GIN indexes add ~10% storage overhead. Worth it for the search quality.

**Implementation:**

```python
# In Alembic migration 005
def upgrade() -> None:
    # Enable trigram extension
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # GIN indexes for fuzzy search
    op.execute(
        "CREATE INDEX ix_powders_name_trgm ON powders USING gin (name gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX ix_bullets_name_trgm ON bullets USING gin (name gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX ix_cartridges_name_trgm ON cartridges USING gin (name gin_trgm_ops)"
    )
```

**Query pattern:**

```python
# backend/app/services/search.py
from sqlalchemy import or_, func

def apply_fuzzy_search(query, model, search_term: str):
    """Apply pg_trgm similarity search on name and manufacturer."""
    return query.where(
        or_(
            model.name.op("%")(search_term),
            model.manufacturer.op("%")(search_term),
        )
    ).order_by(
        func.similarity(model.name, search_term).desc()
    )
```

### Pattern 3: Quality Scoring Model

**What:** Each component record carries a `quality_score` (0-100 integer) and `data_source` enum. The score is computed deterministically from data completeness and source reliability.

**Why a computed score, not manual curation:** With 200+ powders and 500+ bullets, manual quality assignment does not scale. A deterministic formula based on field completeness + source tier is reproducible and auditable.

**Quality tiers (for UI badge display):**

| Score Range | Badge | Color | Meaning |
|-------------|-------|-------|---------|
| 80-100 | Alta | GREEN | High confidence: manufacturer data + 3-curve params + community validated |
| 50-79 | Media | YELLOW | Moderate: has core params but missing some optional data or single source |
| 0-49 | Baja | RED | Low: estimated/derived params, unverified, significant gaps |

**Scoring formula for powders:**

```python
# backend/app/services/quality_scorer.py
def score_powder(powder_data: dict) -> int:
    score = 0

    # Source tier (40 points max)
    source = powder_data.get("data_source", "manual")
    source_scores = {
        "grt_community": 30,   # GRT community DB (crowd-validated)
        "manufacturer": 40,     # Manufacturer tech sheet
        "manual": 10,           # User-entered
        "estimated": 5,         # Derived/estimated values
    }
    score += source_scores.get(source, 5)

    # 3-curve completeness (30 points)
    three_curve_fields = ["ba", "bp", "br", "brp", "z1", "z2"]
    present = sum(1 for f in three_curve_fields if powder_data.get(f) is not None)
    score += int((present / len(three_curve_fields)) * 30)

    # Core thermodynamic completeness (20 points)
    core_fields = ["force_constant_j_kg", "covolume_m3_kg", "flame_temp_k",
                   "gamma", "density_g_cm3"]
    core_present = sum(1 for f in core_fields
                       if powder_data.get(f) and powder_data[f] > 0)
    score += int((core_present / len(core_fields)) * 20)

    # Has GRT raw params stored (10 points)
    if powder_data.get("grt_params"):
        score += 10

    return min(100, score)
```

**Scoring formula for bullets:**

```python
def score_bullet(bullet_data: dict) -> int:
    score = 0

    # Source tier (40 points)
    source = bullet_data.get("data_source", "manual")
    source_scores = {
        "manufacturer": 40, "community": 25, "manual": 10, "estimated": 5
    }
    score += source_scores.get(source, 5)

    # Has both G1 and G7 BC (20 points)
    if bullet_data.get("bc_g1") and bullet_data.get("bc_g7"):
        score += 20
    elif bullet_data.get("bc_g1") or bullet_data.get("bc_g7"):
        score += 10

    # Physical dimensions complete (20 points)
    dim_fields = ["weight_grains", "diameter_mm", "length_mm", "sectional_density"]
    dims = sum(1 for f in dim_fields
               if bullet_data.get(f) and bullet_data[f] > 0)
    score += int((dims / len(dim_fields)) * 20)

    # Material specified (10 points)
    if bullet_data.get("material") and bullet_data["material"] != "unknown":
        score += 10

    # Bullet type classified (10 points)
    if bullet_data.get("bullet_type"):
        score += 10

    return min(100, score)
```

### Pattern 4: JSON Fixture Seed Data

**What:** Replace the current Python dict arrays in `initial_data.py` with JSON fixture files loaded from `backend/app/seed/fixtures/`. The seed function reads JSON, validates through Pydantic schemas, runs quality scoring, and bulk-inserts.

**Why JSON over Python dicts:** JSON fixtures can be generated programmatically (GRT XML parser output, web scraper output), version-controlled as data files, and validated independently. Python dicts require code changes to add data. With 500+ bullets, embedding data in Python source is unmaintainable.

**Why fixtures over migration-based seed:** Migrations are for schema changes. Data seeding is a separate concern that should be idempotent and re-runnable. The current `seed_initial_data()` pattern in the lifespan event is correct -- it checks if data exists and skips if so. JSON fixtures extend this pattern cleanly.

**Structure:**

```
backend/app/seed/
  fixtures/
    powders.json       # 200+ powders (initially from GRT community DB conversion)
    bullets.json       # 500+ bullets (from manufacturer spec sheets)
    cartridges.json    # 50+ cartridges (from CIP/SAAMI standards)
  initial_data.py      # Modified to load from fixtures/
```

**Fixture format (bullets.json example):**

```json
[
  {
    "name": "Sierra 168gr HPBT MatchKing .308",
    "manufacturer": "Sierra",
    "weight_grains": 168.0,
    "diameter_mm": 7.82,
    "length_mm": 31.2,
    "bc_g1": 0.462,
    "bc_g7": 0.218,
    "sectional_density": 0.253,
    "material": "copper",
    "bullet_type": "HPBT",
    "data_source": "manufacturer"
  }
]
```

### Pattern 5: Batch Import Pipeline

**What:** A shared import service handles batch operations for all component types: parse input, validate each record, check for duplicates, score quality, bulk-insert.

**Why a shared service, not per-endpoint logic:** The GRT import endpoint in `powders.py` already has 70 lines of inline import logic (pre-fetch existing, loop, convert, dedup, commit). Duplicating this for bullets and cartridges creates maintenance burden. Extract to a reusable service.

**Pipeline stages:**

```
Input (JSON/XML/CSV)
    |
    v
1. Parse -> list[dict]           # Format-specific parser (GRT XML, JSON fixture, CSV)
    |
    v
2. Validate -> list[SchemaType]  # Pydantic schema validation, reject invalid
    |
    v
3. Dedup -> list[SchemaType]     # Match on name (case-insensitive), report collisions
    |
    v
4. Score -> list[SchemaType]     # Compute quality_score for each record
    |
    v
5. Insert -> ImportResult        # Bulk insert, return created/skipped/errors
```

**Implementation:**

```python
# backend/app/services/import_service.py
from dataclasses import dataclass

@dataclass
class ImportResult:
    created: int
    updated: int
    skipped: list[str]
    errors: list[str]

async def batch_import(
    db: AsyncSession,
    model_class,
    records: list[dict],
    scorer_fn,
    overwrite: bool = False,
    match_field: str = "name",
) -> ImportResult:
    """Generic batch import with dedup and quality scoring."""
    # 1. Pre-fetch existing by match_field for O(1) lookup
    existing_query = select(model_class)
    existing_result = await db.execute(existing_query)
    existing_map = {
        getattr(r, match_field).lower(): r
        for r in existing_result.scalars().all()
    }

    created, updated, skipped, errors = 0, 0, [], []

    for record in records:
        # 2. Score quality
        record["quality_score"] = scorer_fn(record)

        # 3. Check duplicate
        key = record.get(match_field, "").lower()
        if key in existing_map:
            if overwrite:
                existing = existing_map[key]
                for k, v in record.items():
                    setattr(existing, k, v)
                updated += 1
            else:
                skipped.append(record.get(match_field, "unknown"))
            continue

        # 4. Insert
        obj = model_class(**record)
        db.add(obj)
        existing_map[key] = obj
        created += 1

    if created or updated:
        await db.commit()

    return ImportResult(
        created=created, updated=updated, skipped=skipped, errors=errors
    )
```

## Data Flow Changes

### Current: Simple CRUD Flow

```
User -> Page Mount -> useQuery(['powders']) -> GET /powders
  -> SELECT * FROM powders ORDER BY name -> All rows -> Render full table
```

### Target: Paginated Search Flow

```
User types in search box -> Debounce 300ms -> useQuery(['powders', {q, page, filters}])
  -> GET /powders?q=varget&page=1&size=50
  -> SELECT * FROM powders
       WHERE name % 'varget'
       ORDER BY similarity(name, 'varget') DESC
       LIMIT 50 OFFSET 0
  -> Page of rows + total count
  -> Render table + pagination controls + quality badges
```

### Import Flow

```
User uploads .zip / .json -> POST /powders/import-grt (or /admin/import/bullets)
  -> Parse file (GRT XML parser, or JSON loader)
  -> Validate each record through Pydantic schema
  -> Pre-fetch existing names for O(1) dedup
  -> Score quality for each record
  -> Bulk insert (skip or overwrite duplicates)
  -> Return ImportResult {created, updated, skipped, errors}
  -> Frontend shows summary dialog (reuses existing pattern from powders page)
  -> Invalidate query cache -> Re-fetch current page
```

## Database Schema Changes

### Migration 005: Component DB Expansion

```sql
-- Enable trigram extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- === POWDERS: Add metadata columns ===
ALTER TABLE powders ADD COLUMN data_source VARCHAR(20) DEFAULT 'manual';
ALTER TABLE powders ADD COLUMN quality_score INTEGER DEFAULT 50;
ALTER TABLE powders ADD COLUMN quality_detail JSONB;
ALTER TABLE powders ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE powders ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- === BULLETS: Add metadata + type columns ===
ALTER TABLE bullets ADD COLUMN bullet_type VARCHAR(30);
ALTER TABLE bullets ADD COLUMN bearing_surface_mm FLOAT;
ALTER TABLE bullets ADD COLUMN data_source VARCHAR(20) DEFAULT 'manual';
ALTER TABLE bullets ADD COLUMN quality_score INTEGER DEFAULT 50;
ALTER TABLE bullets ADD COLUMN caliber_family VARCHAR(20);
ALTER TABLE bullets ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE bullets ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- === CARTRIDGES: Add metadata + relationship columns ===
ALTER TABLE cartridges ADD COLUMN data_source VARCHAR(20) DEFAULT 'manual';
ALTER TABLE cartridges ADD COLUMN quality_score INTEGER DEFAULT 50;
ALTER TABLE cartridges ADD COLUMN shoulder_angle_deg FLOAT;
ALTER TABLE cartridges ADD COLUMN neck_diameter_mm FLOAT;
ALTER TABLE cartridges ADD COLUMN base_diameter_mm FLOAT;
ALTER TABLE cartridges ADD COLUMN rim_diameter_mm FLOAT;
ALTER TABLE cartridges ADD COLUMN cartridge_type VARCHAR(20);
ALTER TABLE cartridges ADD COLUMN parent_cartridge_id UUID REFERENCES cartridges(id);
ALTER TABLE cartridges ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE cartridges ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- === GIN INDEXES for pg_trgm fuzzy search ===
CREATE INDEX ix_powders_name_trgm ON powders USING gin (name gin_trgm_ops);
CREATE INDEX ix_powders_mfg_trgm ON powders USING gin (manufacturer gin_trgm_ops);
CREATE INDEX ix_bullets_name_trgm ON bullets USING gin (name gin_trgm_ops);
CREATE INDEX ix_bullets_mfg_trgm ON bullets USING gin (manufacturer gin_trgm_ops);
CREATE INDEX ix_cartridges_name_trgm ON cartridges USING gin (name gin_trgm_ops);

-- === B-tree indexes for filtered queries ===
CREATE INDEX ix_powders_quality ON powders (quality_score);
CREATE INDEX ix_bullets_caliber ON bullets (caliber_family);
CREATE INDEX ix_bullets_quality ON bullets (quality_score);
CREATE INDEX ix_bullets_mfg ON bullets (manufacturer);
CREATE INDEX ix_cartridges_quality ON cartridges (quality_score);

-- === Backfill existing data ===
UPDATE powders SET data_source = 'manual', quality_score = 50
  WHERE data_source IS NULL;
UPDATE bullets SET data_source = 'manual', quality_score = 50
  WHERE data_source IS NULL;
UPDATE cartridges SET data_source = 'manual', quality_score = 50
  WHERE data_source IS NULL;

-- Backfill caliber_family for existing bullets based on diameter
UPDATE bullets SET caliber_family = '.224'
  WHERE diameter_mm BETWEEN 5.5 AND 5.8;
UPDATE bullets SET caliber_family = '.264'
  WHERE diameter_mm BETWEEN 6.5 AND 6.8;
UPDATE bullets SET caliber_family = '.308'
  WHERE diameter_mm BETWEEN 7.7 AND 7.9;
UPDATE bullets SET caliber_family = '.338'
  WHERE diameter_mm BETWEEN 8.5 AND 8.7;
```

### Backward Compatibility

All new columns are nullable or have defaults. No existing data is lost. No API contract changes for existing fields. The list endpoints gain optional query params but still work with no params (returning paginated results with default page=1, size=50).

The `PaginatedResponse<T>` type already exists in `frontend/src/lib/types.ts` (line 267-273) but is unused. It becomes the standard response wrapper for all list endpoints.

## New Column Summary Per Model

### Powder (5 new columns)

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `data_source` | VARCHAR(20) | 'manual' | Provenance: manual, grt_community, manufacturer, estimated |
| `quality_score` | INTEGER | 50 | Computed 0-100 confidence |
| `quality_detail` | JSONB | null | Breakdown of score components for tooltip |
| `created_at` | TIMESTAMPTZ | NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOW() | Last modification timestamp |

### Bullet (7 new columns)

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `bullet_type` | VARCHAR(30) | null | HPBT, FMJ, OTM, VLD, SP, etc. |
| `bearing_surface_mm` | FLOAT | null | Bearing surface length for engraving calc |
| `data_source` | VARCHAR(20) | 'manual' | Provenance tracking |
| `quality_score` | INTEGER | 50 | Computed 0-100 confidence |
| `caliber_family` | VARCHAR(20) | null | Grouping: .224, .264, .308, .338 etc. |
| `created_at` | TIMESTAMPTZ | NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOW() | Last modification timestamp |

### Cartridge (10 new columns)

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `data_source` | VARCHAR(20) | 'manual' | Provenance tracking |
| `quality_score` | INTEGER | 50 | Computed 0-100 confidence |
| `shoulder_angle_deg` | FLOAT | null | CIP/SAAMI spec dimension |
| `neck_diameter_mm` | FLOAT | null | CIP/SAAMI spec dimension |
| `base_diameter_mm` | FLOAT | null | CIP/SAAMI spec dimension |
| `rim_diameter_mm` | FLOAT | null | CIP/SAAMI spec dimension |
| `cartridge_type` | VARCHAR(20) | null | rimless, belted, rimmed, rebated |
| `parent_cartridge_id` | UUID FK | null | Self-referencing for wildcat lineage |
| `created_at` | TIMESTAMPTZ | NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOW() | Last modification timestamp |

## Frontend Architecture Changes

### Pagination Strategy: Server-Side with keepPreviousData

Do NOT use TanStack Virtual / windowed scrolling. At 500 bullets with server-side pagination (50 per page = 10 pages), standard DOM rendering is fast. Virtualization adds complexity (TanStack Virtual dependency, row height management, scroll position) that is not justified at this scale.

Use TanStack Query's `keepPreviousData` (via `placeholderData: keepPreviousData`) for smooth page transitions where the previous page's data stays visible while the next page loads.

### Search UX: Debounced Input with URL Sync

```
SearchInput (300ms debounce) -> URL query params (?q=&page=&mfg=)
  -> useQuery(['powders', params]) re-fetches
  -> Table re-renders with server results
  -> Pagination resets to page 1 on new search
```

URL-synced search means users can bookmark/share filtered views and browser back/forward works correctly.

### Quality Badge Component

```typescript
// frontend/src/components/ui/QualityBadge.tsx
function QualityBadge({ score }: { score: number }) {
  if (score >= 80) return <Badge variant="success">Alta</Badge>;
  if (score >= 50) return <Badge variant="warning">Media</Badge>;
  return <Badge variant="danger">Baja</Badge>;
}
```

Reuses existing `<Badge>` component (already has success/warning/danger variants). No new UI library needed.

### No New Frontend Dependencies Required

| Need | Solution | Why Not Add Library |
|------|----------|---------------------|
| Pagination UI | Custom `<Pagination>` component | Simple prev/next/page buttons with Tailwind |
| Search input | Custom `<SearchInput>` with `setTimeout` debounce | 10 lines of code vs adding lodash/use-debounce |
| Filter dropdowns | Custom `<FilterDropdown>` | Existing Tailwind dropdown patterns |
| Quality badges | Existing `<Badge>` component | Already has success/warning/danger variants |

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Search on Large Lists

**What people do:** Fetch all 500 bullets, filter with `array.filter()` in the component.
**Why it is wrong:** Every keystroke re-renders 500 rows. Initial fetch sends 500 objects over the wire. Memory grows linearly with database.
**Do this instead:** Server-side search with pg_trgm. Frontend only ever holds one page (50 items).

### Anti-Pattern 2: Separate Quality Table

**What people do:** Create a `component_quality` join table with FK to powder/bullet/cartridge.
**Why it is wrong:** Adds a JOIN to every list query. Quality is 1:1 with the component, not a separate entity. Complicates the import pipeline.
**Do this instead:** Inline `quality_score` INTEGER column directly on each component table. Recompute on import/update. Store breakdown in `quality_detail` JSONB for debugging.

### Anti-Pattern 3: Overwriting User Data on Bulk Import

**What people do:** Bulk import blindly overwrites all matching records.
**Why it is wrong:** Users may have manually corrected values (custom covolume, calibrated burn rate). Overwriting destroys their work.
**Do this instead:** Default to skip-if-exists. Offer explicit overwrite option with collision list UI (the existing GRT import pattern in `powders.py` already does this correctly -- extend to all import types).

### Anti-Pattern 4: Using Full-Text Search for Component Names

**What people do:** Set up `tsvector` columns, `to_tsquery`, and text search configurations.
**Why it is wrong:** Component names are short identifiers, not natural language documents. Full-text search applies stemming ("bullets" matches "bullet" but "168gr" does not match "168 grain"). Trigram search handles partial matches ("168" matches "168gr HPBT") and typo tolerance ("hodgon" matches "Hodgdon").
**Do this instead:** pg_trgm with GIN indexes. Simpler setup, better results for this data shape.

### Anti-Pattern 5: Virtualizing Tables at This Scale

**What people do:** Add TanStack Virtual or react-window for 500-row tables.
**Why it is wrong:** Server-side pagination means the DOM never holds more than 50 rows. Virtualization adds scroll-position management complexity, makes Ctrl+F unreliable, and breaks accessibility for screen readers.
**Do this instead:** Server-side pagination with 50 items per page. Standard DOM rendering handles 50 table rows trivially.

## Build Order (Dependency-Driven)

### Phase 1: Backend Foundation (no frontend changes)

**Dependencies: None (pure backend, can be deployed independently)**

1. **Alembic migration 005** -- schema changes, pg_trgm extension, GIN indexes, backfill existing data
2. **Pagination service** -- `backend/app/services/pagination.py`
3. **Search service** -- `backend/app/services/search.py`
4. **Quality scorer** -- `backend/app/services/quality_scorer.py`
5. **Update models** -- Add new columns to powder.py, bullet.py, cartridge.py
6. **Update schemas** -- Add new fields to response schemas, add paginated response wrappers
7. **Update list endpoints** -- Add pagination + search + filter params to GET /powders, /bullets, /cartridges

**Verification:** Existing tests pass. New endpoints return paginated JSON. `curl` with `?q=varget` returns filtered results. Default (no params) returns first page of 50.

### Phase 2: Import Pipeline + Seed Data

**Dependencies: Phase 1 (schema must have new columns for data_source, quality_score)**

1. **Import service** -- `backend/app/services/import_service.py` (shared batch validate/dedup/insert)
2. **Create fixtures directory** -- `backend/app/seed/fixtures/`
3. **Generate powder fixtures** -- Convert GRT community DB XML to JSON using existing `grt_parser.py` + `grt_converter.py`
4. **Curate bullet fixtures** -- Compile 500+ bullets from manufacturer spec PDFs into JSON
5. **Curate cartridge fixtures** -- Compile 50+ cartridges from CIP/SAAMI specs into JSON
6. **Update seed loader** -- Modify `initial_data.py` to load from fixtures + score quality
7. **Bullet import endpoint** -- POST /admin/import/bullets
8. **Cartridge import endpoint** -- POST /admin/import/cartridges
9. **Refactor GRT import** -- Move inline logic from `powders.py` to use shared import service

**Verification:** Fresh `docker-compose up` seeds 200+ powders, 500+ bullets, 50+ cartridges. All have quality scores. Import endpoints handle collisions correctly.

### Phase 3: Frontend Integration

**Dependencies: Phase 1 (paginated API must exist for hooks to consume)**

1. **Update types.ts** -- Add quality/source fields, update PaginatedResponse usage
2. **Update api.ts** -- Add search/filter/pagination params to get functions
3. **SearchInput component** -- Debounced input with clear button
4. **QualityBadge component** -- Score-to-badge mapping (uses existing Badge)
5. **Pagination component** -- Page navigation controls
6. **FilterDropdown component** -- Multi-select for manufacturer/caliber
7. **Update hooks** -- usePowders/useBullets/useCartridges with parameterized queries
8. **Update /powders page** -- Search bar, filters, paginated table, quality badges
9. **Update /bullets page** -- Search bar, caliber filter, paginated table
10. **Update /cartridges page** -- Search bar, filter, paginated table

**Verification:** Pages load fast with 500+ items. Search returns results in <200ms. Pagination works. Quality badges display. Browser back/forward preserves search state.

### Phase 4: Testing and Polish

**Dependencies: Phases 1-3**

1. **Backend tests** -- Pagination edge cases, search accuracy, import dedup, quality scoring
2. **Migration test** -- Verify migration runs cleanly on fresh DB and on existing DB with data
3. **Import pipeline tests** -- Batch import with collisions, invalid records, overwrite mode
4. **Frontend smoke tests** -- Search, paginate, filter on each component page

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (22 powders, 10 bullets) | No changes needed, current flat list works |
| Target (200 powders, 500 bullets, 50 cartridges) | Server-side pagination + pg_trgm. This is the sweet spot. |
| Future (2000+ powders, 5000 bullets via community) | Add cursor-based pagination, consider Elasticsearch if pg_trgm becomes bottleneck. Current GIN indexes handle 10K rows easily. |

**First bottleneck:** The parametric search endpoint (`POST /simulate/parametric`) iterates ALL powders. At 200+ powders this could take 20+ seconds. This is pre-existing and not worsened by this milestone, but should be noted. A future optimization would filter to compatible powders before simulating.

## Sources

- [PostgreSQL pg_trgm documentation](https://www.postgresql.org/docs/12/pgtrgm.html)
- [Crunchy Data: Postgres Full-Text Search](https://www.crunchydata.com/blog/postgres-full-text-search-a-search-engine-in-a-database)
- [Performant text searching in PSQL: trigrams vs full text search](https://medium.com/@daniel.tooke/performant-text-searching-and-indexes-in-psql-trigrams-like-and-full-text-search-784c000efaa6)
- [SQLAlchemy pg_trgm discussion](https://github.com/sqlalchemy/sqlalchemy/discussions/7641)
- [TanStack Table pagination guide](https://tanstack.com/table/v8/docs/guide/pagination)
- [TanStack Virtual](https://tanstack.com/virtual/latest) (evaluated but rejected for this scale)
- [Staging tables for faster bulk upserts with PostgreSQL](https://overflow.no/blog/2025/1/5/using-staging-tables-for-faster-bulk-upserts-with-python-and-postgresql/)
- [SQLAlchemy 2.0 bulk insert patterns](https://docs.sqlalchemy.org/en/20/_modules/examples/performance/bulk_inserts.html)
- [GRT propellant file format](https://grtools.de/doku.php?id=en:doku:file_propellant)
- [GRT community databases on GitHub](https://github.com/zen/grt_databases)

---
*Architecture research for: Component Database Integration into Ballistics Simulator*
*Researched: 2026-02-21*
