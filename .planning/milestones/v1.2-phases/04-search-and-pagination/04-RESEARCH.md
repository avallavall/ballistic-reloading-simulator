# Phase 4: Search and Pagination - Research

**Researched:** 2026-02-21
**Domain:** PostgreSQL pg_trgm fuzzy search, server-side pagination, multi-field filtering via FastAPI/SQLAlchemy async
**Confidence:** HIGH

## Summary

Phase 4 adds server-side pagination, pg_trgm fuzzy text search, and multi-field filtering to the component list endpoints (powders, bullets, cartridges). This is a **backend-only** phase -- the frontend picker modals and pagination UI are Phase 6 (SRC-04, SRC-05). The scope is: modify existing `GET /powders`, `GET /bullets`, `GET /cartridges` endpoints to accept query parameters for search, filtering, and pagination, returning a `{items, total, page, size}` envelope instead of a raw array.

The core technical approach is well-established: PostgreSQL's built-in `pg_trgm` extension with GIN indexes for sub-millisecond fuzzy matching on component names/manufacturers, SQLAlchemy 2.0 query composition for filter chaining, and offset/limit pagination with total count. No new dependencies are required -- everything uses the existing stack (FastAPI 0.115.6, SQLAlchemy 2.0.36, asyncpg 0.30.0, PostgreSQL 16).

A critical prerequisite gap exists: **bullets and cartridges lack `quality_score` and `data_source` columns** (only powders have them from Phase 3). The CONTEXT.md requires quality level filtering on all three entities. Phase 4 must add these columns to bullets/cartridges via Alembic migration before implementing quality filters. Additionally, bullets need a `caliber_family` column for caliber-based filtering per the CONTEXT.md decisions. The rifles endpoint is **excluded** from this phase per the CONTEXT.md boundary statement.

**Primary recommendation:** Modify existing list endpoints in-place (not separate /search routes) with backward-compatible optional query parameters. Existing frontend code that calls `GET /powders` with no params will still work -- it receives the first page of results wrapped in `{items, total, page, size}` instead of a raw array. The frontend hooks must be updated to unwrap `.items` from the response, which is a minimal change.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Default page size: 50 items
- Maximum page size cap: 200 items (reject requests above this)
- Default sort order: quality score descending (best-validated records first)
- Sort is user-configurable via query params: `?sort=name|manufacturer|quality_score&order=asc|desc`
- Fuzzy search matches against name + manufacturer fields (not all text fields)
- Minimum query length: 3 characters (below this, return unfiltered results or error)
- Search uses pg_trgm extension for typo tolerance
- Powders: filter by manufacturer and burn rate range -- NO caliber filter (powders are caliber-agnostic)
- Bullets and cartridges: filter by caliber family grouping
- Quality filter: dual mode -- quick filter by badge tier (green/yellow/red) AND optional minimum score threshold
- Manufacturer list: derived dynamically from existing records (SELECT DISTINCT), no hardcoded list
- Phase boundary: Backend API layer only. Frontend integration (picker modals, pagination UI) is Phase 6.

### Claude's Discretion
- Search result ranking strategy (similarity score, tie-breaking with quality, etc.)
- Similarity threshold cutoff vs return-all-ranked approach for pg_trgm
- Paginated response envelope format (JSON body vs headers for metadata)
- Whether search + filter + pagination compose freely (AND logic) or search overrides filters
- Whether to modify existing GET endpoints in-place or create separate /search routes
- Backward compatibility strategy with existing frontend code (minimize rework before Phase 6)
- Caliber family grouping approach for bullets/cartridges (bore diameter ranges vs named groups)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SRC-01 | All component list endpoints support server-side pagination (page, size params) with total count | Pagination helper pattern using `SELECT count(*) + LIMIT/OFFSET` on SQLAlchemy async queries. Per-entity paginated response schemas. Modify existing GET endpoints in-place with optional `page` and `size` query params. |
| SRC-02 | User can fuzzy-search components by name using pg_trgm (handles typos like "hodgon" -> "Hodgdon") | `CREATE EXTENSION IF NOT EXISTS pg_trgm` in Alembic migration. GIN indexes on name+manufacturer columns. SQLAlchemy `model.name.op("%")(search_term)` for trigram match. `func.similarity()` for ranking. Return-all-ranked approach (no hard threshold cutoff). |
| SRC-03 | User can filter components by manufacturer, caliber/caliber family, and quality level | Dynamic manufacturer list via `SELECT DISTINCT manufacturer`. Caliber family column on bullets (computed from `diameter_mm` ranges). Quality filter by badge tier mapping (`success`>=70, `warning`>=40, `danger`<40) or explicit `min_quality` integer. All filters compose via AND logic with search and pagination. |
</phase_requirements>

## Standard Stack

### Core (No New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL pg_trgm | Built-in (PG 16) | Trigram fuzzy text matching | Ships with PostgreSQL, no install. GIN index support for sub-ms queries on 500+ rows. Handles typos, partial matches, transpositions. |
| SQLAlchemy | 2.0.36 | Query composition for search/filter/pagination | Already in requirements.txt. `select()`, `.where()`, `.order_by()`, `.offset()`, `.limit()` chain naturally for composable queries. `func.similarity()` and `.op("%")` expose pg_trgm operators. |
| FastAPI Query() | 0.115.6 | Validated query parameters | `Query(default, ge=, le=)` validates pagination params at the framework level before handler code runs. |
| Pydantic v2 | 2.10.4 | Paginated response schemas | Per-entity response models (not `Generic[T]`) for FastAPI OpenAPI schema generation compatibility. |
| Alembic | 1.14.1 | Migration for pg_trgm, indexes, new columns | Existing async migration setup. `op.execute()` for raw SQL extension/index creation. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pg_trgm | Elasticsearch | Overkill for 750 records. Adds Docker service, sync complexity, operational overhead. pg_trgm handles this volume in microseconds. Explicitly out of scope per REQUIREMENTS.md. |
| pg_trgm | PostgreSQL full-text search (tsvector) | Wrong tool. Component names are short identifiers, not natural language documents. tsvector stemming would mangle "168gr HPBT". Trigram matching is purpose-built for short string fuzzy search. |
| Offset/limit pagination | Cursor-based (keyset) pagination | Cursor pagination is better for infinite scroll and avoids page drift on concurrent inserts. But offset/limit is simpler, matches the `page`/`size` API contract, and is fine for datasets under 10K rows. |
| Per-entity response schemas | Generic[T] Pydantic model | FastAPI's OpenAPI schema generator produces better docs with concrete classes. Generic models work but show `PaginatedResponse[PowderResponse]` as opaque in Swagger UI. |
| Modify existing endpoints | Separate /search routes | In-place modification is cleaner -- one endpoint per resource. Adding `?q=` and `?page=` as optional params is backward-compatible (no params = first page, all items up to 50). Separate routes fragment the API surface. |

### Installation

No new packages required:

```bash
# Backend -- no changes to requirements.txt
pip install -r requirements.txt

# Frontend -- no changes to package.json
npm install
```

The only infrastructure change is enabling the pg_trgm extension in PostgreSQL, done via Alembic migration.

## Architecture Patterns

### Recommended Project Structure Changes

```
backend/app/
├── api/
│   ├── powders.py       # MODIFIED: add pagination, search, filter query params
│   ├── bullets.py       # MODIFIED: add pagination, search, filter query params
│   └── cartridges.py    # MODIFIED: add pagination, search, filter query params
├── services/
│   ├── pagination.py    # NEW: reusable paginate() helper
│   └── search.py        # NEW: reusable apply_fuzzy_search() helper
├── schemas/
│   ├── powder.py        # MODIFIED: add PaginatedPowderResponse
│   ├── bullet.py        # MODIFIED: add PaginatedBulletResponse + quality fields
│   ├── cartridge.py     # MODIFIED: add PaginatedCartridgeResponse + quality fields
│   └── pagination.py    # NEW: base pagination schemas (optional, or inline)
├── models/
│   ├── bullet.py        # MODIFIED: add quality_score, data_source, caliber_family
│   └── cartridge.py     # MODIFIED: add quality_score, data_source
└── db/migrations/versions/
    └── 006_search_and_pagination.py  # NEW: pg_trgm, GIN indexes, bullet/cartridge columns
```

### Pattern 1: Reusable Pagination Helper

**What:** A single async function that wraps any SQLAlchemy query with count + offset/limit.
**When to use:** Every list endpoint that needs pagination.
**Example:**

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
    # Count total matching rows
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Fetch current page
    offset = (page - 1) * size
    result = await db.execute(query.offset(offset).limit(size))
    items = list(result.scalars().all())

    return PaginatedResult(items=items, total=total, page=page, size=size)
```

**Source:** Direct SQLAlchemy 2.0 async patterns. Verified from existing codebase usage of `select()`, `scalars().all()`.

### Pattern 2: Composable Fuzzy Search

**What:** A function that applies pg_trgm similarity matching on name + manufacturer columns, with ranking by similarity score.
**When to use:** When `q` query parameter is provided with length >= 3.
**Example:**

```python
# backend/app/services/search.py
from sqlalchemy import or_, func, case

def apply_fuzzy_search(query, model, search_term: str):
    """Apply pg_trgm fuzzy search on name and manufacturer fields.

    Uses % operator for trigram matching (GIN-indexed) with
    similarity() for result ranking. Falls back to ILIKE for
    very short terms.
    """
    return query.where(
        or_(
            model.name.op("%")(search_term),
            model.manufacturer.op("%")(search_term),
        )
    ).order_by(
        # Primary: similarity to name (most relevant)
        func.similarity(model.name, search_term).desc(),
        # Tie-break: quality score (best-validated first)
        model.quality_score.desc(),
    )
```

**Key decisions embedded:**
- **Return-all-ranked, no threshold cutoff.** The `%` operator in pg_trgm uses a default similarity threshold of 0.3 (configurable via `SET pg_trgm.similarity_threshold`). This provides natural filtering -- strings below 0.3 similarity are excluded. No need for a custom cutoff.
- **Tie-breaking with quality_score.** When two results have equal name similarity (e.g., "Hodgdon Varget" and "Hodgdon H4350" for query "Hodgdon"), the higher-quality record appears first.
- **AND composition with filters.** When both `q=` and filters are provided, search narrows the filtered set. The `.where()` calls chain naturally in SQLAlchemy.

### Pattern 3: Modified List Endpoint (In-Place)

**What:** Modify existing `GET /powders` to accept optional query parameters. No params = first page, sorted by quality_score descending.
**Example:**

```python
from fastapi import Query

@router.get("", response_model=PaginatedPowderResponse)
async def list_powders(
    q: str | None = Query(None, min_length=3, description="Fuzzy search on name/manufacturer"),
    manufacturer: str | None = Query(None, description="Filter by manufacturer (exact, from DISTINCT list)"),
    burn_rate_min: float | None = Query(None, ge=0, description="Min burn rate relative"),
    burn_rate_max: float | None = Query(None, le=500, description="Max burn rate relative"),
    quality_level: str | None = Query(None, description="Filter by badge tier: success/warning/danger"),
    min_quality: int | None = Query(None, ge=0, le=100, description="Min quality score threshold"),
    sort: str = Query("quality_score", description="Sort field: name|manufacturer|quality_score"),
    order: str = Query("desc", description="Sort order: asc|desc"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=200, description="Items per page (max 200)"),
    db: AsyncSession = Depends(get_db),
):
    query = select(Powder)

    # Fuzzy search (pg_trgm)
    if q:
        query = apply_fuzzy_search(query, Powder, q)

    # Filters (AND composition)
    if manufacturer:
        query = query.where(Powder.manufacturer == manufacturer)
    if burn_rate_min is not None:
        query = query.where(Powder.burn_rate_relative >= burn_rate_min)
    if burn_rate_max is not None:
        query = query.where(Powder.burn_rate_relative <= burn_rate_max)
    if quality_level:
        tier_map = {"success": 70, "warning": 40, "danger": 0}
        tier_max = {"success": 100, "warning": 69, "danger": 39}
        query = query.where(Powder.quality_score >= tier_map.get(quality_level, 0))
        query = query.where(Powder.quality_score <= tier_max.get(quality_level, 100))
    if min_quality is not None:
        query = query.where(Powder.quality_score >= min_quality)

    # Sort (only if not already sorted by search relevance)
    if not q:
        sort_col = getattr(Powder, sort, Powder.quality_score)
        query = query.order_by(sort_col.desc() if order == "desc" else sort_col.asc())

    return await paginate(db, query, page, size)
```

### Pattern 4: Dynamic Manufacturer List Endpoint

**What:** A small endpoint returning distinct manufacturers for filter dropdowns.
**When to use:** Frontend needs to populate manufacturer filter options without hardcoding.
**Example:**

```python
@router.get("/manufacturers", response_model=list[str])
async def list_powder_manufacturers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Powder.manufacturer).distinct().order_by(Powder.manufacturer)
    )
    return [r[0] for r in result.all()]
```

### Pattern 5: Caliber Family Grouping (Bore Diameter Ranges)

**What:** A VARCHAR column `caliber_family` on the Bullet model, computed from `diameter_mm` during creation and backfilled for existing records.
**Approach:** Named caliber families based on bore diameter ranges.

```python
# Caliber family derivation
CALIBER_FAMILIES = {
    ".224": (5.5, 5.8),    # .223 Rem, .22-250, 5.56mm
    ".243": (6.1, 6.3),    # .243 Win, 6mm Creedmoor
    ".264": (6.5, 6.8),    # 6.5 Creedmoor, .260 Rem, 6.5x55
    ".284": (7.0, 7.3),    # 7mm Rem Mag, .280 Rem
    ".308": (7.7, 7.9),    # .308 Win, .30-06, .300 WM
    ".338": (8.5, 8.7),    # .338 Lapua, .338 Win Mag
    ".375": (9.5, 9.6),    # .375 H&H
    ".408": (10.3, 10.4),  # .408 CheyTac
    ".416": (10.5, 10.7),  # .416 Rigby, .416 Barrett
    ".458": (11.5, 11.7),  # .45-70, .458 Win Mag
    ".510": (12.9, 13.1),  # .50 BMG
}

def derive_caliber_family(diameter_mm: float) -> str | None:
    for family, (lo, hi) in CALIBER_FAMILIES.items():
        if lo <= diameter_mm <= hi:
            return family
    return None
```

**Trade-off vs named groups:** Bore diameter ranges are deterministic and don't require manual mapping. The granularity covers all common calibers. Edge cases (wildcat cartridges with unusual bore diameters) return `None` and are visible in unfiltered views.

### Anti-Patterns to Avoid

- **Loading all records and filtering in Python:** The current `list_powders` returns `select(Powder).order_by(Powder.name)` with no pagination. At 200+ powders this works but at 500+ bullets it will cause latency. Always push search/filter/pagination to the database.
- **Generic[T] for FastAPI response_model:** Pydantic v2 supports generics, but FastAPI's OpenAPI schema generator produces cleaner docs with concrete classes like `PaginatedPowderResponse` than with `PaginatedResponse[PowderResponse]`.
- **Hardcoding manufacturer lists:** The CONTEXT.md explicitly says "derived dynamically from existing records (SELECT DISTINCT), no hardcoded list." Any hardcoded list would need manual maintenance as new powders/bullets are imported.
- **Separate /search endpoint alongside /list:** Fragments the API surface. One endpoint with optional params is cleaner and more RESTful.
- **Client-side pg_trgm threshold tuning:** The default 0.3 threshold is well-tuned for component names. Changing `pg_trgm.similarity_threshold` per-session adds complexity for negligible benefit.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy text matching | Levenshtein in Python, ILIKE with wildcards | pg_trgm `%` operator + GIN index | GIN indexes give sub-ms performance. Python-side fuzzy matching loads all records first. ILIKE doesn't handle typos (character transpositions, missing chars). |
| Pagination total count | Two separate queries (manual count, then data) | Single `paginate()` helper wrapping `func.count()` + `offset/limit` | Encapsulates the count+fetch pattern. Avoids copy-pasting in every endpoint. |
| Manufacturer dropdown values | Hardcoded list, config file, or separate table | `SELECT DISTINCT manufacturer` on the entity table | Self-maintaining. New imports automatically appear in dropdown. No sync issues. |
| Caliber grouping | Manual mapping table in separate DB table | Derived column from `diameter_mm` ranges | Deterministic, no maintenance, covers all standard calibers. Stored as a column for indexing. |

**Key insight:** The pg_trgm extension does the heavy lifting. The application layer's job is query composition (chaining filters) and response formatting (pagination envelope). Don't try to replicate database-level text matching in application code.

## Common Pitfalls

### Pitfall 1: Breaking Existing Frontend on Response Shape Change

**What goes wrong:** Changing `GET /powders` from returning `list[PowderResponse]` to `{items: [...], total: N, page: N, size: N}` breaks every frontend component that does `const powders = data` instead of `const powders = data.items`.
**Why it happens:** The response shape is a breaking API contract change.
**How to avoid:** Since Phase 4 is backend-only and Phase 6 handles frontend, the frontend hooks MUST be minimally updated to unwrap `.items` from the paginated response. The `PaginatedResponse<T>` type already exists in `frontend/src/lib/types.ts` (line 296-301) but is unused. The `api.ts` functions (`getPowders`, `getBullets`, `getCartridges`) must be updated to return `PaginatedResponse<T>` and the hooks must unwrap `.items`.
**Warning signs:** Frontend pages showing empty tables or TypeScript errors after backend deployment.

### Pitfall 2: pg_trgm Not Available in aiosqlite Test Environment

**What goes wrong:** The test suite uses `aiosqlite://` (SQLite in-memory) for API integration tests. pg_trgm is PostgreSQL-specific -- `similarity()`, `%` operator, and GIN indexes don't exist in SQLite.
**Why it happens:** The test infrastructure was set up for simplicity (no PostgreSQL required for CI).
**How to avoid:** Two strategies:
1. **Skip search-specific tests** in the SQLite test suite with `@pytest.mark.skipif` or a custom marker.
2. **Add a PostgreSQL integration test marker** for tests that exercise pg_trgm features, runnable only when a PostgreSQL instance is available.
3. **For pagination-only tests** (no search), the SQLite backend works fine -- `LIMIT/OFFSET` and `COUNT` are standard SQL.
**Warning signs:** `OperationalError: no such function: similarity` in test output.

### Pitfall 3: N+1 Query for Total Count

**What goes wrong:** Naive implementation runs the filtered query twice -- once for count, once for data -- with the full filter chain duplicated.
**Why it happens:** Copy-pasting the query construction instead of using a reusable helper.
**How to avoid:** The `paginate()` helper takes a pre-built query and wraps it with `select(func.count()).select_from(query.subquery())` for the count. The query is built once, used twice.
**Warning signs:** Duplicate filter logic in the same endpoint function.

### Pitfall 4: Search Overriding Sort Order

**What goes wrong:** When `q=` is provided, results should be sorted by similarity. When `q=` is not provided, results should use the `sort=` parameter (defaulting to `quality_score desc`). If the sort logic doesn't check whether search is active, results may be mis-ordered.
**Why it happens:** Both search ranking and sort ordering use `.order_by()`, and only one should be active.
**How to avoid:** Apply `order_by(func.similarity(...).desc())` only when `q` is provided. Apply the user's `sort`/`order` params only when `q` is absent. This makes the behavior clear: search mode ranks by relevance, browse mode sorts by user preference.
**Warning signs:** Searching "varget" returns results in alphabetical order instead of relevance order.

### Pitfall 5: Missing Quality Columns on Bullets/Cartridges

**What goes wrong:** Phase 4 requires filtering by quality level (SRC-03), but bullets and cartridges currently lack `quality_score` and `data_source` columns. Attempting to filter on a nonexistent column causes a database error.
**Why it happens:** Phase 3 only added quality fields to powders. The REQUIREMENTS.md maps QLT-01 (all components display quality badges) to Phase 6, but SRC-03 (filter by quality) is Phase 4.
**How to avoid:** The Phase 4 Alembic migration must add `quality_score` (INTEGER, default 0) and `data_source` (VARCHAR(20), default 'manual') columns to both `bullets` and `cartridges` tables. These columns enable filtering even before the frontend displays them (Phase 6). Bullets also need `caliber_family` (VARCHAR(20), nullable) for caliber filtering.
**Warning signs:** SQL error on `WHERE quality_score >= 70` for bullets/cartridges.

### Pitfall 6: Alembic Migration Ordering

**What goes wrong:** The current latest migration is `005_quality_web_thickness` (revision `005_quality_web_thickness`). The new migration must correctly chain from this revision.
**Why it happens:** Alembic uses a linked list of revisions. A wrong `down_revision` causes migration failures.
**How to avoid:** Set `down_revision = "005_quality_web_thickness"` in the new migration file. Use revision ID `006_search_pagination` for clarity.
**Warning signs:** `alembic upgrade head` fails with "Can't find revision" error.

## Code Examples

### Alembic Migration: pg_trgm Extension + GIN Indexes + New Columns

```python
# backend/app/db/migrations/versions/006_search_and_pagination.py
"""Enable pg_trgm, add GIN indexes, add quality columns to bullets/cartridges

Revision ID: 006_search_pagination
Revises: 005_quality_web_thickness
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "006_search_pagination"
down_revision: Union[str, None] = "005_quality_web_thickness"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Enable pg_trgm extension
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # Add quality/metadata columns to bullets
    op.add_column("bullets", sa.Column("data_source", sa.String(20), nullable=False, server_default="manual"))
    op.add_column("bullets", sa.Column("quality_score", sa.Integer, nullable=False, server_default="0"))
    op.add_column("bullets", sa.Column("caliber_family", sa.String(20), nullable=True))

    # Add quality/metadata columns to cartridges
    op.add_column("cartridges", sa.Column("data_source", sa.String(20), nullable=False, server_default="manual"))
    op.add_column("cartridges", sa.Column("quality_score", sa.Integer, nullable=False, server_default="0"))

    # GIN indexes for pg_trgm fuzzy search
    op.execute("CREATE INDEX ix_powders_name_trgm ON powders USING gin (name gin_trgm_ops)")
    op.execute("CREATE INDEX ix_powders_mfg_trgm ON powders USING gin (manufacturer gin_trgm_ops)")
    op.execute("CREATE INDEX ix_bullets_name_trgm ON bullets USING gin (name gin_trgm_ops)")
    op.execute("CREATE INDEX ix_bullets_mfg_trgm ON bullets USING gin (manufacturer gin_trgm_ops)")
    op.execute("CREATE INDEX ix_cartridges_name_trgm ON cartridges USING gin (name gin_trgm_ops)")

    # B-tree indexes for filtered queries
    op.execute("CREATE INDEX ix_powders_quality ON powders (quality_score)")
    op.execute("CREATE INDEX ix_bullets_quality ON bullets (quality_score)")
    op.execute("CREATE INDEX ix_bullets_caliber ON bullets (caliber_family)")
    op.execute("CREATE INDEX ix_cartridges_quality ON cartridges (quality_score)")

    # Backfill caliber_family for existing bullets based on diameter
    op.execute("UPDATE bullets SET caliber_family = '.224' WHERE diameter_mm BETWEEN 5.5 AND 5.8")
    op.execute("UPDATE bullets SET caliber_family = '.243' WHERE diameter_mm BETWEEN 6.1 AND 6.3")
    op.execute("UPDATE bullets SET caliber_family = '.264' WHERE diameter_mm BETWEEN 6.5 AND 6.8")
    op.execute("UPDATE bullets SET caliber_family = '.284' WHERE diameter_mm BETWEEN 7.0 AND 7.3")
    op.execute("UPDATE bullets SET caliber_family = '.308' WHERE diameter_mm BETWEEN 7.7 AND 7.9")
    op.execute("UPDATE bullets SET caliber_family = '.338' WHERE diameter_mm BETWEEN 8.5 AND 8.7")

def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_cartridges_quality")
    op.execute("DROP INDEX IF EXISTS ix_bullets_caliber")
    op.execute("DROP INDEX IF EXISTS ix_bullets_quality")
    op.execute("DROP INDEX IF EXISTS ix_powders_quality")
    op.execute("DROP INDEX IF EXISTS ix_cartridges_name_trgm")
    op.execute("DROP INDEX IF EXISTS ix_bullets_mfg_trgm")
    op.execute("DROP INDEX IF EXISTS ix_bullets_name_trgm")
    op.execute("DROP INDEX IF EXISTS ix_powders_mfg_trgm")
    op.execute("DROP INDEX IF EXISTS ix_powders_name_trgm")
    op.drop_column("cartridges", "quality_score")
    op.drop_column("cartridges", "data_source")
    op.drop_column("bullets", "caliber_family")
    op.drop_column("bullets", "quality_score")
    op.drop_column("bullets", "data_source")
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
```

### Per-Entity Paginated Response Schema

```python
# In backend/app/schemas/powder.py (add to existing file)
class PaginatedPowderResponse(BaseModel):
    items: list[PowderResponse]
    total: int
    page: int
    size: int
```

```python
# In backend/app/schemas/bullet.py (add to existing file)
class PaginatedBulletResponse(BaseModel):
    items: list[BulletResponse]
    total: int
    page: int
    size: int
```

### Frontend Backward Compatibility (Minimal Change)

```typescript
// frontend/src/lib/api.ts -- update getPowders to handle paginated response
export async function getPowders(params?: {
  q?: string;
  manufacturer?: string;
  page?: number;
  size?: number;
}): Promise<PaginatedResponse<Powder>> {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set('q', params.q);
  if (params?.manufacturer) searchParams.set('manufacturer', params.manufacturer);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.size) searchParams.set('size', String(params.size));
  const qs = searchParams.toString();
  return request<PaginatedResponse<Powder>>(`/powders${qs ? '?' + qs : ''}`);
}
```

```typescript
// frontend/src/hooks/usePowders.ts -- update to handle paginated response
export function usePowders() {
  return useQuery({
    queryKey: ['powders'],
    queryFn: () => getPowders(),
    select: (data) => data.items,  // Unwrap for backward compat with existing components
  });
}
```

### Dynamic Manufacturer List

```python
@router.get("/manufacturers", response_model=list[str])
async def list_powder_manufacturers(db: AsyncSession = Depends(get_db)):
    """Return distinct manufacturer names for filter dropdowns."""
    result = await db.execute(
        select(Powder.manufacturer).distinct().order_by(Powder.manufacturer)
    )
    return [row[0] for row in result.all()]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side filtering | Server-side pg_trgm + pagination | Standard since PostgreSQL 9.1 (2011) for pg_trgm | Eliminates frontend memory bottleneck, enables fuzzy matching |
| `list[T]` response for lists | `{items, total, page, size}` envelope | REST API convention (no specific date) | Enables pagination UI, total count display |
| `keepPreviousData: true` (TQ v4) | `placeholderData: keepPreviousData` (TQ v5) | TanStack Query v5 (2023) | Import renamed; same behavior for smooth page transitions |

**Deprecated/outdated:**
- `LIKE '%term%'` for search: Does not handle typos, no index support. Replaced by pg_trgm.
- Client-side `Array.filter()` on full datasets: Does not scale past ~100 records. Replaced by server-side filtering.
- TanStack Query v4's `keepPreviousData: true` option: Renamed to `placeholderData: keepPreviousData` in v5. Import from `@tanstack/react-query`.

## Open Questions

1. **Cartridge caliber family filtering approach**
   - What we know: Cartridges have `bore_diameter_mm` which could derive a caliber family, similar to bullets.
   - What's unclear: The CONTEXT.md says "bullets and cartridges: filter by caliber family grouping" but cartridges already have a human-readable `name` (e.g., ".308 Winchester", "6.5 Creedmoor") which implicitly encodes the caliber. A separate `caliber_family` column on cartridges may be redundant -- filtering by name substring (".308" in ".308 Winchester") or by `bore_diameter_mm` range may suffice.
   - Recommendation: Add `caliber_family` to cartridges using the same diameter-range derivation as bullets. It's cheap (one VARCHAR column), consistent across entities, and explicitly filterable without parsing names.

2. **Quality score computation for bullets/cartridges**
   - What we know: Powders have a deterministic quality scorer (`backend/app/core/quality.py`) with critical+bonus field weights. Bullets/cartridges need quality_score but don't have a scorer yet.
   - What's unclear: Should Phase 4 implement scoring functions for bullets/cartridges, or just add the columns with a default value (0) and defer scoring to Phase 5/6?
   - Recommendation: Add columns with default 0. Implement minimal scorers (field completeness only, no source tier logic since bullets/cartridges don't have GRT import yet). This unblocks quality filtering now without over-engineering for Phase 5's bulk import.

3. **Test strategy for pg_trgm features**
   - What we know: Current tests use aiosqlite in-memory. pg_trgm functions don't exist in SQLite.
   - What's unclear: Whether to add a PostgreSQL test configuration or mock pg_trgm behavior.
   - Recommendation: Write pagination tests (no pg_trgm) that run against SQLite. Write search-specific tests with a `@pytest.mark.postgres` marker that are skipped in CI unless a PostgreSQL URL is set. Document the testing strategy clearly.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `backend/app/api/powders.py`, `bullets.py`, `cartridges.py` -- current endpoint structure
- Existing codebase analysis: `backend/app/models/powder.py` -- quality_score/data_source column pattern already implemented
- Existing codebase analysis: `backend/app/schemas/powder.py` -- PowderResponse with computed quality fields
- Existing codebase analysis: `backend/tests/test_api_integration.py` -- test infrastructure (aiosqlite, httpx, ASGI transport)
- Existing codebase analysis: `frontend/src/lib/types.ts` line 296-301 -- PaginatedResponse<T> type already defined
- Existing codebase analysis: `frontend/src/lib/api.ts` -- current API client pattern
- Existing codebase analysis: `backend/app/db/migrations/versions/005_add_quality_and_web_thickness.py` -- migration pattern
- `.planning/research/STACK.md` -- Technology compatibility verified (pg_trgm + asyncpg, GIN + Alembic, TQ v5 keepPreviousData)
- `.planning/research/ARCHITECTURE.md` -- Pagination helper pattern, fuzzy search pattern, caliber family derivation

### Secondary (MEDIUM confidence)
- PostgreSQL 16 documentation -- pg_trgm operators (`%`, `similarity()`, `gin_trgm_ops`) and GIN index behavior
- SQLAlchemy 2.0 documentation -- `op()` for custom operators, `func.similarity()` for PostgreSQL functions
- FastAPI documentation -- `Query()` parameter validation with `ge=`/`le=`

### Tertiary (LOW confidence)
- None -- all findings verified through primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns use existing libraries already in the project
- Architecture: HIGH -- patterns verified in existing codebase (paginate helper from ARCHITECTURE.md, quality columns from Phase 3)
- Pitfalls: HIGH -- identified from direct codebase analysis (aiosqlite limitation, missing columns, response shape change)

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable stack, no fast-moving dependencies)
