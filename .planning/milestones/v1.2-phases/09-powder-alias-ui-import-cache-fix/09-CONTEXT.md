# Phase 9: Powder Alias UI + Import Cache Fix - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Make powder aliases visible on the powder list page, apply alias mappings during GRT import, and fix the overwrite import flow so the UI refreshes correctly. No new import sources, no alias editing UI, no alias search/filter capabilities.

</domain>

<decisions>
## Implementation Decisions

### Alias indicator on powder list
- Small badge next to powder name, count format: "3 aliases"
- Neutral/blue color palette — distinct from quality badges (red/yellow/green)
- Only shown on powders that have an alias_group value set
- Badge appears in the same row as the powder name, after the QualityBadge

### Alias detail interaction
- Tooltip on hover over the alias badge — consistent with QualityBadge hover pattern
- Tooltip shows all linked powder names with their manufacturer
- Format: "ADI AR2208 (ADI) | Hodgdon Varget (Hodgdon)" — name (manufacturer) per line
- No modal or inline expansion — tooltip is sufficient for this info density

### Import result feedback
- Toast notification after GRT import completes (using existing Toast component)
- Normal import: "Imported X powders (Y aliases linked, Z skipped)"
- Overwrite import: "Updated X powders (Y aliases linked)"
- Powder list auto-refreshes after import via TanStack Query cache invalidation

### Claude's Discretion
- Exact badge color shade and styling within blue/neutral palette
- Tooltip positioning, max-width, and formatting details
- Toast duration and placement
- Cache invalidation technical approach (queryClient.invalidateQueries pattern)
- Alias mapping logic internals during GRT import
- Error handling for missing alias mappings

</decisions>

<specifics>
## Specific Ideas

- Alias badge should follow the same visual language as QualityBadge (small, inline, with hover detail)
- Toast feedback keeps the user informed without blocking their workflow
- The overwrite+refresh fix is purely a cache invalidation bug — should be invisible to the user when working correctly

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-powder-alias-ui-import-cache-fix*
*Context gathered: 2026-02-24*
