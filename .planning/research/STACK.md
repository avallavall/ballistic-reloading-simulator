# Technology Stack: v1.2 Component Databases

**Project:** Simulador de Balistica de Precision v1.2
**Researched:** 2026-02-21

## Recommended Stack

No new backend or frontend dependencies are required. All changes leverage existing stack capabilities.

### Core Framework (Unchanged)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| FastAPI | 0.115.6 | REST API framework | Existing -- no changes |
| SQLAlchemy | 2.0.36 (async) | ORM + query builder | Existing -- use more advanced query patterns |
| asyncpg | 0.30.0 | PostgreSQL async driver | Existing -- no changes |
| PostgreSQL | 16 | Database | Existing -- enable pg_trgm extension |
| Alembic | 1.14.1 | Migrations | Existing -- one new migration (005) |
| Pydantic | 2.10.4 | Schema validation | Existing -- add paginated response models |

### Frontend (Unchanged)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| Next.js | 14.2.15 | React framework | Existing -- no changes |
| TanStack Query | 5.59.0 | Data fetching + caching | Existing -- use keepPreviousData for pagination |
| Recharts | 2.13.0 | Charts | Existing -- not directly involved |
| Tailwind CSS | 3.4.13 | Styling | Existing -- new components use existing utilities |
| Lucide React | 0.447.0 | Icons | Existing -- icons for search/filter UI |

### New PostgreSQL Extensions

| Extension | Purpose | Why |
|-----------|---------|-----|
| `pg_trgm` | Trigram-based fuzzy text search | Built into PostgreSQL 16, no install needed. Sub-millisecond fuzzy matching on short strings (component names). GIN index support for fast lookups. |

### Supporting Libraries (Already Installed, Used More)

| Library | Version | New Usage |
|---------|---------|-----------|
| `python-multipart` | 0.0.20 | Already used for GRT file upload; reused for bulk import endpoints |
| `json` (stdlib) | -- | Load fixture JSON files during seed |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Search | pg_trgm (PostgreSQL) | Elasticsearch | Overkill for 750 records. Adds infrastructure (new Docker service), operational complexity, sync headaches. pg_trgm handles this volume in microseconds. |
| Search | pg_trgm | Full-text search (tsvector) | Wrong tool for short identifiers. Component names like "168gr HPBT" are not natural language documents. Trigram matching handles partial strings and typos better. |
| Search | pg_trgm | Application-level filter | Loads all records into Python on every request. Does not scale. No index support. |
| Caching | No cache | Redis | 750 records with simple queries complete in <10ms. Adding Redis doubles infrastructure complexity for negligible gain. |
| Frontend pagination | Server-side + TanStack Query | TanStack Virtual (windowing) | Server-side pagination means DOM never has >50 rows. Virtualization adds scroll management complexity for zero benefit at this scale. |
| Frontend pagination | Server-side | Client-side filter/sort | Breaks at 500+ records. Sends full dataset over the wire. Every keystroke re-renders all rows. |
| Seed data format | JSON fixtures | YAML fixtures | JSON is native to Python and TypeScript. No extra dependency. YAML adds PyYAML + parser complexity for no benefit. |
| Seed data format | JSON fixtures | SQL INSERT migrations | Mixes data with schema changes. Not idempotent. Harder to review (SQL vs structured data). |
| Seed data format | JSON fixtures | CSV files | Lacks nested structures, no typing, quoting issues with commas in product names. |
| Bulk import | SQLAlchemy add_all + commit | asyncpg COPY FROM | COPY is faster for 10K+ rows but adds raw SQL complexity. At 500 records, ORM bulk insert takes <1 second. Not worth the complexity. |

## No New Installation Required

The entire v1.2 milestone uses the existing `requirements.txt` and `package.json` without changes:

```bash
# Backend -- no new packages
pip install -r requirements.txt   # Same as before

# Frontend -- no new packages
npm install                       # Same as before
```

The only infrastructure change is enabling the pg_trgm extension in PostgreSQL, done via Alembic migration:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

This extension ships with PostgreSQL 16 and is available in the `postgres:16` Docker image without any additional installation.

## Version Compatibility Notes

| Concern | Status |
|---------|--------|
| pg_trgm + asyncpg | Compatible. The `%` operator and `similarity()` function work through asyncpg. SQLAlchemy's `op("%")` generates correct SQL. |
| SQLAlchemy 2.0 + GIN indexes | Compatible. Indexes are created in raw SQL via Alembic `op.execute()`, not through ORM. |
| TanStack Query 5.x + keepPreviousData | The v5 API uses `placeholderData: keepPreviousData` (imported from `@tanstack/react-query`). This is a rename from v4's `keepPreviousData: true` option. |
| Pydantic v2 Generic models | `PaginatedResponse` can be a generic Pydantic model using `Generic[T]` in v2. However, FastAPI response_model works better with concrete classes, so use per-entity `PaginatedPowderResponse` etc. |

## Sources

- [PostgreSQL pg_trgm built-in extension](https://www.postgresql.org/docs/16/pgtrgm.html)
- [SQLAlchemy 2.0 async documentation](https://docs.sqlalchemy.org/en/20/)
- [TanStack Query v5 pagination guide](https://tanstack.com/query/v5/docs/react/guides/paginated-queries)
