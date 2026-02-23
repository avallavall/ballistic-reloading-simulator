# Phase 8: Frontend Filter & Search Controls - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Add filter dropdowns (manufacturer, caliber family, quality level) and a search input to component list pages (/powders, /bullets, /cartridges). Wire ListParams to pass filter query params to backend endpoints that already support them (Phase 4). Filters combine with existing pagination (Phase 6) using AND logic.

</domain>

<decisions>
## Implementation Decisions

### Filter bar layout
- Horizontal bar above the table, between page header and table content
- Filters left-aligned (manufacturer, caliber family, quality level dropdowns)
- Search input right-aligned in the same bar
- All three filter dropdowns always visible (no collapsible panel)

### Search input design
- Search-as-you-type with ~300ms debounce (reuse useDebounce from Phase 6)
- Placeholder text: "Buscar por nombre..."
- Clear (X) button inside the input when text is present
- Triggers the same `q` query param already supported by backend

### Filter interaction
- Auto-apply on dropdown change (no explicit submit/apply button)
- "Limpiar filtros" link appears when any filter or search is active
- Changing any filter resets pagination to page 1
- Dropdown options populated from `/manufacturers` and `/caliber-families` dynamic endpoints
- Quality level dropdown uses static options: all, high, medium, low

### Empty & loading states
- Zero results: "No se encontraron resultados" message with "Limpiar filtros" button
- Use keepPreviousData (already in place from Phase 6) so table doesn't flash empty during filter changes
- No additional skeleton/spinner needed beyond what Phase 6 already provides

### Claude's Discretion
- Exact spacing and sizing of filter bar elements
- Whether to use native select or custom dropdown component
- Responsive behavior on narrow viewports
- Filter bar visual styling (borders, background, shadows)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User indicated standard data-table filter patterns (Linear, Notion style) are appropriate.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-frontend-filter-search-controls*
*Context gathered: 2026-02-23*
