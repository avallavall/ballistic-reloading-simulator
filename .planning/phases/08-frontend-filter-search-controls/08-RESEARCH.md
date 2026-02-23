# Phase 8: Frontend Filter & Search Controls - Research

**Researched:** 2026-02-23
**Domain:** Frontend UI (React/Next.js filter controls + TanStack Query integration)
**Confidence:** HIGH

## Summary

Phase 8 adds filter dropdowns (manufacturer, caliber family, quality level) and a search input to the three component list pages (/powders, /bullets, /cartridges). The backend already fully supports all required filter query parameters (Phase 4 complete): `manufacturer`, `caliber_family`, `quality_level`, `q`, `sort`, `order`. The backend also already provides `/manufacturers` and `/caliber-families` endpoints that return distinct values for dynamic dropdown population. The frontend already has `useDebounce` (300ms), `keepPreviousData` in paginated hooks, and the `ListParams` interface + `buildQueryString` function in `api.ts` -- but `ListParams` currently only includes `page`, `size`, `q` (missing filter fields), and `buildQueryString` only passes those three params.

The work is purely frontend: extend `ListParams` and `buildQueryString` to pass all filter params, add API functions for the /manufacturers and /caliber-families endpoints, create a reusable `FilterBar` component, wire filter state into the three list pages, and ensure filters combine with search and pagination using AND logic (filter change resets to page 1).

**Primary recommendation:** Extend `ListParams` interface with `manufacturer`, `caliber_family`, `quality_level`, `sort`, `order` fields. Update `buildQueryString` to serialize them. Create a single reusable `FilterBar` component using native `<select>` elements (existing `Select` component). Add API fetch functions and corresponding `useQuery` hooks for manufacturer/caliber-family endpoints. Wire FilterBar into all three list pages with local state per filter.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Horizontal filter bar above the table, between page header and table content
- Filters left-aligned (manufacturer, caliber family, quality level dropdowns)
- Search input right-aligned in the same bar
- All three filter dropdowns always visible (no collapsible panel)
- Search-as-you-type with ~300ms debounce (reuse useDebounce from Phase 6)
- Placeholder text: "Buscar por nombre..."
- Clear (X) button inside the input when text is present
- Triggers the same `q` query param already supported by backend
- Auto-apply on dropdown change (no explicit submit/apply button)
- "Limpiar filtros" link appears when any filter or search is active
- Changing any filter resets pagination to page 1
- Dropdown options populated from `/manufacturers` and `/caliber-families` dynamic endpoints
- Quality level dropdown uses static options: all, high, medium, low
- Zero results: "No se encontraron resultados" message with "Limpiar filtros" button
- Use keepPreviousData (already in place from Phase 6) so table doesn't flash empty during filter changes
- No additional skeleton/spinner needed beyond what Phase 6 already provides

### Claude's Discretion
- Exact spacing and sizing of filter bar elements
- Whether to use native select or custom dropdown component
- Responsive behavior on narrow viewports
- Filter bar visual styling (borders, background, shadows)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SRC-03 | User can filter components by manufacturer, caliber/caliber family, and quality level | Backend endpoints already support `manufacturer`, `caliber_family`, `quality_level` query params. Frontend needs `ListParams` extension + `buildQueryString` update + FilterBar component + page wiring. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.1 | Component framework | Already installed |
| Next.js | 14.2.15 | App Router pages | Already installed |
| TanStack React Query | 5.59.0 | Server state (fetching manufacturers/caliber-families + filter-aware queries) | Already installed, used by all hooks |
| Tailwind CSS | 3.4.13 | Styling | Already installed |
| lucide-react | 0.447.0 | Icons (Search, X, Filter) | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| useDebounce | custom hook | 300ms debounce for search input | Already exists at `frontend/src/hooks/useDebounce.ts` |
| Select (UI component) | custom | Native select dropdown with label/options | Already exists at `frontend/src/components/ui/Select.tsx` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<select>` via existing Select component | Custom dropdown (Headless UI, Radix) | Native select is simpler, consistent with existing codebase, no new dependencies. Custom dropdown gives better styling control but adds complexity. **Recommend native select** -- matches existing pattern used in bullets page (material select), and user left this to Claude's discretion. |

**Installation:**
```bash
# No new dependencies needed -- everything already installed
```

## Architecture Patterns

### Recommended File Changes
```
frontend/src/
├── lib/
│   ├── api.ts                    # MODIFY: extend ListParams, buildQueryString, add manufacturer/caliber API fns
│   └── types.ts                  # No changes needed (types already have caliber_family, quality_level)
├── hooks/
│   ├── usePowders.ts             # MODIFY: pass extended ListParams to usePowdersPaginated
│   ├── useBullets.ts             # MODIFY: pass extended ListParams to useBulletsPaginated
│   ├── useCartridges.ts          # MODIFY: pass extended ListParams to useCartridgesPaginated
│   └── useFilterOptions.ts       # NEW: useManufacturers(entity), useCaliberFamilies(entity) hooks
├── components/
│   └── filters/
│       └── FilterBar.tsx         # NEW: reusable filter bar component
└── app/
    ├── powders/page.tsx          # MODIFY: add filter state + FilterBar
    ├── bullets/page.tsx          # MODIFY: add filter state + FilterBar
    └── cartridges/page.tsx       # MODIFY: add filter state + FilterBar
```

### Pattern 1: Extended ListParams with buildQueryString
**What:** Add filter fields to `ListParams` interface and update `buildQueryString` to serialize them as URL query parameters.
**When to use:** Every paginated list fetch that needs filtering.
**Example:**
```typescript
// api.ts
export interface ListParams {
  page?: number;
  size?: number;
  q?: string;
  manufacturer?: string;
  caliber_family?: string;
  quality_level?: string;
  sort?: string;
  order?: string;
}

function buildQueryString(params: ListParams): string {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.size) sp.set('size', String(params.size));
  if (params.q && params.q.length >= 3) sp.set('q', params.q);
  if (params.manufacturer) sp.set('manufacturer', params.manufacturer);
  if (params.caliber_family) sp.set('caliber_family', params.caliber_family);
  if (params.quality_level) sp.set('quality_level', params.quality_level);
  if (params.sort) sp.set('sort', params.sort);
  if (params.order) sp.set('order', params.order);
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}
```

### Pattern 2: Filter Options Hooks (useManufacturers, useCaliberFamilies)
**What:** Lightweight `useQuery` hooks that call the backend `/manufacturers` and `/caliber-families` endpoints and cache the results.
**When to use:** Populate filter dropdown options dynamically.
**Example:**
```typescript
// hooks/useFilterOptions.ts
import { useQuery } from '@tanstack/react-query';
import { getPowderManufacturers, getBulletManufacturers, getBulletCaliberFamilies, getCartridgeCaliberFamilies } from '@/lib/api';

export function useManufacturers(entity: 'powders' | 'bullets') {
  const fetchFn = entity === 'powders' ? getPowderManufacturers : getBulletManufacturers;
  return useQuery({
    queryKey: [entity, 'manufacturers'],
    queryFn: fetchFn,
    staleTime: 5 * 60 * 1000, // 5 min cache -- manufacturers rarely change
  });
}

export function useCaliberFamilies(entity: 'bullets' | 'cartridges') {
  const fetchFn = entity === 'bullets' ? getBulletCaliberFamilies : getCartridgeCaliberFamilies;
  return useQuery({
    queryKey: [entity, 'caliber-families'],
    queryFn: fetchFn,
    staleTime: 5 * 60 * 1000,
  });
}
```

### Pattern 3: Reusable FilterBar Component
**What:** A single component that renders a horizontal bar with filter dropdowns and search input. Configurable per entity (which filters to show).
**When to use:** On powders, bullets, and cartridges list pages.
**Example:**
```typescript
// components/filters/FilterBar.tsx
interface FilterBarProps {
  // Search
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  // Manufacturer filter (powders + bullets only)
  manufacturers?: string[];
  selectedManufacturer?: string;
  onManufacturerChange?: (value: string) => void;

  // Caliber family filter (bullets + cartridges only)
  caliberFamilies?: string[];
  selectedCaliberFamily?: string;
  onCaliberFamilyChange?: (value: string) => void;

  // Quality level filter (all three entities)
  selectedQualityLevel?: string;
  onQualityLevelChange?: (value: string) => void;

  // Clear all
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}
```

### Pattern 4: Filter State in Pages + Reset to Page 1
**What:** Each list page manages filter state locally (useState) and resets `page` to 1 whenever any filter value changes.
**When to use:** All three list pages.
**Example:**
```typescript
export default function PowdersPage() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [qualityLevel, setQualityLevel] = useState('');

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Reset page when filters change
  const handleFilterChange = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const { data, isLoading, isPlaceholderData } = usePowdersPaginated({
    page,
    size,
    q: debouncedSearch || undefined,
    manufacturer: manufacturer || undefined,
    quality_level: qualityLevel || undefined,
  });
  // ...
}
```

### Pattern 5: Query Key includes all filter params
**What:** The paginated hooks include ALL filter params in the queryKey so TanStack Query properly caches and refetches when filters change.
**When to use:** In every `use*Paginated` hook.
**Example:**
```typescript
export function usePowdersPaginated(params: ListParams = {}) {
  const { page = 1, size = 20, q, manufacturer, caliber_family, quality_level, sort, order } = params;
  return useQuery({
    queryKey: ['powders', 'list', { page, size, q, manufacturer, caliber_family, quality_level, sort, order }],
    queryFn: () => getPowders({ page, size, q, manufacturer, caliber_family, quality_level, sort, order }),
    placeholderData: keepPreviousData,
  });
}
```

### Anti-Patterns to Avoid
- **Storing filter state in URL search params (for this phase):** Would add complexity (Next.js App Router `useSearchParams` + `useRouter` pushState). Keep it simple with local useState. URL sync can come later.
- **Separate API calls per filter change without debounce:** Search is debounced (300ms), but dropdown changes are instant (auto-apply). This is fine because dropdown changes are discrete events (one change = one request), unlike typing.
- **Duplicating FilterBar logic in each page:** Create one reusable component that accepts configuration props.
- **Forgetting to include new params in queryKey:** Would cause stale cache issues. All filter params MUST be in the queryKey.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debounced search input | Custom debounce | `useDebounce` hook (already exists) | Already battle-tested in ComponentPicker |
| Dropdown styling | Custom dropdown from scratch | Existing `Select` component | Already used in bullets page, consistent styling |
| Cache management | Manual fetch/cache | TanStack React Query `useQuery` with `keepPreviousData` | Already the pattern across the codebase |
| Icon rendering | Custom SVG | lucide-react `Search`, `X`, `Filter` icons | Already used everywhere |

**Key insight:** This phase is entirely wiring -- connecting existing backend capabilities to existing frontend patterns. Every building block (debounce, query hooks, select component, pagination, keepPreviousData) already exists. The risk is not missing technology but inconsistent integration.

## Common Pitfalls

### Pitfall 1: buildQueryString not passing new filter params
**What goes wrong:** `ListParams` gets extended but `buildQueryString` still only serializes `page`, `size`, `q`. Backend never receives filter params.
**Why it happens:** The integration gap identified in the phase description -- `buildQueryString` in `api.ts` is the single bottleneck.
**How to avoid:** Update `buildQueryString` FIRST and verify with a manual API call in the browser network tab.
**Warning signs:** Filters appear to "do nothing" -- the table doesn't change when selecting a filter.

### Pitfall 2: quality_level values not matching backend expectations
**What goes wrong:** Frontend sends "high" / "medium" / "low" but backend expects "success" / "warning" / "danger".
**Why it happens:** The CONTEXT.md mentions static options "all, high, medium, low" but the backend uses "success/warning/danger" mapped to score ranges: success=(70-100), warning=(40-69), danger=(0-39).
**How to avoid:** The dropdown display labels should be user-friendly Spanish ("Alta", "Media", "Baja") but the _values_ sent to the backend must be "success", "warning", "danger". Map display labels to backend values.
**Warning signs:** Quality filter returns empty results or 422 validation errors.

### Pitfall 3: Page not resetting to 1 when filters change
**What goes wrong:** User applies a filter while on page 5. The filtered dataset has only 2 pages. Page 5 returns empty results.
**Why it happens:** Filter state update doesn't trigger page reset.
**How to avoid:** Every filter setter function must also call `setPage(1)`.
**Warning signs:** Empty table after applying a filter that should have results.

### Pitfall 4: queryKey not including all filter params
**What goes wrong:** Stale data displayed. User changes filter but sees old results because TanStack Query serves cached data for the same queryKey.
**Why it happens:** Only `page`/`size`/`q` in queryKey, new filter params omitted.
**How to avoid:** queryKey must mirror all params passed to queryFn. Pattern: `['entity', 'list', { ...allParams }]`.
**Warning signs:** Results don't update until user navigates away and back.

### Pitfall 5: Cartridges don't have a manufacturer field
**What goes wrong:** Showing manufacturer dropdown on cartridges page when cartridges have no `manufacturer` column.
**Why it happens:** Cartridge model has no manufacturer column (see `cartridges.py` -- search is on `fields=["name"]` only). The backend cartridges endpoint has no `manufacturer` query param.
**How to avoid:** FilterBar must be configurable: powders get manufacturer + quality, bullets get manufacturer + caliber_family + quality, cartridges get caliber_family + quality only.
**Warning signs:** 422 error or ignored param on cartridges list if manufacturer param is sent.

### Pitfall 6: Empty string vs undefined for unset filters
**What goes wrong:** Sending `manufacturer=` (empty string) as a query param, which the backend may interpret differently from omitting the param entirely.
**Why it happens:** Select value defaults to empty string `""` when "all" option is selected.
**How to avoid:** In `buildQueryString`, only add params that are truthy. Empty string should be treated as "no filter". This is already the pattern for `q` (checks `params.q && params.q.length >= 3`).
**Warning signs:** Backend returns 0 results when "all" filter is selected.

## Code Examples

### API functions for manufacturer/caliber-family endpoints
```typescript
// api.ts - new functions
export async function getPowderManufacturers(): Promise<string[]> {
  return request<string[]>('/powders/manufacturers');
}

export async function getBulletManufacturers(): Promise<string[]> {
  return request<string[]>('/bullets/manufacturers');
}

export async function getBulletCaliberFamilies(): Promise<string[]> {
  return request<string[]>('/bullets/caliber-families');
}

export async function getCartridgeCaliberFamilies(): Promise<string[]> {
  return request<string[]>('/cartridges/caliber-families');
}
```

### Quality level mapping (display label -> backend value)
```typescript
const QUALITY_OPTIONS = [
  { value: '', label: 'Todas las calidades' },
  { value: 'success', label: 'Alta (70-100)' },
  { value: 'warning', label: 'Media (40-69)' },
  { value: 'danger', label: 'Baja (0-39)' },
];
```

### FilterBar component structure
```tsx
// Horizontal bar: filters left, search right
<div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
  {/* Left: dropdowns */}
  <div className="flex items-center gap-3">
    {showManufacturer && <select .../>}
    {showCaliberFamily && <select .../>}
    <select /* quality level, always shown */ />
    {hasActiveFilters && (
      <button onClick={onClearFilters} className="text-sm text-blue-400 hover:text-blue-300">
        Limpiar filtros
      </button>
    )}
  </div>

  {/* Right: search */}
  <div className="ml-auto relative">
    <Search icon />
    <input placeholder="Buscar por nombre..." />
    {searchValue && <X clear button />}
  </div>
</div>
```

### Zero-results empty state
```tsx
{!isLoading && items.length === 0 && hasActiveFilters && (
  <div className="flex flex-col items-center py-12 text-center">
    <p className="text-sm text-slate-400">No se encontraron resultados</p>
    <button onClick={handleClearFilters} className="mt-2 text-sm text-blue-400 hover:text-blue-300">
      Limpiar filtros
    </button>
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate `usePowdersPaginated({page, size})` with no filter params | Extended to accept all filter params in `ListParams` | This phase | Enables all backend filters to be used from frontend |
| `buildQueryString` only serializes `page`, `size`, `q` | Serializes all `ListParams` fields | This phase | The core integration gap closure |

**Deprecated/outdated:**
- None relevant. All existing patterns are correct and should be extended, not replaced.

## Open Questions

1. **Manufacturer dropdown options for powders: could be 50+ distinct values**
   - What we know: With 200+ powders from GRT import, there could be many distinct manufacturers.
   - What's unclear: Whether a plain `<select>` with 50+ options becomes unwieldy.
   - Recommendation: Use native select. If the list is very long, it still scrolls natively. This is consistent with the user decision to keep things simple (no collapsible panel, always visible). If it becomes a problem, can add a searchable select later (deferred).

2. **Responsive behavior on narrow viewports**
   - What we know: User left this to Claude's discretion. Current list pages are not explicitly mobile-optimized.
   - What's unclear: Whether filter bar should stack vertically on small screens.
   - Recommendation: Use `flex-wrap` on the filter bar so dropdowns wrap to the next line on narrow screens. Search input gets `w-full` on the wrapped line. No complex breakpoint logic needed.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** - Direct inspection of all relevant files:
  - `frontend/src/lib/api.ts` (lines 31-44): Current `ListParams` and `buildQueryString`
  - `backend/app/api/powders.py` (lines 43-91): Backend filter params + `/manufacturers` endpoint
  - `backend/app/api/bullets.py` (lines 38-82): Backend filter params + `/manufacturers` + `/caliber-families` endpoints
  - `backend/app/api/cartridges.py` (lines 37-76): Backend filter params + `/caliber-families` endpoint
  - `frontend/src/hooks/usePowders.ts` (lines 14-21): Current `usePowdersPaginated` queryKey structure
  - `frontend/src/hooks/useDebounce.ts`: Existing 300ms debounce hook
  - `frontend/src/components/ui/Select.tsx`: Existing native select component
  - `frontend/src/components/pickers/ComponentPicker.tsx`: Existing search-with-debounce pattern

### Secondary (MEDIUM confidence)
- TanStack React Query `keepPreviousData` behavior -- verified by existing usage in all three paginated hooks

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, no new dependencies
- Architecture: HIGH - Direct extension of existing patterns, all building blocks exist
- Pitfalls: HIGH - Identified from direct code inspection of the integration gap

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (stable -- no external dependencies or version changes)
