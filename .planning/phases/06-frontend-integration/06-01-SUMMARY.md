---
phase: 06-frontend-integration
plan: 01
subsystem: ui
tags: [react, tanstack-query, pagination, quality-badge, toast, debounce, keepPreviousData]

# Dependency graph
requires:
  - phase: 03-schema-and-quality-system
    provides: quality_score, quality_level, quality_tooltip fields on component APIs
  - phase: 04-search-and-pagination
    provides: server-side pagination with page/size/q query params on list endpoints
provides:
  - QualityBadge reusable component with colored dot, label, and CSS-only hover tooltip
  - Pagination controls with prev/next arrows, page numbers, and items-per-page selector
  - SkeletonRows animated placeholder rows for table loading state
  - Toast non-blocking auto-dismiss notification system via useToast hook
  - useDebounce hook for search input delay
  - ListParams interface and buildQueryString helper in api.ts
  - usePowdersPaginated, useBulletsPaginated, useCartridgesPaginated hooks with keepPreviousData
affects: [06-02-PLAN.md, 06-03-PLAN.md]

# Tech tracking
tech-stack:
  added: []
  patterns: [keepPreviousData for paginated queries, CSS-only tooltip via group-hover, React portal for toasts]

key-files:
  created:
    - frontend/src/components/ui/QualityBadge.tsx
    - frontend/src/components/ui/Pagination.tsx
    - frontend/src/components/ui/SkeletonRows.tsx
    - frontend/src/components/ui/Toast.tsx
    - frontend/src/hooks/useDebounce.ts
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/hooks/usePowders.ts
    - frontend/src/hooks/useBullets.ts
    - frontend/src/hooks/useCartridges.ts

key-decisions:
  - "Wrap existing hook queryFn references in arrow functions to preserve type inference after adding optional params"
  - "Paginated hooks use distinct queryKey prefix ['entity', 'list', {...}] to avoid cache collision with existing hooks"
  - "Toast uses React portal + useToast pattern instead of global state management"

patterns-established:
  - "Paginated hooks: queryKey = ['entity', 'list', { page, size, q }] with keepPreviousData"
  - "API functions with optional ListParams default and buildQueryString helper"
  - "QualityBadge component for consistent quality display across all entity pages"

requirements-completed: [QLT-01, SRC-04, SRC-05]

# Metrics
duration: 3min
completed: 2026-02-23
---

# Phase 6 Plan 1: Foundation Summary

**Reusable QualityBadge, Pagination, SkeletonRows, Toast components plus paginated TanStack Query hooks with keepPreviousData for smooth page transitions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T19:11:45Z
- **Completed:** 2026-02-23T19:15:03Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Created 5 new reusable UI components/hooks (QualityBadge, Pagination, SkeletonRows, Toast, useDebounce)
- Added ListParams query param support to getPowders/getBullets/getCartridges API functions
- Created 3 paginated hook variants with keepPreviousData alongside existing backward-compatible hooks
- Zero TypeScript compilation errors with full backward compatibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Create reusable UI components** - `618350c` (feat)
2. **Task 2: Add query param support and paginated hooks** - `377b3cb` (feat)

## Files Created/Modified
- `frontend/src/components/ui/QualityBadge.tsx` - Colored dot + label + CSS-only hover tooltip quality badge
- `frontend/src/components/ui/Pagination.tsx` - Page controls with prev/next, page numbers, items-per-page selector
- `frontend/src/components/ui/SkeletonRows.tsx` - Animated placeholder table rows for loading state
- `frontend/src/components/ui/Toast.tsx` - Non-blocking auto-dismiss toast notifications via useToast hook
- `frontend/src/hooks/useDebounce.ts` - Configurable debounce hook with proper setTimeout cleanup
- `frontend/src/lib/api.ts` - Added ListParams interface, buildQueryString helper, optional params on 3 GET functions
- `frontend/src/hooks/usePowders.ts` - Added usePowdersPaginated with keepPreviousData
- `frontend/src/hooks/useBullets.ts` - Added useBulletsPaginated with keepPreviousData
- `frontend/src/hooks/useCartridges.ts` - Added useCartridgesPaginated with keepPreviousData

## Decisions Made
- Wrapped existing hook queryFn references (`queryFn: getPowders` -> `queryFn: () => getPowders()`) to preserve TanStack Query type inference after adding optional ListParams parameter. Without this, TanStack Query would pass QueryFunctionContext as the first arg, breaking the type.
- Used distinct queryKey prefix `['entity', 'list', {...}]` for paginated hooks to prevent cache collisions with existing `['entity']` keys used by backward-compatible hooks.
- Toast uses React portal + useToast hook pattern for simplicity, avoiding external toast libraries.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed queryFn type inference break in existing hooks**
- **Found during:** Task 2 (modifying API function signatures)
- **Issue:** Changing `getPowders()` to `getPowders(params: ListParams = {})` caused TanStack Query to infer `never` for data type in existing hooks using `queryFn: getPowders` (direct reference). TanStack Query passes QueryFunctionContext as first arg to queryFn, which doesn't match ListParams.
- **Fix:** Wrapped direct function references in arrow functions: `queryFn: () => getPowders()` in all 3 existing hooks
- **Files modified:** frontend/src/hooks/usePowders.ts, useBullets.ts, useCartridges.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 377b3cb (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for TypeScript type safety. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All shared building blocks ready for 06-02 (list page integration) and 06-03 (picker modals)
- QualityBadge, Pagination, SkeletonRows components ready to drop into powders/bullets/cartridges pages
- Paginated hooks ready to replace existing usePowders/useBullets/useCartridges in list pages
- useDebounce and Toast ready for search modal implementation

## Self-Check: PASSED

- All 9 files verified present on disk
- Commit 618350c verified in git log
- Commit 377b3cb verified in git log
- TypeScript compilation: zero errors

---
*Phase: 06-frontend-integration*
*Completed: 2026-02-23*
