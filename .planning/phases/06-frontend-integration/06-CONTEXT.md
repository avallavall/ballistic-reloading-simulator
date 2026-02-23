# Phase 6: Frontend Integration - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace flat Select dropdowns and plain tables with searchable picker modals, paginated tables, and quality badges. Affects component list pages (/powders, /bullets, /cartridges) and the simulation form. No new backend endpoints — consumes existing quality, search, and pagination APIs from Phases 3, 4, and 7.

</domain>

<decisions>
## Implementation Decisions

### Quality badge design
- Colored dot + text label format (e.g., green dot + "Complete", yellow dot + "Partial", red dot + "Minimal")
- Dedicated "Quality" column in component list tables (powders, bullets, cartridges)
- Hover tooltip on badge shows quality breakdown: which key fields are filled vs missing
- Color mapping: Green = all key fields present, Yellow = some fields missing, Red = minimal data only

### Picker modal behavior
- Modal dialog overlay (not inline dropdown) for powder, bullet, and cartridge selection in simulation form
- Debounced text input at top of modal for search (300ms debounce)
- Results list below search showing: name, manufacturer, and 2-3 key specs per item type (e.g., for powders: burn rate, force constant; for bullets: weight, caliber, BC)
- Single-click on result selects the item and closes the modal
- Currently selected item shown as a clickable card/chip that opens the picker

### Pagination controls
- Page numbers with prev/next arrow buttons, positioned at bottom of table
- Default 20 items per page, with items-per-page selector (10 / 20 / 50)
- keepPreviousData enabled via TanStack Query to prevent content flash during page transitions
- Current page number persisted in component state (resets on filter/search change)

### Empty and loading states
- Skeleton rows (3-5 placeholder rows with pulsing animation) while table data loads initially
- "No results found" message with suggestion to adjust search when search/filter returns empty
- Spinner inside picker modal while search results load
- Toast notifications for API errors (non-blocking, auto-dismiss after 5s)
- Picker modal shows "Type to search..." placeholder when no query entered

### Claude's Discretion
- Exact skeleton row design and animation
- Modal overlay opacity and backdrop behavior
- Toast notification positioning (top-right vs bottom-right)
- Exact debounce timing (300ms suggested, can adjust)
- Pagination button styling details

</decisions>

<specifics>
## Specific Ideas

- Quality badges should use the existing Badge component from `frontend/src/components/ui/` — extend with color variants if needed
- Picker modals should feel lightweight — not a full-page takeover. Think small/medium dialog centered on screen
- Tables already exist in all CRUD pages — pagination and quality columns are additions, not rewrites
- The existing `useSimulation` hook posts to `/simulate/direct` with component IDs — pickers just change how users select those IDs

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-frontend-integration*
*Context gathered: 2026-02-23*
