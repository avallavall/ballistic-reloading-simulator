# Phase 10: Tech Debt Cleanup - Research

**Researched:** 2026-02-24
**Domain:** Frontend UI polish (React/Next.js table columns, picker badges) + Alembic migration fix
**Confidence:** HIGH

## Summary

This phase addresses 4 non-blocking tech debt items from the v1.2 audit. All changes are well-scoped UI modifications and one backend migration fix. The frontend work involves: (1) adding QualityBadge to ComponentPicker `renderItem` callbacks in SimulationForm.tsx, (2) adding new columns to the bullets table page, (3) adding new columns to the cartridges table page, and (4) establishing a shared null-display convention. The backend work is a single Alembic migration that corrects the cartridge `caliber_family` backfill to use `groove_diameter_mm` instead of `bore_diameter_mm`.

All changes touch existing, well-understood files in the codebase. The frontend TypeScript interfaces already include all the fields that need to be displayed (model_number, bullet_type, base_type, parent_cartridge_name, etc.), so no API changes are required. The Table component already has `overflow-x-auto` for horizontal scrolling.

**Primary recommendation:** Execute as 2 small plans -- one for the migration fix (backend-only, quick), one for all frontend UI changes (pickers + tables + null utility).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- QualityBadge appears inline after component name on all 3 picker types (powder, bullet, cartridge)
- Show color dot + numeric score (not dot-only)
- Include hover tooltip with score breakdown (same QualityBadge component as list pages)
- No data source label in pickers -- keep rows minimal
- **Powder picker rows:** Name + manufacturer + badge (e.g., "Varget . Hodgdon [green] 85")
- **Bullet picker rows:** Name + caliber + weight + badge (e.g., "Sierra MatchKing .308 168gr [green] 85")
- **Cartridge picker rows:** Name + badge only (e.g., ".308 Winchester [green] 88")
- Bullets table: Add 4 new columns: model_number, bullet_type, base_type, length_mm
- Bullets column order: Name -> model_number -> bullet_type -> base_type -> length_mm -> weight -> diameter -> BC -> quality
- bullet_type and base_type displayed as small colored badge pills (e.g., blue for "Match", green for "Hunting")
- Horizontal scroll on narrow screens (no hidden columns)
- Cartridges table: Add columns: parent_cartridge_name, case_capacity_grains, case_length_mm, max_oal_mm, neck_diameter_mm, bore_diameter_mm, groove_diameter_mm
- Cartridges column order: Name -> parent_cartridge -> case_capacity -> dimensions (case length, OAL, neck dia) -> bore/groove -> max_pressure -> quality
- Units displayed in column headers only (e.g., "Case Length (mm)"), not repeated in cell values
- Horizontal scroll on narrow screens (consistent with bullets table)
- All null/missing values display as em dash "--" in muted gray (text-gray-500)
- Badge-type columns (bullet_type, base_type) show em dash when null, not a gray "Unknown" badge
- Apply this convention retroactively to ALL existing nullable columns across all component tables (e.g., bc_g7 on bullets)
- Create a shared utility or component for consistent null display

### Claude's Discretion
- caliber_family backfill migration implementation details (use groove_diameter_mm matching live endpoint logic)
- Exact badge color palette for bullet_type and base_type values
- Responsive breakpoints for horizontal scroll trigger
- Shared null display utility implementation approach (helper function vs wrapper component)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.2.15 | Frontend framework | Already in project |
| React | 18.3.1 | UI library | Already in project |
| Tailwind CSS | 3.4.13 | Styling | Already in project |
| Alembic | 1.14.1 | DB migrations | Already in project |
| SQLAlchemy | 2.0.36 | ORM | Already in project |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TanStack Query | 5.59.0 | Data fetching/caching | Picker data fetching |
| clsx + tailwind-merge | via utils.ts | Class name merging | Badge styling |

### No New Dependencies
This phase requires zero new npm packages or pip packages. All work uses existing project infrastructure.

## Architecture Patterns

### Current File Structure (files to modify)
```
frontend/src/
  components/
    forms/SimulationForm.tsx     # Modify: renderItem callbacks for bullet & powder pickers
    pickers/ComponentPicker.tsx  # NO changes needed (generic, renderItem is a prop)
    ui/QualityBadge.tsx          # NO changes needed (already supports score+level+tooltip)
    ui/Badge.tsx                 # NO changes needed (used for type pills)
  app/
    bullets/page.tsx             # Modify: add 4 columns, reorder, null display
    cartridges/page.tsx          # Modify: add 7 columns, reorder, null display
    powders/page.tsx             # Modify: retroactive null display on nullable columns
    rifles/page.tsx              # Audit: check for nullable columns needing null display
    loads/page.tsx               # Audit: check for nullable columns needing null display
  lib/
    utils.ts                     # Modify: add nullDisplay helper (or create NullCell component)
    types.ts                     # NO changes needed (all fields already present)
backend/
  app/db/migrations/versions/
    008_fix_cartridge_caliber_backfill.py  # NEW: corrective migration
```

### Pattern 1: Null Display Helper
**What:** A shared utility for rendering null/undefined values as em dash in muted gray
**When to use:** Every nullable cell value across all CRUD tables
**Recommended approach:** Helper function (not component) for simplicity

```typescript
// In frontend/src/lib/utils.ts
/** Render a value or em dash for null/undefined */
export function displayValue(
  value: string | number | null | undefined,
  options?: { decimals?: number; suffix?: string }
): string {
  if (value == null || value === '') return '\u2014'; // em dash
  if (typeof value === 'number' && options?.decimals != null) {
    return value.toFixed(options.decimals);
  }
  return String(value);
}
```

Note: `formatNum` in utils.ts already returns em dash for null/NaN numbers. The new helper extends this pattern to strings and provides a single entry point. For table cells, wrap with a conditional className:

```tsx
<TableCell className={`font-mono ${value == null ? 'text-gray-500' : ''}`}>
  {displayValue(value)}
</TableCell>
```

**Alternative (Claude's discretion):** A thin `<NullableCell>` wrapper component. Pros: encapsulates both the em dash text AND the muted gray class. Cons: adds a component for what's essentially a one-liner. Recommendation: use the helper function approach since it's simpler and consistent with existing `formatNum` pattern.

### Pattern 2: Type Badge Pills
**What:** Small colored badge pills for bullet_type and base_type enum values
**When to use:** Bullets table type columns
**Example:**

```tsx
// Color map for bullet types
const BULLET_TYPE_COLORS: Record<string, string> = {
  'Match':    'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Hunting':  'bg-green-500/15 text-green-400 border-green-500/30',
  'Target':   'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'Tactical': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

const BASE_TYPE_COLORS: Record<string, string> = {
  'BT':    'bg-sky-500/15 text-sky-400 border-sky-500/30',      // Boat Tail
  'FB':    'bg-amber-500/15 text-amber-400 border-amber-500/30', // Flat Base
  'Hybrid':'bg-violet-500/15 text-violet-400 border-violet-500/30',
};

function TypeBadge({ value, colorMap }: { value: string | null; colorMap: Record<string, string> }) {
  if (!value) return <span className="text-gray-500">{'\u2014'}</span>;
  const colors = colorMap[value] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${colors}`}>
      {value}
    </span>
  );
}
```

This follows the existing Badge component pattern (see `Badge.tsx` line 13-18) but uses a lighter palette since these are informational, not status indicators. The user confirmed "small colored pills" for scannability.

### Pattern 3: Picker renderItem with QualityBadge
**What:** Update renderItem callbacks in SimulationForm.tsx to include QualityBadge inline
**Current state:** Two pickers exist (Bullet, Powder). CONTEXT mentions 3 (including Cartridge).
**Important finding:** No cartridge ComponentPicker exists anywhere in the codebase. SimulationForm.tsx only has Bullet and Powder pickers.

```tsx
// Powder picker renderItem (updated)
renderItem={(p) => (
  <div className="flex items-center justify-between">
    <div>
      <span className="text-sm font-medium text-white">{p.name}</span>
      <span className="mx-1.5 text-slate-600">.</span>
      <span className="text-sm text-slate-400">{p.manufacturer}</span>
    </div>
    <QualityBadge score={p.quality_score} level={p.quality_level} tooltip={p.quality_tooltip} />
  </div>
)}

// Bullet picker renderItem (updated)
renderItem={(b) => (
  <div className="flex items-center justify-between">
    <div>
      <span className="text-sm font-medium text-white">{b.name}</span>
      <span className="ml-2 text-xs text-slate-400">
        .{b.diameter_mm} {b.weight_grains}gr
      </span>
    </div>
    <QualityBadge score={b.quality_score} level={b.quality_level} tooltip={b.quality_tooltip} />
  </div>
)}
```

### Pattern 4: Corrective Migration
**What:** New Alembic migration to fix cartridge caliber_family backfill
**Why:** Migration 006 backfilled cartridge caliber_family using `bore_diameter_mm`, but the live endpoint (cartridges.py) derives it from `groove_diameter_mm`. This causes mismatches for existing records.
**Evidence:**
- Migration 006 line 66-71: `UPDATE cartridges SET caliber_family = ... WHERE bore_diameter_mm BETWEEN ...`
- cartridges.py line 96: `cartridge.caliber_family = derive_caliber_family(cartridge.groove_diameter_mm)`
- search.py line 25-37: `derive_caliber_family()` uses generic `diameter_mm` param -- for cartridges the caller passes `groove_diameter_mm`

```python
# backend/app/db/migrations/versions/008_fix_cartridge_caliber_backfill.py
"""Fix cartridge caliber_family backfill to use groove_diameter_mm

Revision ID: 008_fix_caliber_backfill
Revises: 007_import_pipelines
"""
from alembic import op

revision = "008_fix_caliber_backfill"
down_revision = "007_import_pipelines"

def upgrade() -> None:
    # Clear all cartridge caliber_family values first
    op.execute("UPDATE cartridges SET caliber_family = NULL")
    # Re-derive from groove_diameter_mm (matching live endpoint logic)
    op.execute("UPDATE cartridges SET caliber_family = '.224' WHERE groove_diameter_mm BETWEEN 5.5 AND 5.8")
    op.execute("UPDATE cartridges SET caliber_family = '.243' WHERE groove_diameter_mm BETWEEN 6.1 AND 6.3")
    op.execute("UPDATE cartridges SET caliber_family = '.264' WHERE groove_diameter_mm BETWEEN 6.5 AND 6.8")
    op.execute("UPDATE cartridges SET caliber_family = '.284' WHERE groove_diameter_mm BETWEEN 7.0 AND 7.3")
    op.execute("UPDATE cartridges SET caliber_family = '.308' WHERE groove_diameter_mm BETWEEN 7.7 AND 7.9")
    op.execute("UPDATE cartridges SET caliber_family = '.338' WHERE groove_diameter_mm BETWEEN 8.5 AND 8.7")
    op.execute("UPDATE cartridges SET caliber_family = '.375' WHERE groove_diameter_mm BETWEEN 9.5 AND 9.6")
    op.execute("UPDATE cartridges SET caliber_family = '.408' WHERE groove_diameter_mm BETWEEN 10.3 AND 10.4")
    op.execute("UPDATE cartridges SET caliber_family = '.416' WHERE groove_diameter_mm BETWEEN 10.5 AND 10.7")
    op.execute("UPDATE cartridges SET caliber_family = '.458' WHERE groove_diameter_mm BETWEEN 11.5 AND 11.7")
    op.execute("UPDATE cartridges SET caliber_family = '.510' WHERE groove_diameter_mm BETWEEN 12.9 AND 13.1")

def downgrade() -> None:
    # Revert to bore_diameter_mm-based backfill (original 006 behavior)
    op.execute("UPDATE cartridges SET caliber_family = NULL")
    op.execute("UPDATE cartridges SET caliber_family = '.224' WHERE bore_diameter_mm BETWEEN 5.5 AND 5.8")
    op.execute("UPDATE cartridges SET caliber_family = '.243' WHERE bore_diameter_mm BETWEEN 6.1 AND 6.3")
    op.execute("UPDATE cartridges SET caliber_family = '.264' WHERE bore_diameter_mm BETWEEN 6.5 AND 6.8")
    op.execute("UPDATE cartridges SET caliber_family = '.284' WHERE bore_diameter_mm BETWEEN 7.0 AND 7.3")
    op.execute("UPDATE cartridges SET caliber_family = '.308' WHERE bore_diameter_mm BETWEEN 7.7 AND 7.9")
    op.execute("UPDATE cartridges SET caliber_family = '.338' WHERE bore_diameter_mm BETWEEN 8.5 AND 8.7")
```

### Anti-Patterns to Avoid
- **Do NOT add a cartridge picker to SimulationForm:** The CONTEXT mentions 3 picker types but no cartridge picker exists in the codebase. Adding one would be scope creep. Only update the 2 existing pickers (bullet, powder). If a cartridge picker is added later, it would follow the same pattern.
- **Do NOT create a separate NullCell component for the null display convention:** A helper function is sufficient and avoids unnecessary component abstraction for what is essentially a string return.
- **Do NOT hide columns on small screens:** User decision is horizontal scroll (consistent across bullets and cartridges tables). The Table component already wraps in `overflow-x-auto`.
- **Do NOT repeat units in cell values:** Units go in column headers only (user decision).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Quality badge display | Custom badge with dots/scores | Existing `QualityBadge` component | Already handles score, level, tooltip, dot colors |
| Badge pill styling | Custom styled spans | Existing `Badge` component pattern | Consistent with project design system |
| Null display | Per-cell inline ternary | Shared `displayValue()` helper | DRY, consistent em dash + muted gray |
| Horizontal scroll | CSS hacks or responsive hide | Existing Table `overflow-x-auto` wrapper | Already built into Table component |
| Alembic migration chain | Manual SQL scripts | Alembic versioned migration | Proper version chain, up/downgrade |

**Key insight:** All the building blocks already exist. This phase is purely about wiring existing components into the right places and adding table columns with data the API already returns.

## Common Pitfalls

### Pitfall 1: Forgetting to include all CALIBER_FAMILIES in migration
**What goes wrong:** Migration 006 only covered 6 families (.224 through .338), but `search.py` defines 11 families (adding .375, .408, .416, .458, .510).
**Why it happens:** The original migration was written before the full CALIBER_FAMILIES dict was defined.
**How to avoid:** The corrective migration must include all 11 families from search.py's CALIBER_FAMILIES dict.
**Warning signs:** Cartridges in .375+ calibers having NULL caliber_family after migration.

### Pitfall 2: Missing QualityBadge import in SimulationForm
**What goes wrong:** Build error because QualityBadge isn't imported in SimulationForm.tsx.
**Why it happens:** SimulationForm currently doesn't import QualityBadge -- it needs to be added.
**How to avoid:** Add `import QualityBadge from '@/components/ui/QualityBadge'` to SimulationForm.tsx.

### Pitfall 3: Cartridge picker row format specified but no picker exists
**What goes wrong:** Planner creates a task to update a non-existent cartridge picker.
**Why it happens:** CONTEXT.md specifies format for all 3 picker types, but only 2 exist in codebase.
**How to avoid:** Only implement for the 2 existing pickers (bullet, powder). Document the cartridge format for future reference but don't create a picker.

### Pitfall 4: SkeletonRows column count mismatch
**What goes wrong:** Loading skeleton shows wrong number of columns after adding new table columns.
**Why it happens:** `<SkeletonRows columns={N}>` has a hardcoded count that must match new column total.
**How to avoid:** Count final columns carefully:
- Bullets: Name + model_number + bullet_type + base_type + length_mm + weight + diameter + BC G1 + BC G7 + quality + actions = 11 columns (was 8)
- Cartridges: Name + parent + case_capacity + case_length + OAL + neck_dia + bore + groove + max_pressure + quality + actions = 11 columns (was 7)

### Pitfall 5: toLocaleString() on null values
**What goes wrong:** TypeError when calling `.toLocaleString()` or `.toFixed()` on a null/undefined value.
**Why it happens:** Currently `cartridge.saami_max_pressure_psi.toLocaleString()` is safe because it's a required field, but adding nullable fields risks this.
**How to avoid:** Always use the `displayValue()` helper for nullable fields. Only call methods on values after null check.

### Pitfall 6: Alembic migration revision chain
**What goes wrong:** Migration fails because the `down_revision` doesn't match the current head.
**Why it happens:** New migrations were added in other phases.
**How to avoid:** Check current head with `alembic heads` before creating new migration. The current head should be `007_import_pipelines`.

## Code Examples

### Null Display Utility
```typescript
// frontend/src/lib/utils.ts -- add to existing file

/** Display value or em dash for null/undefined/empty */
export function displayValue(value: string | number | null | undefined): string {
  if (value == null || value === '') return '\u2014';
  return String(value);
}
```

### Nullable TableCell Pattern
```tsx
// Pattern for all nullable cells across all tables
<TableCell className={`font-mono ${bullet.bc_g7 == null ? 'text-gray-500' : ''}`}>
  {displayValue(bullet.bc_g7)}
</TableCell>
```

### Bullets Table Extended Columns (column order per CONTEXT)
```tsx
<TableHead>Nombre</TableHead>
<TableHead>N. Modelo</TableHead>
<TableHead>Tipo</TableHead>
<TableHead>Base</TableHead>
<TableHead>Longitud (mm)</TableHead>
<TableHead>Peso (gr)</TableHead>
<TableHead>Diametro (mm)</TableHead>
<TableHead>BC G1</TableHead>
<TableHead>BC G7</TableHead>
<TableHead>Calidad</TableHead>
<TableHead className="text-right">Acciones</TableHead>
```

### Cartridges Table Extended Columns (column order per CONTEXT)
```tsx
<TableHead>Nombre</TableHead>
<TableHead>Cartucho Padre</TableHead>
<TableHead>Capacidad (gr H2O)</TableHead>
<TableHead>Long. Vaina (mm)</TableHead>
<TableHead>OAL (mm)</TableHead>
<TableHead>Cuello (mm)</TableHead>
<TableHead>Bore (mm)</TableHead>
<TableHead>Groove (mm)</TableHead>
<TableHead>SAAMI Max (psi)</TableHead>
<TableHead>Calidad</TableHead>
<TableHead className="text-right">Acciones</TableHead>
```

### Updated Powder Picker renderItem
```tsx
renderItem={(p) => (
  <div className="flex items-center justify-between gap-3">
    <div className="min-w-0 flex-1">
      <span className="text-sm font-medium text-white">{p.name}</span>
      <span className="mx-1.5 text-slate-600">&middot;</span>
      <span className="text-sm text-slate-400">{p.manufacturer}</span>
    </div>
    <QualityBadge score={p.quality_score} level={p.quality_level} tooltip={p.quality_tooltip} />
  </div>
)}
```

### Updated Bullet Picker renderItem
```tsx
renderItem={(b) => (
  <div className="flex items-center justify-between gap-3">
    <div className="min-w-0 flex-1">
      <span className="text-sm font-medium text-white">{b.name}</span>
      <span className="ml-2 text-xs text-slate-400">
        {b.diameter_mm}mm {b.weight_grains}gr
      </span>
    </div>
    <QualityBadge score={b.quality_score} level={b.quality_level} tooltip={b.quality_tooltip} />
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| bore_diameter_mm for cartridge caliber_family | groove_diameter_mm (matching derive_caliber_family caller) | Phase 4 (04-02 decision) | Migration 006 is stale, needs correction |
| Inline null checks per cell | Shared displayValue() utility | This phase | Consistent null display project-wide |
| Minimal picker rows (name + metadata) | Picker rows with inline QualityBadge | This phase | Better data quality visibility at selection time |

## Open Questions

1. **Cartridge picker existence**
   - What we know: CONTEXT.md specifies format for 3 picker types, but only 2 exist (bullet, powder in SimulationForm.tsx)
   - What's unclear: Whether we should create a cartridge picker or just apply to existing 2
   - Recommendation: Only update existing 2 pickers. The cartridge format from CONTEXT is documented for future use. No SimulationForm needs a cartridge picker (the user selects a rifle, which already has a cartridge FK).

2. **Retroactive null display scope**
   - What we know: User wants em dash convention applied to ALL existing nullable columns across all component tables
   - What's unclear: Exact list of nullable columns per table needing update
   - Recommendation: Audit each CRUD page (powders, bullets, cartridges, rifles, loads) during implementation. Key known nullable fields: `bc_g7` on bullets, `cip_max_pressure_mpa` on cartridges, all the new fields being added.

3. **Migration numbering**
   - What we know: Current head is 007_import_pipelines
   - What's unclear: Whether other un-merged phases have created migration 008
   - Recommendation: Check `alembic heads` before finalizing the migration number. Use 008 as working number.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all files listed in Architecture Patterns section
- `frontend/src/components/pickers/ComponentPicker.tsx` -- confirmed generic renderItem prop pattern
- `frontend/src/components/forms/SimulationForm.tsx` -- confirmed only 2 pickers (bullet, powder), no cartridge
- `frontend/src/components/ui/QualityBadge.tsx` -- confirmed supports score+level+tooltip props
- `frontend/src/components/ui/Badge.tsx` -- confirmed variant-based pill styling pattern
- `frontend/src/components/ui/Table.tsx` -- confirmed overflow-x-auto already present
- `frontend/src/lib/types.ts` -- confirmed all needed fields exist on Bullet and Cartridge interfaces
- `frontend/src/lib/utils.ts` -- confirmed formatNum already returns em dash for null
- `backend/app/db/migrations/versions/006_search_and_pagination.py` -- confirmed bore_diameter_mm used for cartridge backfill (the bug)
- `backend/app/api/cartridges.py` -- confirmed groove_diameter_mm used in live endpoint (the correct behavior)
- `backend/app/services/search.py` -- confirmed CALIBER_FAMILIES has 11 entries, derive_caliber_family logic

### Secondary (MEDIUM confidence)
- CONTEXT.md user decisions on exact column ordering and picker row formatting

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing project libraries
- Architecture: HIGH - all files inspected, patterns verified in codebase
- Pitfalls: HIGH - identified from direct code inspection (migration mismatch, missing imports, column counts)

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (30 days -- stable codebase, no external dependency changes)
