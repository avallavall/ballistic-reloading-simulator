# Phase 6: Frontend Integration - Research

**Researched:** 2026-02-23
**Domain:** React/Next.js frontend -- quality badges, searchable picker modals, paginated tables
**Confidence:** HIGH

## Summary

This phase is entirely frontend work: the backend APIs (quality scoring, search/pagination, fuzzy search) are complete and tested. The task is to wire these APIs into the existing React/Next.js frontend by (1) adding quality badge columns to bullets and cartridges tables (powders already have them), (2) replacing flat `<Select>` dropdowns in the simulation form with searchable picker modals, and (3) adding server-side pagination controls to the three component list pages.

No new npm dependencies are needed. The project already has TanStack React Query v5, lucide-react for icons, and Tailwind CSS for styling. The existing Badge component supports the three quality variants (success/warning/danger). The backend returns `PaginatedResponse<T>` with `{items, total, page, size}` and the hooks already unwrap `.items` via TanStack Query `select`. The key technical patterns are: `keepPreviousData` from `@tanstack/react-query` for smooth pagination transitions, debounced search input for the picker modal, and a reusable `QualityBadge` component with CSS-only hover tooltip (matching the pattern already used in the powders page).

**Primary recommendation:** Build three reusable components (QualityBadge, Pagination, ComponentPicker) then integrate them into existing pages. Modify hooks and API functions to accept pagination/search parameters. No new dependencies required.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Quality badge design: Colored dot + text label format (e.g., green dot + "Complete", yellow dot + "Partial", red dot + "Minimal")
- Dedicated "Quality" column in component list tables (powders, bullets, cartridges)
- Hover tooltip on badge shows quality breakdown: which key fields are filled vs missing
- Color mapping: Green = all key fields present, Yellow = some fields missing, Red = minimal data only
- Modal dialog overlay (not inline dropdown) for powder, bullet, and cartridge selection in simulation form
- Debounced text input at top of modal for search (300ms debounce)
- Results list below search showing: name, manufacturer, and 2-3 key specs per item type
- Single-click on result selects the item and closes the modal
- Currently selected item shown as a clickable card/chip that opens the picker
- Page numbers with prev/next arrow buttons, positioned at bottom of table
- Default 20 items per page, with items-per-page selector (10 / 20 / 50)
- keepPreviousData enabled via TanStack Query to prevent content flash during page transitions
- Current page number persisted in component state (resets on filter/search change)
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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QLT-01 | All component records display quality/completeness badges (green = well-validated, yellow = estimated, red = sparse data) | Backend already returns `quality_score`, `quality_level`, `quality_tooltip` on all three entity types. Powders page already renders these. Bullets and cartridges pages need the same Quality column added. Reusable QualityBadge component pattern from powders page can be extracted and shared. |
| SRC-04 | Simulation form replaces flat `<Select>` dropdowns with searchable picker modals for powder, bullet, and cartridge selection | Backend list endpoints accept `q` param (min 3 chars) for fuzzy search, plus `page`/`size` for pagination. Need new ComponentPicker modal component with debounced search input. SimulationForm currently receives pre-fetched arrays via props; must be refactored to let picker do its own fetching. |
| SRC-05 | Frontend pagination with smooth transitions (TanStack Query keepPreviousData) | TanStack Query v5 exports `keepPreviousData` function as `placeholderData` option. API functions need query params support. Hooks need page/size state. Pagination controls component needed at bottom of tables. |

</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.59.0 | Server state, caching, pagination | Already used for all data fetching; `keepPreviousData` is a built-in v5 export |
| lucide-react | ^0.447.0 | Icons (ChevronLeft, ChevronRight, Search, X) | Already used throughout the project |
| tailwindcss | ^3.4.13 | Styling, skeleton animations | Already configured with dark mode |
| clsx + tailwind-merge | ^2.1.1 / ^2.5.3 | Class name composition | Already used via `cn()` utility |

### Supporting (No New Dependencies)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React.useState/useCallback | 18.3.1 | Local pagination state, debounce | Page number, search input state |
| React.useEffect/useRef | 18.3.1 | Debounce timer, modal focus trap | Search input debouncing, keyboard nav |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom modal | @headlessui/react Dialog | Adds dependency; project already uses custom CSS modals. Custom modal is fine for this scope |
| Custom toast | react-hot-toast or sonner | Adds dependency; lightweight custom toast is simpler for single error notification pattern |
| Custom debounce | lodash.debounce / use-debounce | Adds dependency; a 5-line custom hook using setTimeout is sufficient |

**Installation:** None required. All dependencies are already in `package.json`.

## Architecture Patterns

### Recommended File Structure
```
frontend/src/
├── components/
│   ├── ui/
│   │   ├── QualityBadge.tsx     # NEW: Reusable quality badge with tooltip
│   │   ├── Pagination.tsx       # NEW: Page controls (prev/next, page numbers, size selector)
│   │   ├── SkeletonRows.tsx     # NEW: Skeleton placeholder rows for tables
│   │   └── Toast.tsx            # NEW: Non-blocking error toast (auto-dismiss 5s)
│   └── pickers/
│       └── ComponentPicker.tsx  # NEW: Searchable modal picker (generic for powder/bullet/cartridge)
├── hooks/
│   ├── useDebounce.ts           # NEW: Custom debounce hook for search input
│   ├── usePowders.ts            # MODIFIED: Add params (page, size, q) to query
│   ├── useBullets.ts            # MODIFIED: Add params (page, size, q) to query
│   └── useCartridges.ts         # MODIFIED: Add params (page, size, q) to query
├── lib/
│   └── api.ts                   # MODIFIED: Add query param support to getPowders/getBullets/getCartridges
├── app/
│   ├── powders/page.tsx         # MODIFIED: Add pagination controls, use paginated hook
│   ├── bullets/page.tsx         # MODIFIED: Add quality column + pagination controls
│   ├── cartridges/page.tsx      # MODIFIED: Add quality column + pagination controls
│   └── simulate/page.tsx        # MODIFIED: Minor -- SimulationForm changes are internal
└── components/forms/
    └── SimulationForm.tsx       # MODIFIED: Replace Select with ComponentPicker chips
```

### Pattern 1: Paginated Hook with keepPreviousData
**What:** Convert hooks from fetching all items to fetching paginated results with smooth transitions.
**When to use:** All three component list hooks (usePowders, useBullets, useCartridges).
**Example:**
```typescript
// Source: TanStack Query v5 docs - paginated queries
import { useQuery, keepPreviousData } from '@tanstack/react-query';

interface PaginationParams {
  page?: number;
  size?: number;
  q?: string;
}

export function usePowdersPaginated(params: PaginationParams = {}) {
  const { page = 1, size = 20, q } = params;
  return useQuery({
    queryKey: ['powders', { page, size, q }],
    queryFn: () => getPowders({ page, size, q }),
    placeholderData: keepPreviousData,
  });
}

// Keep original usePowders() for backward compatibility (simulation form, etc.)
export function usePowders() {
  return useQuery({
    queryKey: ['powders'],
    queryFn: getPowders,
    select: (data) => data.items,
  });
}
```

### Pattern 2: API Function with Query Parameters
**What:** Extend API functions to pass search/pagination params as URL query strings.
**When to use:** getPowders, getBullets, getCartridges.
**Example:**
```typescript
// Source: existing api.ts pattern
interface ListParams {
  page?: number;
  size?: number;
  q?: string;
}

export async function getPowders(params: ListParams = {}): Promise<PaginatedResponse<Powder>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.size) searchParams.set('size', String(params.size));
  if (params.q) searchParams.set('q', params.q);
  const qs = searchParams.toString();
  return request<PaginatedResponse<Powder>>(`/powders${qs ? `?${qs}` : ''}`);
}
```

### Pattern 3: Debounce Hook
**What:** Custom hook to debounce search input before triggering API calls.
**When to use:** Search input in ComponentPicker modal and potentially list pages.
**Example:**
```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
```

### Pattern 4: QualityBadge with CSS-Only Tooltip
**What:** Reusable badge component that renders quality_level as colored dot + label with hover tooltip.
**When to use:** Quality column in powders, bullets, cartridges tables.
**Example:**
```typescript
// Source: existing powders/page.tsx pattern (lines 706-715)
// Extract into QualityBadge.tsx
interface QualityBadgeProps {
  score: number;
  level: string;  // "success" | "warning" | "danger"
  tooltip: string;
}

export default function QualityBadge({ score, level, tooltip }: QualityBadgeProps) {
  const labels = { success: 'Completo', warning: 'Parcial', danger: 'Minimo' };
  const dotColors = { success: 'bg-green-400', warning: 'bg-yellow-400', danger: 'bg-red-400' };
  return (
    <span className="group relative inline-flex items-center gap-1.5 cursor-default">
      <span className={`h-2 w-2 rounded-full ${dotColors[level]}`} />
      <Badge variant={level as 'success' | 'warning' | 'danger'}>
        {score} - {labels[level] ?? level}
      </Badge>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
        whitespace-nowrap rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-200
        opacity-0 transition-opacity group-hover:opacity-100 border border-slate-600 shadow-lg z-10">
        {tooltip}
      </span>
    </span>
  );
}
```

### Pattern 5: ComponentPicker Modal
**What:** Modal overlay with debounced search, result list, and single-click selection.
**When to use:** SimulationForm for powder, bullet, and cartridge selection (replaces flat `<Select>` dropdowns).
**Example:**
```typescript
// Generic picker pattern
interface ComponentPickerProps<T> {
  open: boolean;
  onClose: () => void;
  onSelect: (item: T) => void;
  title: string;
  queryKey: string;        // 'powders' | 'bullets' | 'cartridges'
  fetchFn: (params: ListParams) => Promise<PaginatedResponse<T>>;
  renderItem: (item: T) => React.ReactNode;
}
```

### Anti-Patterns to Avoid
- **Fetching all items client-side then filtering:** The backend already supports server-side search and pagination. Never load 200+ items into the browser and filter locally.
- **Using `select` with paginated hooks to unwrap `.items`:** When using `keepPreviousData`, the `select` function runs on the placeholder data too. Keep the full `PaginatedResponse` in the hook return to access `total`, `page`, `size`.
- **Resetting page to 1 after every keystroke:** Use debounced search value for the query key, but reset page to 1 only when the debounced value changes (not every keystroke).
- **Creating modal state in parent, passing down:** Keep modal open/close state co-located with the picker component via a wrapper hook or compound component pattern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Previous data retention during pagination | Custom caching logic | `keepPreviousData` from `@tanstack/react-query` | Handles edge cases (stale time, cache invalidation, race conditions) |
| URL search parameter encoding | Manual string concatenation | `URLSearchParams` (Web API) | Handles special characters, encoding automatically |
| Focus trapping in modal | Custom keyboard event listeners | `onKeyDown` handler for Escape + `autoFocus` on input | Full focus trapping not needed for this simple picker modal; Escape to close + autofocus covers UX needs |
| Skeleton loading animation | Custom CSS keyframes | Tailwind's built-in `animate-pulse` class | Already available in Tailwind config |

**Key insight:** All the complex infrastructure (fuzzy search, quality scoring, pagination) is backend-side. The frontend work is purely UI wiring -- keep components simple and thin.

## Common Pitfalls

### Pitfall 1: TanStack Query v5 `keepPreviousData` Import
**What goes wrong:** Using the old v4 pattern `keepPreviousData: true` as a top-level query option.
**Why it happens:** Many blog posts/examples reference v4 syntax.
**How to avoid:** In TanStack Query v5, import the function: `import { keepPreviousData } from '@tanstack/react-query'` and pass it as `placeholderData: keepPreviousData`.
**Warning signs:** TypeScript error saying `keepPreviousData` is not a valid option for `useQuery`.

### Pitfall 2: Breaking Backward Compatibility of Existing Hooks
**What goes wrong:** Changing `usePowders()` to require pagination params breaks SimulationForm, LadderTest, ParametricSearch, and other pages that call `usePowders()` and expect a flat array.
**Why it happens:** Multiple pages depend on the original hook returning `Powder[]` (via `select: data => data.items`).
**How to avoid:** Keep the original `usePowders()` unchanged for backward compatibility. Create a new `usePowdersPaginated(params)` hook for list pages. Alternatively, make params optional with sensible defaults and keep the `select` unwrap only in the original hook.
**Warning signs:** TypeScript errors in simulate/page.tsx, ladder/page.tsx, powders/search/page.tsx.

### Pitfall 3: Debounce Timer Memory Leak
**What goes wrong:** Not cleaning up setTimeout in the debounce hook causes state updates on unmounted components.
**Why it happens:** Forgetting the cleanup return in `useEffect`.
**How to avoid:** Always return `() => clearTimeout(timer)` in the debounce useEffect.
**Warning signs:** React warning about state update on unmounted component.

### Pitfall 4: Backend Search `q` Param Minimum Length
**What goes wrong:** Sending a 1-2 character search query to the backend fails with 422 Validation Error.
**Why it happens:** Backend declares `q: str | None = Query(None, min_length=3)` -- queries shorter than 3 chars are rejected.
**How to avoid:** Only send the `q` parameter when the debounced search string is 3+ characters. If fewer, omit `q` to get the full paginated list.
**Warning signs:** 422 errors in the browser console when user types 1-2 characters.

### Pitfall 5: Page Reset on Search Change
**What goes wrong:** User types a search query, results show page 2 of old data because the page state was not reset.
**Why it happens:** Page state and search state are independent. Changing search terms does not automatically reset page to 1.
**How to avoid:** Use a `useEffect` that watches the debounced search value and resets page to 1 when it changes.
**Warning signs:** Empty results or wrong results when searching because of stale page number > 1.

### Pitfall 6: Quality Fields Optional on Bullet/Cartridge Types
**What goes wrong:** Accessing `bullet.quality_score` or `bullet.quality_level` without null checks causes runtime errors.
**Why it happens:** In `types.ts`, Bullet and Cartridge have `quality_score?: number` and `quality_level?: string` (optional). Powder has them as required.
**How to avoid:** Either make these fields required in the TypeScript interface (the backend always returns them), or add null checks with defaults in the QualityBadge component.
**Warning signs:** `undefined` displayed in badge, or "Cannot read property of undefined" errors.

## Code Examples

Verified patterns from the existing codebase:

### Quality Badge Pattern (Already in Powders Page)
```typescript
// Source: frontend/src/app/powders/page.tsx lines 706-715
<span className="group relative inline-flex items-center cursor-default">
  <Badge variant={powder.quality_level as 'success' | 'warning' | 'danger'}>
    {powder.quality_score}
  </Badge>
  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
    whitespace-nowrap rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-200
    opacity-0 transition-opacity group-hover:opacity-100 border border-slate-600 shadow-lg z-10">
    {powder.quality_tooltip}
  </span>
</span>
```

### Existing Hook with `select` Unwrap Pattern
```typescript
// Source: frontend/src/hooks/usePowders.ts
export function usePowders() {
  return useQuery({
    queryKey: ['powders'],
    queryFn: getPowders,
    select: (data) => data.items,  // Unwraps PaginatedResponse to Powder[]
  });
}
```

### Backend Pagination Response Shape
```json
// Source: backend/app/services/pagination.py + backend/app/schemas/bullet.py
{
  "items": [{ "id": "...", "name": "...", "quality_score": 85, "quality_level": "success", "quality_tooltip": "85/100 — Fabricante — 8/8 campos" }],
  "total": 127,
  "page": 1,
  "size": 20
}
```

### Backend Search API Parameters (All Three Endpoints)
```
GET /api/v1/powders?q=hodg&page=1&size=20
GET /api/v1/bullets?q=sierra&page=1&size=20&caliber_family=.308
GET /api/v1/cartridges?q=win&page=1&size=20
```

### Select Component Currently Used in SimulationForm
```typescript
// Source: frontend/src/components/forms/SimulationForm.tsx lines 124-135
<Select
  id="bullet"
  label="Seleccionar proyectil"
  placeholder="-- Seleccionar proyectil --"
  value={bulletId}
  onChange={(e) => setBulletId(e.target.value)}
  options={bullets.map((b) => ({
    value: b.id,
    label: `${b.name} - ${b.weight_grains}gr (BC G7: ${b.bc_g7})`,
  }))}
/>
// This must be replaced with a clickable chip/card that opens ComponentPicker modal
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| TanStack Query v4 `keepPreviousData: true` | v5 `placeholderData: keepPreviousData` (function import) | TanStack Query v5 (Oct 2023) | Must use new import syntax |
| `isPreviousData` flag | `isPlaceholderData` flag | TanStack Query v5 (Oct 2023) | Use for showing stale indicator during page transitions |
| Custom modal with Portal | Native `<dialog>` element or Headless UI | 2023+ | Project uses custom CSS overlays already; stick with that pattern |

**Deprecated/outdated:**
- `keepPreviousData: true` as a query option (v4 syntax) -- replaced by `placeholderData: keepPreviousData` function in v5
- `isPreviousData` -- replaced by `isPlaceholderData` in v5

## Open Questions

1. **Toast notification implementation**
   - What we know: User wants non-blocking, auto-dismiss after 5s toast for API errors
   - What's unclear: No toast infrastructure exists in the project currently. Errors are shown as inline Card elements.
   - Recommendation: Create a minimal Toast component using React portal + `setTimeout` for auto-dismiss. Position top-right. No library needed. Alternatively, could use the existing error card pattern as-is since it works. Keep scope small.

2. **Picker modal in LadderTest page**
   - What we know: LadderTest page also uses flat `<Select>` dropdowns for rifle, bullet, and powder selection (lines 78-91 of ladder/page.tsx)
   - What's unclear: Should pickers also replace dropdowns on LadderTest and ParametricSearch pages, or only on the main SimulationForm?
   - Recommendation: The requirements (SRC-04) specifically say "Simulation form replaces flat Select dropdowns." Focus on SimulationForm. LadderTest/ParametricSearch can be updated as a follow-up if desired, but they are out of scope for this requirement.

3. **Rifles pagination**
   - What we know: The rifles API currently returns `Rifle[]` (not paginated). There are only 5 rifles. The rifles page has no quality scoring.
   - What's unclear: Whether rifles page should also get pagination controls.
   - Recommendation: Skip rifles pagination. The requirements (QLT-01, SRC-04, SRC-05) are about powders, bullets, and cartridges. Rifles are few and don't have quality scores.

## Existing Codebase Observations

### What Already Works (Do Not Re-implement)
- **Powders page quality badge:** Already renders quality_score, quality_level, quality_tooltip with CSS-only hover tooltip (lines 706-715 of powders/page.tsx). Extract this into a reusable component.
- **Powders page source label:** Already shows data_source with `getSourceLabel()` utility.
- **Backend pagination:** All three list endpoints support `page`, `size`, `q`, `sort`, `order`, `quality_level`, `manufacturer`, `caliber_family` query params.
- **PaginatedResponse type:** Already defined in `types.ts` as `{ items: T[]; total: number; page: number; size: number }`.
- **Hooks with `select` unwrap:** All three hooks (usePowders, useBullets, useCartridges) use `select: (data) => data.items` for backward compat.

### What's Missing (Must Be Built)
1. **QualityBadge component** -- Extract from powders page into reusable `components/ui/QualityBadge.tsx`
2. **Pagination controls** -- New `components/ui/Pagination.tsx` (prev/next + page numbers + size selector)
3. **SkeletonRows** -- New `components/ui/SkeletonRows.tsx` (3-5 pulsing rows while loading)
4. **Toast** -- New `components/ui/Toast.tsx` (non-blocking error notification)
5. **ComponentPicker modal** -- New `components/pickers/ComponentPicker.tsx` (search + results + select)
6. **useDebounce hook** -- New `hooks/useDebounce.ts`
7. **API query param support** -- Modify `getPowders`, `getBullets`, `getCartridges` in `api.ts`
8. **Paginated hook variants** -- New `usePowdersPaginated`, `useBulletsPaginated`, `useCartridgesPaginated` hooks (or add optional params to existing hooks)
9. **Bullet/Cartridge quality columns** -- Add Quality column to bullets and cartridges table headers and rows
10. **SimulationForm picker integration** -- Replace three `<Select>` components with ComponentPicker chips

### Key Measurements
- **Powders in DB:** ~208 (from GRT import) -- too many for a flat dropdown
- **Bullets in DB:** ~127 (from fixture import) -- too many for a flat dropdown
- **Cartridges in DB:** ~53 (from fixture import) -- manageable but still benefits from search
- **Rifles in DB:** ~5 -- fine as flat dropdown, no change needed

## Sources

### Primary (HIGH confidence)
- Codebase inspection: All files listed in Architecture Patterns section read directly
- TanStack Query v5 migration guide (https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5) -- confirmed `keepPreviousData` API change
- TanStack Query v5 paginated queries guide (https://tanstack.com/query/v5/docs/framework/react/guides/paginated-queries) -- confirmed `placeholderData: keepPreviousData` pattern
- TanStack Query v5 placeholder data guide (https://tanstack.com/query/v5/docs/framework/react/guides/placeholder-query-data) -- confirmed `isPlaceholderData` flag

### Secondary (MEDIUM confidence)
- GitHub discussion on keepPreviousData deprecation (https://github.com/TanStack/query/discussions/6460) -- confirmed import pattern

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, versions verified in package.json
- Architecture: HIGH - Patterns derived from reading existing codebase; backend API fully inspected
- Pitfalls: HIGH - Identified from actual code inspection (optional types, min_length=3 constraint, v5 API changes)

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (stable; no fast-moving dependencies)
