# Phase 7: Cross-Phase Integration Fixes - Research

**Researched:** 2026-02-23
**Domain:** Backend startup/search wiring + Frontend TypeScript type alignment + API parameter mismatch
**Confidence:** HIGH

## Summary

This phase addresses 4 well-defined wiring bugs between completed phases (4 and 5) that prevent Docker fresh boot search, GRT import overwrite mode, and frontend type safety from working correctly. All bugs have clear root causes identified by code inspection.

**Bug 1 (pg_trgm startup):** The `create_all()` lifespan in `main.py` creates tables but does NOT create the `pg_trgm` extension or GIN indexes. Those only exist in Alembic migration `006_search_and_pagination.py`. On fresh Docker boot without running `alembic upgrade head`, any `?q=` search crashes because `apply_fuzzy_search` uses the `%` trigram operator which requires the extension.

**Bug 2 (Import mode param):** Frontend `importGrtPowders()` in `api.ts` sends `?overwrite=true` but backend expects `?mode=overwrite` (an `ImportMode` enum). The overwrite button in the powders page silently fails to overwrite.

**Bug 3 (Bullet nullable types):** Frontend `Bullet` interface declares `length_mm: number` and `bc_g7: number` as non-nullable, but backend `BulletResponse` schema declares both as `float | None`. Any bullet with missing data causes runtime type mismatches.

**Bug 4 (GrtImportResult interface):** Frontend `GrtImportResult` interface is missing `updated: Powder[]` and `mode: string` fields that the backend returns. The overwrite result display also ignores the `updated` count.

**Primary recommendation:** Fix all 4 bugs in a single plan with clear wave separation: backend startup first, then frontend types, then API param fix, verified by compilation and test passes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- pg_trgm extension + GIN indexes created programmatically in lifespan startup (not just Alembic)
- Creation wrapped in try/except -- if pg_trgm unavailable, log warning ONCE at startup
- Search service degrades to case-insensitive ILIKE when pg_trgm is not available
- A startup flag (e.g., `app.state.has_trgm`) controls which search path is used
- App never fails to start due to missing pg_trgm
- Fix the 4 known mismatches (Bullet nullable fields, GrtImportResult interface, import mode param)
- Additionally audit ALL TypeScript interfaces in `types.ts` against backend Pydantic response schemas for nullable alignment
- Fix any other mismatches found during audit (proactive, not just reactive)
- Unit tests for each individual fix (pg_trgm fallback, import mode param, nullable types)
- Integration test verifying fuzzy search endpoint works on fresh boot without manual `alembic upgrade head`
- Frontend type fixes verified by TypeScript compilation (no runtime tests needed)

### Claude's Discretion
- Exact implementation of the trgm availability flag mechanism
- Whether ILIKE fallback uses `%query%` or `query%` pattern
- Order of fixes within the single plan

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PWD-01 | User can batch-import 200+ powders from GRT with collision handling (skip/overwrite) | Fix 2 (import mode param) and Fix 4 (GrtImportResult interface) restore the overwrite collision handling path |
| SRC-02 | User can fuzzy-search components by name using pg_trgm | Fix 1 (pg_trgm startup + ILIKE fallback) ensures search works on fresh Docker boot |
| BUL-03 | Bullet schema tolerates missing fields (nullable length_mm, bc_g7) with completeness indicators | Fix 3 (Bullet nullable types) aligns frontend interface with backend nullable schema |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Used How |
|---------|---------|---------|----------|
| SQLAlchemy | 2.0.36 | ORM + raw SQL for `CREATE EXTENSION` | Execute raw SQL in lifespan for pg_trgm |
| FastAPI | 0.115.6 | API framework | Lifespan context manager, `app.state` for trgm flag |
| TypeScript | 5.6.3 | Frontend type system | Interface fixes verified by `tsc --noEmit` |
| PostgreSQL | 16 | Database | pg_trgm extension, GIN indexes |

### Supporting
No new libraries needed. All fixes use existing project dependencies.

### Alternatives Considered
None -- these are bug fixes, not feature choices.

## Architecture Patterns

### Pattern 1: pg_trgm Extension + GIN Index Creation in Lifespan

**What:** Execute `CREATE EXTENSION IF NOT EXISTS pg_trgm` and `CREATE INDEX IF NOT EXISTS` for all 5 GIN indexes directly in the FastAPI lifespan startup, alongside the existing `create_all()`.

**When to use:** On every app boot, before seed data.

**Implementation approach:**

```python
# In main.py lifespan, AFTER create_all():
async with engine.begin() as conn:
    # create_all() already ran above
    try:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        # Create GIN indexes (IF NOT EXISTS prevents errors on re-run)
        for idx_sql in [
            "CREATE INDEX IF NOT EXISTS ix_powders_name_trgm ON powders USING gin (name gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS ix_powders_mfg_trgm ON powders USING gin (manufacturer gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS ix_bullets_name_trgm ON bullets USING gin (name gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS ix_bullets_mfg_trgm ON bullets USING gin (manufacturer gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS ix_cartridges_name_trgm ON cartridges USING gin (name gin_trgm_ops)",
        ]:
            await conn.execute(text(idx_sql))
        app.state.has_trgm = True
        logger.info("pg_trgm extension and GIN indexes created")
    except Exception as e:
        app.state.has_trgm = False
        logger.warning("pg_trgm unavailable (%s) - search will use ILIKE fallback", e)
```

**Key details:**
- `CREATE EXTENSION IF NOT EXISTS` is idempotent -- safe on repeated boots
- `CREATE INDEX IF NOT EXISTS` is idempotent -- safe when Alembic has already run
- The `try/except` catches the case where pg_trgm is not installed (e.g., test environments with SQLite, minimal PostgreSQL images)
- `app.state.has_trgm` is a simple boolean flag accessible from any request handler

**Confidence:** HIGH -- `CREATE EXTENSION IF NOT EXISTS` is standard PostgreSQL DDL, `app.state` is documented FastAPI pattern.

### Pattern 2: ILIKE Fallback in Search Service

**What:** Modify `apply_fuzzy_search()` to accept a `has_trgm` flag and branch between the `%` trigram operator (PostgreSQL) and case-insensitive `ILIKE` (universal).

**Implementation approach:**

```python
def apply_fuzzy_search(
    query,
    model,
    search_term: str,
    fields: list[str] | None = None,
    has_trgm: bool = True,  # NEW PARAM
):
    if fields is None:
        fields = ["name", "manufacturer"]

    search_columns = [getattr(model, f) for f in fields if hasattr(model, f)]
    if not search_columns:
        return query

    if has_trgm:
        # Existing pg_trgm path
        conditions = [col.op("%")(search_term) for col in search_columns]
        query = query.where(or_(*conditions))
        query = query.order_by(
            func.similarity(search_columns[0], search_term).desc(),
            model.quality_score.desc(),
        )
    else:
        # ILIKE fallback -- case-insensitive substring match
        pattern = f"%{search_term}%"
        conditions = [col.ilike(pattern) for col in search_columns]
        query = query.where(or_(*conditions))
        query = query.order_by(model.quality_score.desc())

    return query
```

**Callers** (powders.py, bullets.py, cartridges.py) need to pass `has_trgm=request.app.state.has_trgm` (accessible via FastAPI's `Request` object).

**Confidence:** HIGH -- SQLAlchemy's `.ilike()` works on all backends including SQLite and PostgreSQL.

### Pattern 3: Frontend API Parameter Fix

**What:** Change `importGrtPowders` in `api.ts` from `?overwrite=true` to `?mode=overwrite`.

**Current (broken):**
```typescript
const url = `${API_PREFIX}/powders/import-grt${overwrite ? '?overwrite=true' : ''}`;
```

**Fixed:**
```typescript
const url = `${API_PREFIX}/powders/import-grt${overwrite ? '?mode=overwrite' : ''}`;
```

**Confidence:** HIGH -- backend endpoint signature is `mode: ImportMode = Query(ImportMode.skip)`, which accepts `?mode=overwrite`.

### Pattern 4: TypeScript Interface Alignment

**What:** Fix all type mismatches between `types.ts` interfaces and backend Pydantic response schemas.

**Known mismatches identified by code audit:**

| Interface | Field | Current TS | Backend Pydantic | Fix |
|-----------|-------|-----------|-----------------|-----|
| `Bullet` | `length_mm` | `number` | `float \| None` | `number \| null` |
| `Bullet` | `bc_g7` | `number` | `float \| None` | `number \| null` |
| `GrtImportResult` | `updated` | missing | `list[PowderResponse]` | add `updated: Powder[]` |
| `GrtImportResult` | `mode` | missing | `str` | add `mode: string` |
| `GrtImportResult` | `created` | `Powder[]` | `list[PowderResponse]` | already correct type, OK |
| `Cartridge` | `cip_max_pressure_mpa` | `number` | `float \| None` | `number \| null` |

**Additional audit results (all `types.ts` interfaces vs backend schemas):**

| Interface | Field | Status |
|-----------|-------|--------|
| `Powder` | all fields | OK -- nullable fields correctly use `\| null` |
| `Bullet.model_number` | not in TS | Missing in TS `Bullet` interface (backend returns it) |
| `Bullet.bullet_type` | not in TS | Missing in TS `Bullet` interface (backend returns it) |
| `Bullet.base_type` | not in TS | Missing in TS `Bullet` interface (backend returns it) |
| `Cartridge.parent_cartridge_name` | not in TS | Missing in TS `Cartridge` interface (backend returns it) |
| `Cartridge.shoulder_diameter_mm` | not in TS | Missing in TS `Cartridge` interface (backend returns it) |
| `Cartridge.neck_diameter_mm` | not in TS | Missing in TS `Cartridge` interface (backend returns it) |
| `Cartridge.base_diameter_mm` | not in TS | Missing in TS `Cartridge` interface (backend returns it) |
| `Cartridge.rim_diameter_mm` | not in TS | Missing in TS `Cartridge` interface (backend returns it) |
| `Powder.alias_group` | not in TS | Missing in TS `Powder` interface (backend returns it) |
| `Rifle` | all fields | OK |
| `SimulationResult` | all fields | OK |

**Decision needed by planner:** The missing fields (model_number, bullet_type, base_type, alias_group, cartridge dimension fields) are returned by the backend but not declared in the TS interfaces. Per CONTEXT.md decision to "audit ALL TypeScript interfaces" and "fix any other mismatches found", these should be added as optional nullable fields. They are not currently consumed by the frontend, but declaring them enables future Phase 6 UI work.

**Confidence:** HIGH -- direct code comparison between `schemas/*.py` and `types.ts`.

### Pattern 5: Import Result Display Fix

**What:** Update the powders page import result state to include `updated` count alongside `created`.

**Current (incomplete):**
```typescript
setImportResult({ created: data.created.length, skipped: data.skipped, errors: data.errors });
```

**Fixed:**
```typescript
setImportResult({
  created: data.created.length,
  updated: data.updated.length,
  skipped: data.skipped,
  errors: data.errors,
  mode: data.mode,
});
```

The result state type and display template also need updating to show "N actualizadas" when overwrite mode returns updated records.

**Confidence:** HIGH -- straightforward state shape change.

### Anti-Patterns to Avoid
- **Do NOT add pg_trgm to SQLAlchemy model metadata:** GIN indexes with `gin_trgm_ops` are PostgreSQL-specific and cannot be expressed in SQLAlchemy's portable `Index()` construct. Use raw SQL.
- **Do NOT remove the Alembic migration:** Keep migration `006` intact for production use. The lifespan code is a parallel path for dev convenience.
- **Do NOT catch specific exceptions by type in the trgm try/except:** Different PostgreSQL versions may raise different exception types. Catch broad `Exception`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Case-insensitive search | Custom Python-side filtering | SQLAlchemy `.ilike()` | Database-side is faster and handles Unicode correctly |
| Extension availability check | Query pg_extension catalog | Try/except on `CREATE EXTENSION` | `IF NOT EXISTS` is idempotent; a separate check adds complexity for no benefit |
| TypeScript type generation | Manual interface maintenance | Direct comparison with Pydantic schemas | No codegen tool is in the project; manual audit is sufficient for 6 interfaces |

**Key insight:** These are surgical bug fixes. The goal is minimum code change with maximum correctness, not architectural improvement.

## Common Pitfalls

### Pitfall 1: CREATE EXTENSION requires superuser on some PostgreSQL configurations
**What goes wrong:** `CREATE EXTENSION IF NOT EXISTS pg_trgm` may fail with "permission denied" on managed PostgreSQL (e.g., some cloud providers restrict extension creation).
**Why it happens:** pg_trgm is a "trusted" extension in PostgreSQL 13+, but older configs may block it.
**How to avoid:** The try/except with ILIKE fallback handles this gracefully. Log the warning. PostgreSQL 16 (project default) allows trusted extension creation by database owners.
**Warning signs:** Backend starts but search returns empty results instead of matches.

### Pitfall 2: ILIKE performance on large datasets
**What goes wrong:** `ILIKE '%term%'` cannot use B-tree indexes and performs a sequential scan.
**Why it happens:** Leading wildcard prevents index use.
**How to avoid:** With ~750 total records across all entities, sequential scan is <1ms. Not a concern at current scale. If performance becomes an issue in the future, consider `ILIKE 'term%'` (prefix-only) or require pg_trgm.
**Warning signs:** None at current scale.

### Pitfall 3: app.state initialization timing
**What goes wrong:** Accessing `request.app.state.has_trgm` before lifespan startup completes raises `AttributeError`.
**Why it happens:** Request handlers should not run until lifespan `yield`, but defensive code is wise.
**How to avoid:** Use `getattr(request.app.state, 'has_trgm', False)` in callers for safety.
**Warning signs:** 500 error on first request with `AttributeError: has_trgm`.

### Pitfall 4: Overwrite mode not passing mode to the useImportGrtPowders hook
**What goes wrong:** The `useImportGrtPowders` hook's `mutationFn` hardcodes `importGrtPowders(file)` without an overwrite parameter. The overwrite path in the page bypasses the hook and calls the API directly.
**Why it happens:** The hook was built for initial import only; overwrite was added later.
**How to avoid:** This is actually fine -- the page's `handleOverwriteDuplicates` correctly calls `importGrtPowders(lastImportFile, true)` directly. The fix only needs to change the query parameter name in `api.ts`.
**Warning signs:** None -- this is by design.

### Pitfall 5: SQLite test compatibility with ILIKE fallback
**What goes wrong:** Tests run on SQLite where `ILIKE` is not natively supported as a keyword.
**Why it happens:** SQLite does not have ILIKE.
**How to avoid:** SQLAlchemy's `.ilike()` method is implemented as `LIKE` with a case-insensitive collation on SQLite, so it works correctly. The existing test infrastructure (which uses SQLite) will work with the ILIKE fallback path.
**Warning signs:** Test failures with "no such function: ILIKE".

## Code Examples

### Example 1: Lifespan with pg_trgm setup

```python
# backend/app/main.py - Updated lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created (create_all fallback)")

    # Create pg_trgm extension and GIN indexes
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
            for idx_sql in [
                "CREATE INDEX IF NOT EXISTS ix_powders_name_trgm ON powders USING gin (name gin_trgm_ops)",
                "CREATE INDEX IF NOT EXISTS ix_powders_mfg_trgm ON powders USING gin (manufacturer gin_trgm_ops)",
                "CREATE INDEX IF NOT EXISTS ix_bullets_name_trgm ON bullets USING gin (name gin_trgm_ops)",
                "CREATE INDEX IF NOT EXISTS ix_bullets_mfg_trgm ON bullets USING gin (manufacturer gin_trgm_ops)",
                "CREATE INDEX IF NOT EXISTS ix_cartridges_name_trgm ON cartridges USING gin (name gin_trgm_ops)",
            ]:
                await conn.execute(text(idx_sql))
        app.state.has_trgm = True
        logger.info("pg_trgm extension and GIN indexes ready")
    except Exception as e:
        app.state.has_trgm = False
        logger.warning("pg_trgm unavailable (%s) - fuzzy search will use ILIKE fallback", e)

    # Seed initial data
    async with async_session_factory() as session:
        await seed_initial_data(session)

    yield
```

### Example 2: Search service with ILIKE fallback

```python
# backend/app/services/search.py - Updated apply_fuzzy_search
def apply_fuzzy_search(
    query,
    model,
    search_term: str,
    fields: list[str] | None = None,
    has_trgm: bool = True,
):
    if fields is None:
        fields = ["name", "manufacturer"]

    search_columns = [getattr(model, f) for f in fields if hasattr(model, f)]
    if not search_columns:
        return query

    if has_trgm:
        conditions = [col.op("%")(search_term) for col in search_columns]
        query = query.where(or_(*conditions))
        query = query.order_by(
            func.similarity(search_columns[0], search_term).desc(),
            model.quality_score.desc(),
        )
    else:
        pattern = f"%{search_term}%"
        conditions = [col.ilike(pattern) for col in search_columns]
        query = query.where(or_(*conditions))
        query = query.order_by(model.quality_score.desc())

    return query
```

### Example 3: Caller passes has_trgm from app.state

```python
# In powders.py, bullets.py, cartridges.py list endpoints:
from fastapi import Request

async def list_powders(
    request: Request,  # ADD this parameter
    db: AsyncSession = Depends(get_db),
    q: str | None = Query(None, min_length=3),
    # ... other params
):
    query = select(Powder)
    if q:
        has_trgm = getattr(request.app.state, "has_trgm", False)
        query = apply_fuzzy_search(query, Powder, q, has_trgm=has_trgm)
    # ...
```

### Example 4: Fixed frontend GrtImportResult and api.ts

```typescript
// types.ts
export interface GrtImportResult {
  created: Powder[];
  updated: Powder[];  // NEW
  skipped: string[];
  errors: string[];
  mode: string;       // NEW
}

// Bullet interface
export interface Bullet {
  // ...
  length_mm: number | null;   // CHANGED from number
  bc_g7: number | null;       // CHANGED from number
  // ...
  model_number?: string | null;   // NEW
  bullet_type?: string | null;    // NEW
  base_type?: string | null;      // NEW
}
```

```typescript
// api.ts
export async function importGrtPowders(file: File, overwrite: boolean = false): Promise<GrtImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  // FIXED: was ?overwrite=true, now ?mode=overwrite
  const url = `${API_PREFIX}/powders/import-grt${overwrite ? '?mode=overwrite' : ''}`;
  // ...
}
```

## Open Questions

1. **Should `%query%` or `query%` be used for ILIKE fallback?**
   - What we know: `%query%` (contains) is more forgiving but slower; `query%` (prefix) is faster but less useful for typos.
   - Recommendation: Use `%query%` for consistency with pg_trgm's behavior (which also matches substrings). Performance is irrelevant at ~750 records. This is within Claude's discretion per CONTEXT.md.

2. **Should missing TS fields (model_number, bullet_type, etc.) be added in this phase?**
   - What we know: CONTEXT.md says "audit ALL TypeScript interfaces" and "fix any other mismatches found during audit." These are legitimate mismatches.
   - Recommendation: Yes, add them as `string | null` optional fields. Low risk, enables Phase 6 UI work.

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `backend/app/main.py` (lifespan lacks pg_trgm/GIN setup)
- Direct code inspection of `backend/app/services/search.py` (no ILIKE fallback)
- Direct code inspection of `frontend/src/lib/api.ts` line 109 (`?overwrite=true` vs backend's `?mode=overwrite`)
- Direct code inspection of `frontend/src/lib/types.ts` lines 95-98 (`length_mm: number`, `bc_g7: number`)
- Direct code inspection of `backend/app/schemas/bullet.py` lines 52-53 (`length_mm: float | None`, `bc_g7: float | None`)
- Direct code inspection of `backend/app/schemas/powder.py` lines 171-176 (GrtImportResult with `updated` and `mode`)
- Direct code inspection of `backend/app/api/powders.py` line 120 (`mode: ImportMode = Query(ImportMode.skip)`)

### Secondary (MEDIUM confidence)
- PostgreSQL 16 documentation: pg_trgm is a trusted extension (can be created by database owners without superuser)
- SQLAlchemy documentation: `.ilike()` is cross-database compatible

## Metadata

**Confidence breakdown:**
- Bug identification: HIGH - all 4 bugs confirmed by direct code comparison
- Fix approach: HIGH - standard patterns (raw SQL, app.state, interface updates)
- Pitfalls: HIGH - tested mental models against codebase structure
- TS audit completeness: HIGH - compared all 6 response schemas against all TS interfaces field-by-field

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (stable -- no library changes expected)
