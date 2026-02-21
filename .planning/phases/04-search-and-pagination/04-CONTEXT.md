# Phase 4: Search and Pagination - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend API layer: add fuzzy text search (pg_trgm), server-side pagination, and multi-field filtering to all component list endpoints (powders, bullets, cartridges, rifles). Frontend integration (picker modals, pagination UI) is Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Pagination defaults
- Default page size: 50 items
- Maximum page size cap: 200 items (reject requests above this)
- Default sort order: quality score descending (best-validated records first)
- Sort is user-configurable via query params: `?sort=name|manufacturer|quality_score&order=asc|desc`

### Search behavior
- Fuzzy search matches against name + manufacturer fields (not all text fields)
- Minimum query length: 3 characters (below this, return unfiltered results or error)
- Search uses pg_trgm extension for typo tolerance

### Filter categories
- Powders: filter by manufacturer and burn rate range — NO caliber filter (powders are caliber-agnostic)
- Bullets and cartridges: filter by caliber family grouping
- Quality filter: dual mode — quick filter by badge tier (green/yellow/red) AND optional minimum score threshold
- Manufacturer list: derived dynamically from existing records (SELECT DISTINCT), no hardcoded list

### Claude's Discretion
- Search result ranking strategy (similarity score, tie-breaking with quality, etc.)
- Similarity threshold cutoff vs return-all-ranked approach for pg_trgm
- Paginated response envelope format (JSON body vs headers for metadata)
- Whether search + filter + pagination compose freely (AND logic) or search overrides filters
- Whether to modify existing GET endpoints in-place or create separate /search routes
- Backward compatibility strategy with existing frontend code (minimize rework before Phase 6)
- Caliber family grouping approach for bullets/cartridges (bore diameter ranges vs named groups)

</decisions>

<specifics>
## Specific Ideas

- Requirements SRC-01, SRC-02, SRC-03 define the success criteria
- pg_trgm is the chosen search technology (Elasticsearch explicitly out of scope per REQUIREMENTS.md)
- Must handle datasets of 200+ powders, 100-200 bullets, 50+ cartridges (Phase 5 import volumes)
- 100ms search response time target from success criteria

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-search-and-pagination*
*Context gathered: 2026-02-21*
