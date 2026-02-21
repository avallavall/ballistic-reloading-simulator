# Project Research Summary

**Project:** Simulador de Balistica de Precision — v1.2 Component Databases
**Domain:** Component database expansion for internal ballistics simulator
**Researched:** 2026-02-21
**Confidence:** HIGH

## Executive Summary

The v1.2 milestone transforms the simulator from a small-scale tool with 37 hand-curated component records (22 powders, 10 bullets, 5 cartridges) into a comprehensive component database with 750+ records, fuzzy search, quality confidence indicators, and batch import pipelines. The existing technology stack (FastAPI + SQLAlchemy async + PostgreSQL 16 + Next.js 14 + TanStack Query) handles this scale without adding a single new dependency: pg_trgm (built into the PostgreSQL 16 Docker image) provides sub-millisecond fuzzy name search, server-side pagination eliminates frontend rendering bottlenecks, and JSON fixture files replace embedded Python dicts for seed data. Elasticsearch, Redis, and client-side filtering were all evaluated and rejected as disproportionate solutions for a 500-750 row dataset.

The recommended approach follows a strict dependency-driven build order. The Alembic migration must arrive first because all new columns (data_source, quality_score, caliber_family) are required before any downstream code can be written or tested. Backend search/pagination services form an independently verifiable layer before any frontend work begins. Fixture data compilation — the highest-effort task — is the only element with meaningful execution risk: bullet data from manufacturer spec sheets must be compiled manually since no public API exists. The research recommendation is to ship 100-200 bullets in v1.2 and expand to 500+ in v1.3 rather than treating 500 as a v1.2 commitment.

The primary technical risk is the breaking API contract change when list endpoints switch from returning raw arrays to paginated `{items, total, page, size}` wrappers. All frontend hooks must be updated simultaneously in one deployment. The parametric search endpoint must continue querying the database directly (bypassing the paginated endpoint) to avoid a 200+ iteration performance cliff that would make it unusable. The secondary risk is a partial seed failure on first Docker boot: a 750-record ORM seed can be interrupted by healthcheck timeouts; per-table existence checks and bulk insert patterns keep seeding under 5 seconds.

## Key Findings

### Recommended Stack

No new packages are required in requirements.txt or package.json. The entire milestone uses existing tools. The only infrastructure change is enabling the pg_trgm extension via Alembic migration using a single SQL statement (`CREATE EXTENSION IF NOT EXISTS pg_trgm`), which the postgres:16 Docker image already ships.

**Core technologies:**
- `pg_trgm` (PostgreSQL 16 built-in): fuzzy name search with GIN indexes — eliminates Elasticsearch infrastructure; handles 10K rows comfortably
- SQLAlchemy 2.0 async: paginated queries with `func.count()` subquery for total count — existing pattern, no new API required
- Alembic 1.14.1: single migration (005) for schema changes, extension activation, GIN indexes, and backfill — pattern already established
- TanStack Query 5.59.0: parameterized query keys with `placeholderData: keepPreviousData` — v5 API rename from v4's `keepPreviousData: true` is the only compatibility note
- Pydantic v2: per-entity paginated response models (PaginatedPowderResponse etc.) — Generic models work in v2 but per-entity concrete classes are safer with FastAPI response_model

### Expected Features

**Must have (table stakes):**
- Pre-loaded powder database (200+) — users cannot be expected to enter Noble-Abel thermodynamic parameters manually
- Pre-loaded bullet database (100-200 in v1.2, expandable) — weight, diameter, BC values are reference data
- Pre-loaded cartridge database (50+) — SAAMI/CIP specs are authoritative reference data that do not change
- Fuzzy name search — "hodgon" must find "Hodgdon"; exact-match only is a GRT weakness this build corrects
- Filter by manufacturer and caliber family — scoped browsing is standard in any component catalog
- Server-side pagination at 50 records per page — required at 200+ powders, mandatory at 500+ bullets
- Quality/confidence badges per record — users need to know which powder models are well-calibrated vs estimated

**Should have (differentiators vs GRT):**
- Quality score transparency with per-component breakdown in tooltip — GRT shows no confidence levels
- Data source provenance tracking (grt_community, manufacturer, manual, estimated) — trust signal
- Batch import collision handling (skip vs overwrite) — already implemented for powders, extend to bullets/cartridges
- Cross-manufacturer combined search — "168gr" surfaces Sierra, Hornady, Berger, Nosler in one result set

**Defer (v1.3+):**
- Full 500+ bullet database — data compilation is labor-intensive; 100-200 most popular bullets is the v1.2 commitment
- Caliber-scoped parametric search optimization — filtering by compatibility before simulating addresses the parametric search scaling issue
- Dedicated bullet/cartridge import UI — API endpoints ship in v1.2, upload UI deferred
- Community submission workflow — requires auth infrastructure not in scope

### Architecture Approach

The architecture converts simple CRUD list endpoints into paginated search endpoints without changing any existing response fields. All new columns on component models are nullable or have defaults, ensuring a safe migration on live data. Four new backend services isolate concerns cleanly: a pagination helper (reused across all list endpoints), a search helper (encapsulating pg_trgm query patterns), a quality scorer (deterministic 0-100 score from data completeness and source tier), and a shared import service (replacing the 70 lines of inline dedup logic in powders.py). Frontend pages add search bars, filter dropdowns, pagination controls, and quality badges using only the existing Badge component and Tailwind utilities — the `PaginatedResponse<T>` TypeScript type already defined in types.ts (currently unused) becomes the standard response wrapper.

**Major components:**
1. Alembic migration 005 — pg_trgm extension, GIN indexes on name/manufacturer, 22 new columns across 3 tables, backfill of existing rows
2. Backend service layer (pagination, search, quality_scorer, import_service) — pure Python, reusable across all component types
3. JSON fixture files (powders.json 200+, bullets.json 100-200, cartridges.json 50+) — the primary delivery effort is data compilation, not code
4. Updated list endpoints (GET /powders, /bullets, /cartridges) — add `?q=`, `?page=`, `?size=`, entity-specific filters; response shape changes to paginated wrapper
5. Frontend UI additions (SearchInput debounced, QualityBadge, Pagination, FilterDropdown) — built from existing Tailwind utilities, no new libraries
6. Updated hooks (usePowders, useBullets, useCartridges) — parameterized query keys, keepPreviousData for smooth transitions

### Critical Pitfalls

1. **Breaking existing list endpoint contracts** — changing response shape from raw array to `{items, total, page, size}` crashes all existing consumers simultaneously. Prevention: update all frontend hooks in one deployment; test no-params default returns valid first-page data; verify parametric search (`POST /simulate/parametric`) queries the DB directly and is not affected.

2. **GRT import overwriting user-calibrated values** — users who adjusted burn rate or covolume lose their work when bulk import runs with overwrite=true. Prevention: default overwrite=false always; show collision dialog with diff; never auto-overwrite during seed reload (existing guard in initial_data.py must be preserved).

3. **pg_trgm not available in aiosqlite test environment** — existing conftest.py uses SQLite in-memory, which does not support PostgreSQL extensions. Prevention: keep aiosqlite for unit/CRUD/solver tests; create separate `@pytest.mark.postgres` integration tests for search functionality against a real PostgreSQL instance.

4. **Partial seed failure on first Docker boot** — 750-record ORM seed can be interrupted by Docker healthcheck timeout, leaving some tables empty while others are populated. Prevention: per-table existence check (not a single powders check); wrap all inserts per fixture file in a single transaction; use `session.execute(insert(Model), records)` bulk pattern to complete in under 5 seconds.

5. **Bullet name uniqueness constraint too strict** — current `unique=True` on `name` alone rejects legitimate additions when multiple manufacturers name bullets similarly. Prevention: migration must drop the single-column unique index on bullets.name and replace it with a composite `UniqueConstraint("name", "manufacturer")`.

## Implications for Roadmap

The dependency graph mandates a strict four-phase build order. The schema migration is the single gate. Backend services are independently testable without frontend involvement. Fixture data compilation can proceed in parallel with frontend integration once Phase 1 is stable.

### Phase 1: Backend Foundation

**Rationale:** The Alembic migration must ship first. Every new column (data_source, quality_score, caliber_family) is required before any import logic can store data, any quality scorer can write scores, or any search endpoint can filter on these fields. Backend services form a self-contained layer that can be verified with curl before any frontend work begins.
**Delivers:** Alembic migration 005 (schema + pg_trgm + GIN indexes + backfill); pagination service; search service; quality scorer service; updated ORM models; updated Pydantic schemas with paginated response wrappers; updated GET /powders, /bullets, /cartridges with full search/filter/pagination.
**Addresses:** Table-stakes search, pagination, and quality indicator features. Sets the API contract for all downstream work.
**Avoids:** Breaking endpoint contract (update all three list endpoints in one migration pass); pg_trgm not activated (migration handles it with IF NOT EXISTS); stale quality scores on edit (PUT endpoints must call quality_scorer.recompute).

### Phase 2: Import Pipeline and Fixture Data

**Rationale:** Depends on Phase 1 for new columns. This is the highest-effort phase: GRT community DB conversion is mechanical (existing parser handles the format), but bullet data compilation from manufacturer PDFs is manual. Running Phase 2 in parallel with Phase 3 is possible after Phase 1 stabilizes — different agents can handle data compilation vs. frontend UI.
**Delivers:** Shared import service (extracted from powders.py inline logic); powders.json 200+ records; bullets.json 100-200 most popular records; cartridges.json 50+ CIP/SAAMI records; updated seed loader reading from fixtures/; POST /admin/import/bullets and /admin/import/cartridges endpoints.
**Addresses:** Pre-loaded databases (the core v1.2 deliverable), data provenance, import collision handling.
**Avoids:** Partial seed race condition (per-table guards + bulk insert speed); overwrite data loss (default skip + collision dialog); bullet name uniqueness conflict (composite unique index from Phase 1 migration).

### Phase 3: Frontend Integration

**Rationale:** Depends on Phase 1 paginated API being stable. Can run in parallel with Phase 2 data compilation — the search UI functions correctly regardless of data volume. All additions use existing components and Tailwind utilities; no new dependencies are added.
**Delivers:** SearchInput (300ms debounce, URL-synced query params); QualityBadge (reuses existing Badge success/warning/danger variants); Pagination component (prev/next/page buttons in Tailwind); FilterDropdown; updated /powders, /bullets, /cartridges pages; updated usePowders/useBullets/useCartridges hooks with parameterized query keys.
**Addresses:** UX quality gap (flat table with 500+ items), quality transparency differentiator, cross-manufacturer combined search.
**Avoids:** TanStack Query v5 API rename (use `placeholderData: keepPreviousData` not `keepPreviousData: true`); query key cache explosion (set `gcTime: 300_000` and `staleTime: 30_000`); table virtualization complexity (server-side pagination makes it unnecessary at 50 items per page).

### Phase 4: Testing and Polish

**Rationale:** Validates the complete integrated system. Cannot be meaningfully written before Phases 1-3 exist, but must cover all new paths before shipping.
**Delivers:** Backend pagination/search tests (against real PostgreSQL, not aiosqlite); migration idempotency tests (fresh DB and existing DB with data); import dedup/collision tests; quality scorer unit tests; quality score recomputation on PUT tests; frontend smoke tests for search, pagination, filter on each component page.
**Addresses:** pg_trgm test coverage gap (separate postgres-marked integration tests); quality score staleness validation; migration safety on live data.
**Avoids:** Shipping untested import/dedup logic; shipping untested migration backfill; aiosqlite/pg_trgm incompatibility creating silent coverage gaps.

### Phase Ordering Rationale

- Phase 1 must be first: schema migration gates every other change in this milestone
- Phase 2 and Phase 3 can run in parallel after Phase 1: data compilation and frontend UI have no dependency on each other
- Phase 4 must be last: integration tests validate the full assembled system, not isolated components
- Fixture data compilation (Phase 2, bullet records) is the schedule risk: if it slips, bullet count should be reduced to 100 rather than delaying the milestone

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Fixture Data):** No public API for manufacturer bullet specs — data must be compiled manually from Sierra, Hornady, Berger, Nosler, Lapua PDF catalogs. Scope of 500+ bullets in v1.2 is not achievable; plan for 100-200 and treat the rest as v1.3 content.
- **Phase 4 (Testing):** pg_trgm integration tests require a live PostgreSQL instance in CI. Current test setup uses aiosqlite only. Verify CI can provide a PostgreSQL service container, or mark postgres tests as manual-only for v1.2.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Backend Foundation):** pg_trgm with SQLAlchemy async, paginated queries, and Pydantic generic wrappers are all well-documented. Architecture file contains production-ready code patterns ready to implement.
- **Phase 3 (Frontend Integration):** TanStack Query parameterized queries, debounced search, and URL-synced state are standard patterns with existing examples in this codebase.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new dependencies. All tools already in use. pg_trgm confirmed available in postgres:16 image without additional installation. TanStack Query v5 API rename verified in official docs. |
| Features | HIGH | Feature set derived from direct GRT competitive analysis (docs/grtools_analysis.md) already in the codebase. Table stakes are well-established for component catalog products. |
| Architecture | HIGH | Based on direct codebase analysis. All patterns are extensions of existing code. Architecture file includes full code examples verified against SQLAlchemy 2.0 and TanStack Query v5 documentation. |
| Pitfalls | HIGH | Critical pitfalls 1, 2, and 4 identified from reading existing code (powders.py import logic, seed guard pattern, parametric search endpoint). Pitfalls 3 and 5 from PostgreSQL/SQLAlchemy documentation with direct codebase references. |

**Overall confidence:** HIGH

### Gaps to Address

- **Bullet data volume:** Research recommends 100-200 bullets for v1.2 (not the 500+ listed as aspirational target). Roadmap should treat 100-200 as the committed deliverable and 500+ as a v1.3 stretch goal. The fixture format and import pipeline ship in v1.2, enabling easy expansion.
- **Caliber family edge cases:** Backfilling caliber_family from diameter_mm has known overlap issues (6mm and .243 share 6.17mm diameter). New fixture records should set caliber_family explicitly; migration backfill on existing rows uses conservative diameter ranges and leaves edge cases as NULL for manual assignment.
- **Quality score recomputation on edit:** PUT endpoints must call quality_scorer.recompute() before saving. This is not a Phase 4 concern — it must be implemented in Phase 1 with the endpoint updates, not added later as a bug fix.
- **Parametric search scaling:** POST /simulate/parametric iterates all powders synchronously. At 200+ powders this endpoint could take 20-30 seconds. This is pre-existing behavior not worsened by v1.2, but must be flagged for a dedicated optimization milestone (filter to compatible powders before simulating).
- **GRT community DB licensing:** The github.com/zen/grt_databases repo states no warranty and no responsibility. Confirm this is suitable for redistribution in seed fixtures before shipping 200 powders from that source.

## Sources

### Primary (HIGH confidence)
- [PostgreSQL pg_trgm documentation](https://www.postgresql.org/docs/16/pgtrgm.html) — extension setup, GIN index creation, similarity threshold configuration
- [SQLAlchemy 2.0 async documentation](https://docs.sqlalchemy.org/en/20/) — paginated queries, selectinload for N+1 prevention, bulk insert patterns
- [TanStack Query v5 pagination guide](https://tanstack.com/query/v5/docs/react/guides/paginated-queries) — keepPreviousData API, placeholderData rename from v4
- [TanStack Query caching guide](https://tanstack.com/query/v5/docs/react/guides/caching) — gcTime and staleTime configuration
- Existing codebase (`backend/app/api/powders.py`) — GRT import inline logic, collision handling pattern
- Existing codebase (`backend/app/seed/initial_data.py`) — seed guard pattern
- Existing codebase (`backend/app/api/simulate.py`) — parametric search DB query pattern
- Existing codebase (`frontend/src/lib/types.ts`) — PaginatedResponse type already defined at line 267-273

### Secondary (MEDIUM confidence)
- [GRT community databases on GitHub](https://github.com/zen/grt_databases) — primary powder data source; XML format handled by existing grt_parser.py
- [Sierra Bullets load data](https://sierrabullets.com/load-data/) — bullet spec reference; manual compilation required
- [Hodgdon Reloading Data Center](https://hodgdonreloading.com/rldc/) — powder and cartridge reference
- [Crunchy Data: Postgres Full-Text Search](https://www.crunchydata.com/blog/postgres-full-text-search-a-search-engine-in-a-database) — informed pg_trgm over tsvector decision
- [Medium: Performant text searching in PSQL](https://medium.com/@daniel.tooke/performant-text-searching-and-indexes-in-psql-trigrams-like-and-full-text-search-784c000efaa6) — trigram vs full-text benchmark data

### Tertiary (LOW confidence)
- [GRT propellant file format documentation](https://grtools.de/doku.php?id=en:doku:file_propellant) — format reference for import pipeline; existing grt_parser.py already implements this
- [Staging tables for bulk upserts](https://overflow.no/blog/2025/1/5/using-staging-tables-for-faster-bulk-upserts-with-python-and-postgresql/) — evaluated for import pipeline; rejected in favor of ORM bulk insert at this record count

---
*Research completed: 2026-02-21*
*Ready for roadmap: yes*
