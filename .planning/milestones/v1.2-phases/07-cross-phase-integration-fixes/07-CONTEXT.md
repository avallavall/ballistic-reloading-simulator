# Phase 7: Cross-Phase Integration Fixes - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix 4 wiring bugs between completed phases so Docker boot, GRT import, and frontend type safety work correctly before building Phase 6 UI. All fixes are targeted — no new features, no refactoring beyond what's needed to close the gaps.

</domain>

<decisions>
## Implementation Decisions

### Search fallback behavior
- pg_trgm extension + GIN indexes created programmatically in lifespan startup (not just Alembic)
- Creation wrapped in try/except — if pg_trgm unavailable, log warning ONCE at startup
- Search service degrades to case-insensitive ILIKE when pg_trgm is not available
- A startup flag (e.g., `app.state.has_trgm`) controls which search path is used
- App never fails to start due to missing pg_trgm

### TypeScript audit scope
- Fix the 4 known mismatches (Bullet nullable fields, GrtImportResult interface, import mode param)
- Additionally audit ALL TypeScript interfaces in `types.ts` against backend Pydantic response schemas for nullable alignment
- Fix any other mismatches found during audit (proactive, not just reactive)

### Testing approach
- Unit tests for each individual fix (pg_trgm fallback, import mode param, nullable types)
- Integration test verifying fuzzy search endpoint works on fresh boot without manual `alembic upgrade head`
- Frontend type fixes verified by TypeScript compilation (no runtime tests needed)

### Claude's Discretion
- Exact implementation of the trgm availability flag mechanism
- Whether ILIKE fallback uses `%query%` or `query%` pattern
- Order of fixes within the single plan

</decisions>

<specifics>
## Specific Ideas

No specific requirements — these are well-defined bug fixes with clear before/after behavior.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-cross-phase-integration-fixes*
*Context gathered: 2026-02-23*
