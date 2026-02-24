# Phase 9: Powder Alias UI + Import Cache Fix - Research

**Researched:** 2026-02-24
**Domain:** Frontend UI integration (alias display, tooltip, cache invalidation) + Backend GRT import enhancement
**Confidence:** HIGH

## Summary

Phase 9 closes the last v1.2 requirement (PWD-05) by making powder aliases visible to users and applying alias mappings during GRT import. The work splits into four distinct areas: (1) adding an alias badge with tooltip to the powder list table, (2) creating a `getPowderAliases()` frontend API function, (3) modifying the GRT import endpoint to apply `powder_aliases.json` mappings to newly imported powders, and (4) fixing the overwrite import flow's cache invalidation so the powder list auto-refreshes.

The codebase is well-prepared for this work. The backend already has `alias_group` on the Powder model, a `GET /powders/{id}/aliases` endpoint, and `powder_aliases.json` with 11 alias groups. The frontend has the QualityBadge CSS-tooltip pattern to follow and a Toast component (currently unused). The primary gap is that the GRT import endpoint never applies alias mappings, and the overwrite flow bypasses TanStack Query's mutation system entirely.

**Primary recommendation:** Follow the existing QualityBadge CSS group-hover tooltip pattern for the alias badge, load `powder_aliases.json` once in the GRT import endpoint to apply alias_group values, and fix the overwrite flow by using `useQueryClient` + `invalidateQueries` after the direct API call resolves.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Small badge next to powder name, count format: "3 aliases"
- Neutral/blue color palette -- distinct from quality badges (red/yellow/green)
- Only shown on powders that have an alias_group value set
- Badge appears in the same row as the powder name, after the QualityBadge
- Tooltip on hover over the alias badge -- consistent with QualityBadge hover pattern
- Tooltip shows all linked powder names with their manufacturer
- Format: "ADI AR2208 (ADI) | Hodgdon Varget (Hodgdon)" -- name (manufacturer) per line
- No modal or inline expansion -- tooltip is sufficient
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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PWD-05 | Powder aliases are resolved so duplicate entries across markets are linked (e.g., ADI AR2208 = Hodgdon Varget) | Backend: alias_group column exists, GET /powders/{id}/aliases endpoint exists, powder_aliases.json has 11 groups. Frontend: needs badge UI + API function + GRT import alias application |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TanStack React Query | ^5.59.0 | Cache invalidation + data fetching | Already in project, all CRUD hooks use it |
| Next.js 14 | 14.2.15 | App Router pages | Project framework |
| Tailwind CSS | 3.4.13 | Badge + tooltip styling | Project styling |
| FastAPI | 0.115.6 | GRT import endpoint | Project backend framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | (installed) | Link2 or similar icon for alias badge | Badge visual indicator |
| React Portal (built-in) | -- | Toast rendering | Already used in Toast.tsx |

### Alternatives Considered
None -- all components use existing project stack. No new dependencies needed.

## Architecture Patterns

### Recommended Changes Structure
```
backend/
  app/
    api/powders.py          # Add alias mapping to import_grt endpoint
    schemas/powder.py       # Add aliases_linked to GrtImportResult
frontend/
  src/
    lib/api.ts              # Add getPowderAliases() function
    lib/types.ts            # Add aliases_linked to GrtImportResult
    components/ui/
      AliasBadge.tsx        # NEW: badge + tooltip component
      Toast.tsx             # Add 'success' type
    hooks/usePowders.ts     # No changes needed (existing invalidation is correct)
    app/powders/page.tsx    # Add AliasBadge to table, fix handleOverwriteDuplicates, add Toast
```

### Pattern 1: CSS-Only Tooltip (QualityBadge Pattern)
**What:** Group-hover tooltip using Tailwind's `group` and `group-hover:opacity-100` utilities
**When to use:** Small info tooltips that don't need interactivity
**Example from QualityBadge.tsx:**
```tsx
<span className="group relative inline-flex items-center cursor-default">
  <Badge variant={variant}>
    {label}
  </Badge>
  <span
    className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
      whitespace-nowrap rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-200
      opacity-0 transition-opacity group-hover:opacity-100 border border-slate-600 shadow-lg z-10"
  >
    {tooltipText}
  </span>
</span>
```
**Note for alias tooltip:** Must use `whitespace-pre-line` (not `whitespace-nowrap`) since tooltip shows multi-line content (one powder per line). Also needs max-width constraint.

### Pattern 2: TanStack Query Cache Invalidation
**What:** Invalidate query cache to trigger refetch after mutations
**When to use:** After data-modifying operations
**Example from existing hooks:**
```tsx
const queryClient = useQueryClient();
// Invalidate ALL queries starting with ['powders']
queryClient.invalidateQueries({ queryKey: ['powders'] });
```
**Critical:** The overwrite flow currently bypasses this. It does `const { importGrtPowders } = await import('@/lib/api')` and calls the API directly without the TanStack mutation wrapper. Fix requires adding `queryClient.invalidateQueries({ queryKey: ['powders'] })` in the overwrite success path.

### Pattern 3: Toast Notification
**What:** Transient notification at top-right using portal
**When to use:** Post-action feedback (import results)
**Existing Toast.tsx supports types:** `error`, `info`
**Needs:** Add `success` type with green styling (border-green-500/60, text-green-300)

### Anti-Patterns to Avoid
- **Nested `group` classes:** The powder name cell already has a flex container. The AliasBadge must use its own `group` scope (e.g., `group/alias`) or be self-contained to not conflict with parent group styles. Tailwind supports named groups via `group/name` syntax.
- **Fetching aliases per-row:** Do NOT call `GET /powders/{id}/aliases` for every powder in the list. Instead, the alias tooltip data should come from a separate bulk query or be resolved frontend-side by grouping powders by alias_group from the list data already available.
- **Multiple cache invalidation points:** Keep invalidation in one place (the mutation's onSuccess or after the direct call), don't scatter it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tooltip positioning | Custom JS positioning | CSS `group-hover` + absolute positioning | Matches QualityBadge pattern, no JS needed |
| Toast notifications | Custom toast system | Existing `useToast` hook from `Toast.tsx` | Already implemented, just needs 'success' type |
| Alias group resolution | Custom alias lookup logic | `powder_aliases.json` loaded at import time | File already exists with 11 alias groups |
| Cache invalidation | Manual refetch/setState | `queryClient.invalidateQueries` | TanStack Query standard pattern, already used everywhere |

**Key insight:** Almost all infrastructure exists. This phase is about wiring things together, not building new systems.

## Common Pitfalls

### Pitfall 1: N+1 Alias Fetches
**What goes wrong:** Calling `GET /powders/{id}/aliases` for each powder row in the list (200+ rows = 200+ API calls).
**Why it happens:** Natural instinct to use the existing per-powder endpoint.
**How to avoid:** For the alias badge COUNT, just check if `alias_group` is non-null (already in PowderResponse). For the tooltip content, either: (a) pre-fetch all alias groups in a single query, or (b) fetch on-demand only when tooltip is about to display (single fetch per hover). Option (b) is simpler and recommended -- the `GET /powders/{id}/aliases` endpoint is cheap and only fires on hover.
**Warning signs:** Slow page loads, waterfall network requests in dev tools.

### Pitfall 2: Overwrite Cache Invalidation Bug
**What goes wrong:** `handleOverwriteDuplicates` calls `importGrtPowders()` directly (bypassing TanStack mutation), so the powder list doesn't refresh after overwrite.
**Why it happens:** The function was written as `doOverwrite()` inside `useCallback` with direct `import('@/lib/api')` -- it never touches `queryClient`.
**How to avoid:** After the direct API call succeeds in `handleOverwriteDuplicates`, call `queryClient.invalidateQueries({ queryKey: ['powders'] })`. Need to get `queryClient` via `useQueryClient()` at the component level.
**Warning signs:** Powder list shows old data after overwrite import.

### Pitfall 3: Toast Type Missing 'success'
**What goes wrong:** Toast component only has 'error' and 'info' types. Calling `showToast('...', 'success')` would use default styling.
**Why it happens:** Toast was originally created for error handling only.
**How to avoid:** Add 'success' to the `ToastType` union and add green border styling before using it.
**Warning signs:** TypeScript error on `showToast('...', 'success' as any)`.

### Pitfall 4: GRT Import Alias Mapping -- Name Mismatch
**What goes wrong:** Alias mapping uses exact name match against `powder_aliases.json`, but GRT-imported powder names may have slight variations (whitespace, casing differences).
**Why it happens:** GRT community data is user-contributed with inconsistent naming.
**How to avoid:** Use case-insensitive matching (`.lower()`) when looking up powder names in alias groups. The seed logic already uses exact match, so be consistent but defensive.
**Warning signs:** Powders imported from GRT don't get alias_group even though they should.

### Pitfall 5: Tooltip Naming Group vs Named Group Conflicts
**What goes wrong:** Using Tailwind's `group` class inside the powder name `<span className="flex items-center gap-2">` conflicts if parent also uses group.
**Why it happens:** Tailwind's `group` is global -- nested groups can interfere.
**How to avoid:** Use Tailwind named groups: `group/alias` on the AliasBadge wrapper and `group-hover/alias:opacity-100` on the tooltip. This scopes the hover correctly.
**Warning signs:** Tooltip appears/disappears erratically when hovering over adjacent badges.

## Code Examples

### AliasBadge Component (CSS-only tooltip, following QualityBadge pattern)
```tsx
// Source: Pattern derived from frontend/src/components/ui/QualityBadge.tsx
'use client';

import { useState, useEffect } from 'react';
import Badge from '@/components/ui/Badge';
import { getPowderAliases } from '@/lib/api';

interface AliasBadgeProps {
  powderId: string;
  aliasGroup: string;
}

export default function AliasBadge({ powderId, aliasGroup }: AliasBadgeProps) {
  const [aliases, setAliases] = useState<{ name: string; manufacturer: string }[] | null>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (hovered && aliases === null) {
      getPowderAliases(powderId).then(setAliases).catch(() => setAliases([]));
    }
  }, [hovered, aliases, powderId]);

  const count = aliases?.length;
  const tooltipLines = aliases?.map(a => `${a.name} (${a.manufacturer})`).join('\n') ?? 'Cargando...';

  return (
    <span
      className="group/alias relative inline-flex items-center cursor-default"
      onMouseEnter={() => setHovered(true)}
    >
      <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30">
        {count != null ? `${count} alias` : aliasGroup}
      </Badge>
      <span
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          whitespace-pre-line rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-200
          opacity-0 transition-opacity group-hover/alias:opacity-100 border border-slate-600
          shadow-lg z-10 max-w-xs"
      >
        {tooltipLines}
      </span>
    </span>
  );
}
```

### getPowderAliases API Function
```typescript
// Source: Pattern derived from frontend/src/lib/api.ts
export async function getPowderAliases(powderId: string): Promise<Powder[]> {
  return request<Powder[]>(`/powders/${powderId}/aliases`);
}
```

### GRT Import Alias Application (Backend)
```python
# Source: Pattern derived from backend/app/seed/initial_data.py alias application logic
import json
from pathlib import Path

ALIASES_FILE = Path(__file__).parent.parent / "seed" / "fixtures" / "powder_aliases.json"

def _load_alias_map() -> dict[str, str]:
    """Load powder_aliases.json and invert: powder_name -> group_name."""
    if not ALIASES_FILE.exists():
        return {}
    with open(ALIASES_FILE, encoding="utf-8") as f:
        groups = json.load(f)
    name_to_group = {}
    for group_name, names in groups.items():
        for name in names:
            name_to_group[name.lower()] = group_name
    return name_to_group

# In import_grt endpoint, after creating/updating powders:
alias_map = _load_alias_map()
for powder in created + updated:
    group = alias_map.get(powder.name.lower())
    if group:
        powder.alias_group = group
        aliases_linked += 1
```

### Fix handleOverwriteDuplicates Cache Invalidation
```tsx
// In powders/page.tsx -- add useQueryClient at component level
const queryClient = useQueryClient();

// Then in handleOverwriteDuplicates:
const handleOverwriteDuplicates = useCallback(() => {
  if (!lastImportFile) return;
  const doOverwrite = async () => {
    try {
      const { importGrtPowders } = await import('@/lib/api');
      const data = await importGrtPowders(lastImportFile, true);
      setImportResult({ ... });
      // FIX: Invalidate cache so powder list refreshes
      queryClient.invalidateQueries({ queryKey: ['powders'] });
    } catch (error) { ... }
  };
  doOverwrite();
}, [lastImportFile, queryClient]);
```

### Toast Success Type Addition
```tsx
// In Toast.tsx, extend ToastType:
type ToastType = 'error' | 'info' | 'success';

const BORDER_COLORS: Record<ToastType, string> = {
  error: 'border-red-500/60 text-red-300',
  info: 'border-blue-500/60 text-blue-300',
  success: 'border-green-500/60 text-green-300',
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Aliases only set during seed | Aliases should be set during any import | This phase | GRT-imported powders get alias_group |
| Overwrite bypasses TanStack | Overwrite should invalidate cache | This phase | List auto-refreshes |
| Toast: error/info only | Add success type | This phase | Green success toasts for import feedback |

## Open Questions

1. **Alias badge count -- pre-calculated vs on-demand**
   - What we know: PowderResponse already includes `alias_group` (string or null). We can show the badge based on this. But the count of aliases and their names requires either a per-powder API call or a bulk approach.
   - What's unclear: Should we pre-calculate the alias count on the backend (add a computed field to PowderResponse) or fetch on hover?
   - Recommendation: Fetch on hover via `GET /powders/{id}/aliases`. This avoids N+1 on page load and the endpoint is already implemented. Show a static badge text like "aliases" (no count) and load count/names on hover. Alternatively, since all powders with the same `alias_group` are in the list data already, we could count client-side by grouping the current page's powders by `alias_group` -- but this misses powders on other pages.

2. **GrtImportResult schema extension**
   - What we know: CONTEXT.md specifies toast should show "Y aliases linked". The current `GrtImportResult` has `created`, `updated`, `skipped`, `errors`, `mode` but no `aliases_linked` count.
   - What's unclear: None -- clearly needs adding.
   - Recommendation: Add `aliases_linked: int = 0` to `GrtImportResult` schema and compute during import.

## Sources

### Primary (HIGH confidence)
- `backend/app/models/powder.py` -- alias_group column definition (String(100), nullable, indexed)
- `backend/app/api/powders.py` -- GET /powders/{id}/aliases endpoint (lines 247-258), import_grt endpoint (lines 118-244)
- `backend/app/seed/fixtures/powder_aliases.json` -- 11 alias groups with 22 powder names
- `backend/app/seed/initial_data.py` -- Alias application pattern during seed (lines 122-131)
- `frontend/src/components/ui/QualityBadge.tsx` -- CSS group-hover tooltip pattern
- `frontend/src/components/ui/Toast.tsx` -- useToast hook with error/info types
- `frontend/src/hooks/usePowders.ts` -- TanStack mutation/invalidation patterns
- `frontend/src/app/powders/page.tsx` -- handleOverwriteDuplicates bug (lines 221-242)
- `frontend/src/lib/types.ts` -- Powder interface with alias_group: string | null
- `backend/tests/test_import_pipelines.py` -- Existing alias endpoint tests (lines 219-256)

### Secondary (MEDIUM confidence)
- TanStack React Query v5 invalidateQueries: prefix matching with `{ queryKey: ['powders'] }` invalidates all keys starting with `powders` -- verified by existing codebase patterns in usePowders.ts

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, no new dependencies
- Architecture: HIGH -- following exact existing patterns (QualityBadge, Toast, TanStack mutations)
- Pitfalls: HIGH -- identified from direct code inspection of existing bugs

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (stable -- internal project patterns)
