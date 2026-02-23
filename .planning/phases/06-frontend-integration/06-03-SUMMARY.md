---
phase: 06-frontend-integration
plan: 03
subsystem: ui
tags: [react, modal, picker, search, debounce, tanstack-query, simulation-form]

# Dependency graph
requires:
  - phase: 04-search-and-pagination
    provides: server-side pagination and fuzzy search on powders/bullets/cartridges endpoints
  - phase: 06-01
    provides: useDebounce hook, ListParams interface, buildQueryString helper
provides:
  - Generic ComponentPicker modal component for searchable server-side entity selection
  - SimulationForm with picker chips replacing flat Select dropdowns for bullet and powder
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [generic modal picker with useQuery internal fetching, clickable chip trigger pattern for modal open]

key-files:
  created:
    - frontend/src/components/pickers/ComponentPicker.tsx
  modified:
    - frontend/src/components/forms/SimulationForm.tsx
    - frontend/src/app/simulate/page.tsx

key-decisions:
  - "ComponentPicker uses internal useQuery for data fetching (not entity-specific hooks) to remain fully generic across all component types"
  - "SimulationForm no longer receives bullets/powders as props; pickers fetch their own data on-demand when modal opens"
  - "Rifle selection remains flat Select dropdown (only 5 records) per research recommendation"

patterns-established:
  - "Picker chip pattern: clickable div with ChevronDown icon that opens modal overlay"
  - "Generic modal component with fetchFn/renderItem/getId props for reuse across entity types"

requirements-completed: [SRC-04]

# Metrics
duration: 3min
completed: 2026-02-23
---

# Phase 6 Plan 3: Picker Modals Summary

**Generic searchable ComponentPicker modal replacing flat Select dropdowns in SimulationForm for bullet and powder selection with debounced server-side search**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T19:18:00Z
- **Completed:** 2026-02-23T19:21:04Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created generic ComponentPicker modal (207 lines) with debounced search, loading spinner, empty states, selected item highlighting, Escape/backdrop close
- Replaced bullet and powder flat Select dropdowns in SimulationForm with clickable chip/card elements that open ComponentPicker modals
- Simplified SimulationForm props API by removing bullets/powders array dependencies (pickers fetch their own data)
- Cleaned up simulate/page.tsx by removing unused useBullets/usePowders hooks

## Task Commits

Each task was committed atomically:

1. **Task 1: Create generic ComponentPicker modal** - `09e53e9` (feat)
2. **Task 2: Replace SimulationForm Select dropdowns with ComponentPicker chips** - `4577020` (feat)

## Files Created/Modified
- `frontend/src/components/pickers/ComponentPicker.tsx` - Generic searchable modal picker with TanStack Query internal fetching, debounced search (300ms), loading/empty states
- `frontend/src/components/forms/SimulationForm.tsx` - Replaced bullet/powder Select dropdowns with clickable chips + ComponentPicker modals; removed bullets/powders from props interface
- `frontend/src/app/simulate/page.tsx` - Removed useBullets/usePowders hooks and bullets/powders prop passing; kept useRifles for barrel length lookup

## Decisions Made
- ComponentPicker uses `useQuery` internally with the `fetchFn` prop rather than entity-specific hooks, keeping it fully generic and reusable for any paginated entity type.
- SimulationForm no longer takes `bullets: Bullet[]` and `powders: Powder[]` props -- the pickers fetch their own data on-demand when the modal opens (`enabled: open`), reducing unnecessary upfront data loading on the simulate page.
- Rifle selection kept as flat `<Select>` dropdown since there are only 5 records and the overhead of a modal picker is not justified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 6 is now fully complete (3/3 plans delivered)
- All frontend integration work done: quality badges, pagination, and searchable picker modals
- v1.2 milestone (Component Databases + Search) ready for final review

## Self-Check: PASSED

- FOUND: frontend/src/components/pickers/ComponentPicker.tsx (207 lines, exceeds min_lines: 80)
- FOUND: frontend/src/components/forms/SimulationForm.tsx (contains ComponentPicker imports)
- FOUND: frontend/src/app/simulate/page.tsx (no longer passes bullets/powders props)
- Commit 09e53e9 verified in git log
- Commit 4577020 verified in git log
- TypeScript compilation: zero errors

---
*Phase: 06-frontend-integration*
*Completed: 2026-02-23*
