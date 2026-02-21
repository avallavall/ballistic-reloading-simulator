# Domain Pitfalls: Component Database Integration

**Domain:** Adding pre-loaded component databases to an existing internal ballistics simulator
**Researched:** 2026-02-21
**Confidence:** HIGH (based on codebase analysis, PostgreSQL documentation, and domain knowledge)

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or major UX regressions.

### Pitfall 1: Breaking Existing List Endpoints

**What goes wrong:** Changing `GET /powders` from returning `list[PowderResponse]` to `PaginatedPowderResponse` breaks all existing frontend hooks, the parametric search endpoint (which fetches all powders), and any other consumer of the list API.
**Why it happens:** API response shape change is a breaking change even if the data is the same.
**Consequences:** Frontend crashes on page load. Parametric search fails. Simulation form dropdowns break.
**Prevention:**
- Add pagination as NEW query params with defaults: `page=1, size=50`. No params = first page (backward compatible for small datasets).
- The parametric search endpoint (`POST /simulate/parametric`) internally calls `select(Powder)` directly, not the API. It must NOT be paginated -- it needs all powders. Verify this still works.
- Frontend hooks must be updated to expect `{items, total, page, size}` wrapper instead of raw array. Update ALL hooks simultaneously.
- **Test:** Call `GET /powders` with no params and verify it returns valid data (first page).
**Detection:** Any `TypeError` or empty table on existing pages after deploying the API change.

### Pitfall 2: GRT Import Overwriting User-Calibrated Data

**What goes wrong:** A user manually adjusts a powder's `burn_rate_coeff` or `covolume_m3_kg` based on their chronograph data. A subsequent GRT batch import with `overwrite=true` reverts their carefully calibrated values to the community defaults.
**Why it happens:** The import service updates ALL fields when overwriting, not just the fields that differ or that have better data.
**Consequences:** User loses custom calibration work. Simulation accuracy degrades for their specific setup.
**Prevention:**
- Default to `overwrite=false` (skip existing). The existing GRT import endpoint already does this correctly.
- When overwriting, preserve user-modified fields. Consider a `user_modified` flag or `updated_by` tracking.
- Show a clear diff/collision dialog in the frontend before overwriting (the existing powders page already has a collision dialog pattern -- extend it).
- Never auto-overwrite on seed data reload. The existing `seed_initial_data()` checks `if existing.scalar(): return` -- preserve this guard.
**Detection:** User reports that simulation results changed after an import they did not expect to affect their data.

### Pitfall 3: pg_trgm Extension Not Available in Test Environment

**What goes wrong:** Tests use aiosqlite (SQLite in-memory), which does not support PostgreSQL extensions like pg_trgm. Tests that exercise the `%` operator or `similarity()` function fail with `OperationalError`.
**Why it happens:** The existing test setup (`conftest.py`) uses `aiosqlite` for fast in-memory testing. This is correct for CRUD tests but cannot test PostgreSQL-specific features.
**Consequences:** Search functionality is untested, or tests are skipped, or tests fail in CI.
**Prevention:**
- Keep aiosqlite for existing unit tests (CRUD, schema validation, solver).
- For search/pagination tests, either:
  - (a) Use a real PostgreSQL test database (slower but accurate), or
  - (b) Mock the search at the service layer (test the search service separately against PostgreSQL, test the endpoint against mocked service).
- Do NOT try to install pg_trgm in SQLite -- it does not exist.
- Write search integration tests separately, marked with `@pytest.mark.postgres`.
**Detection:** CI/CD pipeline fails on search-related tests.

### Pitfall 4: Seed Data Race Condition on First Boot

**What goes wrong:** The current seed function checks `SELECT * FROM powders LIMIT 1` to decide whether to seed. With 750+ records and multiple fixture files, a slow initial seed could be interrupted (Docker restart, timeout), leaving partial data.
**Why it happens:** The seed function is called in the FastAPI lifespan event. If it takes >30 seconds for 750 records, Docker healthcheck or orchestrator may restart the container.
**Consequences:** Database has 200 powders but 0 bullets. Simulation form shows powders but no bullet options.
**Prevention:**
- Wrap the entire seed operation in a single transaction (the existing code already commits once at the end).
- Check each table independently: if powders exist but bullets do not, seed only bullets.
- Add logging with record counts so partial seeding is visible in logs.
- Consider a `seed_status` table or flag to track which fixture files have been loaded.
- **Performance:** 750 records via ORM `db.add()` should complete in <5 seconds. If it takes longer, switch to `session.execute(insert(Model), records)` for bulk insert (10-50x faster than individual adds).
**Detection:** Dashboard shows 200+ powders but 0 bullets after first boot.

## Moderate Pitfalls

### Pitfall 5: Quality Score Becomes Stale After User Edits

**What goes wrong:** User edits a powder's burn rate parameters. The quality_score was computed at import time and is not recalculated. The green badge stays green even though the user might have introduced incorrect values.
**Prevention:**
- Recompute `quality_score` on every PUT/update to a component. Add `quality_scorer.score_powder(data)` to the update endpoint.
- Alternatively, make quality_score a computed field in the Pydantic response model (not stored in DB). Slower but always accurate.
- Recommendation: Store in DB for query/filter performance, but recompute on update.

### Pitfall 6: N+1 Query in Paginated List with Relationships

**What goes wrong:** Adding `data_source`, `quality_score`, etc. to response models is fine for flat data. But if cartridges gain a `parent_cartridge` relationship, the paginated list endpoint could issue N+1 queries (one per cartridge to fetch its parent).
**Prevention:**
- Use `selectinload()` or `joinedload()` in the query when relationships are included in the response.
- For the v1.2 scope, cartridge `parent_cartridge_id` is just a UUID column -- no eager loading needed unless you add a nested `parent_cartridge` object to the response.
- Keep list responses flat. Reserve nested objects for detail endpoints (`GET /cartridges/{id}`).

### Pitfall 7: Frontend Query Key Explosion

**What goes wrong:** With paginated search, every combination of `q`, `page`, `manufacturer`, `caliber` generates a unique TanStack Query cache key. The cache grows unboundedly as users search.
**Prevention:**
- Set `gcTime` (formerly `cacheTime`) to a reasonable value (5 minutes) on list queries.
- Use `placeholderData: keepPreviousData` instead of `initialData` to avoid stale data display.
- Consider `staleTime: 30_000` (30 seconds) so rapid pagination does not refetch.

### Pitfall 8: Bullet Name Uniqueness Conflicts

**What goes wrong:** Multiple manufacturers make bullets with similar specs. "Hornady 168gr ELD Match .308" and "Sierra 168gr HPBT MK .308" are different bullets but "168gr Match .308" from a user might collide with either. The `unique=True` constraint on `name` rejects legitimate additions.
**Prevention:**
- The dedup should match on `(name, manufacturer)` pair, not just `name` alone.
- Consider a composite unique constraint: `UniqueConstraint("name", "manufacturer")` instead of `unique=True` on name alone.
- This requires an Alembic migration to drop the old unique index and add a composite one.
- For powders, name alone is sufficient (powder names are globally unique: "Hodgdon Varget" is unambiguous). For bullets, manufacturer + name is needed.

## Minor Pitfalls

### Pitfall 9: pg_trgm Similarity Threshold Too Strict

**What goes wrong:** Default pg_trgm similarity threshold is 0.3. Short search terms like "VN" (for Vihtavuori N-series) may not meet the threshold and return no results.
**Prevention:**
- Set a lower threshold for short queries: `SET pg_trgm.similarity_threshold = 0.1` (per-session or per-query).
- Alternatively, fall back to `ILIKE '%query%'` for queries shorter than 3 characters (trigrams need at least 3 chars to be meaningful).

### Pitfall 10: JSON Fixture Files Become Stale

**What goes wrong:** Bullet or powder specs change over time (Hornady updates BC values, Sierra releases new MatchKing). The JSON fixtures in the repository become outdated.
**Prevention:**
- Document the source and date for each fixture file.
- Provide an update workflow: re-run the data extraction script, diff against existing fixtures, review changes.
- This is a maintenance concern, not a blocking issue for v1.2.

### Pitfall 11: caliber_family Derivation Misses Edge Cases

**What goes wrong:** Backfilling `caliber_family` from `diameter_mm` misses bullets with overlapping diameters. For example, 6mm and 6mm Creedmoor bullets have `diameter_mm = 6.17` while .243 Winchester bullets also use `diameter_mm = 6.17`. They should share caliber_family `.243/.244`.
**Prevention:**
- Set `caliber_family` explicitly in the fixture data rather than deriving from diameter alone.
- Use standard caliber family names: `.224`, `.243`, `.264`, `.277`, `.284`, `.308`, `.338`, `.375`, `.416`, `.458`.
- For the backfill migration, use conservative diameter ranges and leave edge cases as NULL for manual assignment.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Migration 005 | pg_trgm CREATE EXTENSION fails on managed PostgreSQL without superuser | Use `IF NOT EXISTS` and test on Docker image first |
| Pagination endpoints | Breaking existing hook contracts | Update all hooks simultaneously; test with no params |
| GRT bulk import | Overwriting user calibrations | Default overwrite=false; collision dialog UI |
| Bullet fixtures | Name uniqueness too strict | Composite unique on (name, manufacturer) |
| Seed data loading | Partial seed on container restart | Per-table existence check; single transaction |
| Frontend search | Empty results for short queries | ILIKE fallback for queries < 3 chars |
| Quality scoring | Stale scores after user edits | Recompute on PUT/update |
| Test suite | pg_trgm not available in aiosqlite | Separate PostgreSQL integration tests |

## Sources

- [PostgreSQL pg_trgm documentation](https://www.postgresql.org/docs/16/pgtrgm.html) -- similarity threshold configuration
- [SQLAlchemy 2.0 selectinload documentation](https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html) -- N+1 prevention
- [TanStack Query caching guide](https://tanstack.com/query/v5/docs/react/guides/caching) -- gcTime and staleTime
- Existing codebase analysis of `backend/app/api/powders.py` import-grt endpoint
- Existing codebase analysis of `backend/app/seed/initial_data.py` seed guard pattern
