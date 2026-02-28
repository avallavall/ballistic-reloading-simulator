---
phase: quick-04
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/rifles/page.tsx
  - frontend/src/lib/unit-context.tsx
  - frontend/src/components/drawings/DimensionLabel.tsx
  - frontend/src/app/settings/page.tsx
  - frontend/src/components/layout/Sidebar.tsx
autonomous: true
requirements: [RIFLE-CHAMBER-FIELDS, UNIT-SETTINGS]
must_haves:
  truths:
    - "Rifle create/edit form shows headspace_mm, freebore_mm, throat_angle_deg fields in a collapsible 'Datos de Recamara' section"
    - "Editing existing rifle pre-populates chamber fields from stored data"
    - "New rifle creation sends chamber fields to backend"
    - "Settings page at /settings lets user choose mm vs inches, MPa vs PSI, m/s vs FPS"
    - "Drawing DimensionLabel shows ONLY the selected unit (mm or inches), not both"
    - "Header unit toggle and settings page stay in sync"
  artifacts:
    - path: "frontend/src/app/rifles/page.tsx"
      provides: "Chamber fields in rifle form"
    - path: "frontend/src/app/settings/page.tsx"
      provides: "Settings page with unit preferences"
    - path: "frontend/src/lib/unit-context.tsx"
      provides: "Extended unit context with formatLength and length unit preference"
    - path: "frontend/src/components/drawings/DimensionLabel.tsx"
      provides: "Single-unit display based on unit context"
  key_links:
    - from: "frontend/src/app/rifles/page.tsx"
      to: "backend /api/v1/rifles"
      via: "createRifle/updateRifle with chamber fields"
      pattern: "freebore_mm|throat_angle_deg|headspace_mm"
    - from: "frontend/src/components/drawings/DimensionLabel.tsx"
      to: "frontend/src/lib/unit-context.tsx"
      via: "useUnits().formatLength"
      pattern: "useUnits.*formatLength"
    - from: "frontend/src/app/settings/page.tsx"
      to: "frontend/src/lib/unit-context.tsx"
      via: "useUnits to read/write preferences"
      pattern: "useUnits"
---

<objective>
Add missing rifle chamber dimension fields to the create/edit form and create a settings page for unit preferences so drawings show only the user's preferred unit system.

Purpose: (1) Users cannot currently fill in chamber drawing fields (headspace, freebore, throat angle) for their rifles, causing the drawings page to show "insufficient data" warnings. (2) Drawing dimensions show cluttered dual-unit labels; users should choose their preferred system.

Output: Updated rifle form with chamber section, new /settings page, DimensionLabel using unit context
</objective>

<execution_context>
@C:/Users/vall-/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/vall-/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/app/rifles/page.tsx
@frontend/src/lib/types.ts (Rifle, RifleCreate interfaces -- already have freebore_mm, throat_angle_deg, headspace_mm)
@frontend/src/lib/unit-context.tsx (existing UnitProvider with metric/imperial toggle)
@frontend/src/components/drawings/DimensionLabel.tsx (currently hardcodes dual-unit display)
@frontend/src/components/layout/Sidebar.tsx (nav items array)
@frontend/src/components/layout/Header.tsx (existing unit toggle button)
@frontend/src/components/Providers.tsx (UnitProvider wraps app)
@backend/app/schemas/rifle.py (RifleCreate already accepts freebore_mm, throat_angle_deg, headspace_mm)
@backend/app/models/rifle.py (Rifle model already has these columns)

<interfaces>
<!-- Key types the executor needs -->

From frontend/src/lib/types.ts:
```typescript
export interface RifleCreate {
  name: string;
  barrel_length_mm: number;
  twist_rate_mm: number;
  cartridge_id: string;
  chamber_volume_mm3: number;
  weight_kg: number;
  barrel_condition: string;
  round_count: number;
  // Chamber drawing fields (optional)
  freebore_mm?: number | null;
  throat_angle_deg?: number | null;
  headspace_mm?: number | null;
}
```

From frontend/src/lib/unit-context.tsx:
```typescript
export type UnitSystem = 'metric' | 'imperial';
interface UnitContextValue {
  unitSystem: UnitSystem;
  toggleUnits: () => void;
  formatPressure: (psi: number, decimals?: number) => FormattedValue;
  formatVelocity: (fps: number, decimals?: number) => FormattedValue;
}
// Uses localStorage key 'unit-system'
```

From backend/app/schemas/rifle.py:
```python
class RifleCreate(BaseModel):
    # ... base fields ...
    freebore_mm: float | None = Field(None, ge=0, le=20, description="Freebore length (mm), typical 0.05-5")
    throat_angle_deg: float | None = Field(None, gt=0, le=10, description="Throat/leade angle (deg), typical 1-3")
    headspace_mm: float | None = Field(None, ge=0, le=5, description="Headspace gap (mm), typical 0.05-0.15")
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add chamber fields to rifle form and extend unit context with formatLength</name>
  <files>
    frontend/src/app/rifles/page.tsx
    frontend/src/lib/unit-context.tsx
  </files>
  <action>
**Rifle form changes (rifles/page.tsx):**

1. Add a `useState<boolean>` for `showChamberSection` (default `false`). When editing a rifle that has any chamber field non-null, default to `true`.

2. Update `emptyForm` to include `freebore_mm: undefined, throat_angle_deg: undefined, headspace_mm: undefined`.

3. Update `handleChange` to handle these new fields as numeric (they are NOT string fields).

4. Update `handleEdit` to populate `freebore_mm`, `throat_angle_deg`, `headspace_mm` from the rifle data. Also set `showChamberSection = true` if any of these are non-null.

5. After the existing grid of inputs (barrel_length_mm, twist_rate_mm, etc.), add a collapsible section:

```tsx
{/* Collapsible chamber section */}
<div className="border-t border-slate-700 pt-4 mt-4">
  <button
    type="button"
    onClick={() => setShowChamberSection(!showChamberSection)}
    className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white"
  >
    <ChevronDown size={16} className={`transition-transform ${showChamberSection ? 'rotate-180' : ''}`} />
    Datos de Recamara (opcional)
  </button>
  {showChamberSection && (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-3">
      <Input label="Headspace" id="headspace_mm" type="number" step="0.01" suffix="mm"
        value={form.headspace_mm ?? ''} onChange={(e) => handleChange('headspace_mm', e.target.value)}
        placeholder="0.05 - 0.15" />
      <Input label="Freebore" id="freebore_mm" type="number" step="0.01" suffix="mm"
        value={form.freebore_mm ?? ''} onChange={(e) => handleChange('freebore_mm', e.target.value)}
        placeholder="0.05 - 5.0" />
      <Input label="Angulo de Garganta" id="throat_angle_deg" type="number" step="0.1" suffix="deg"
        value={form.throat_angle_deg ?? ''} onChange={(e) => handleChange('throat_angle_deg', e.target.value)}
        placeholder="1.0 - 3.0" />
    </div>
  )}
</div>
```

6. Import `ChevronDown` from lucide-react.

7. In `handleChange`, update the string-field check: the fields `name`, `cartridge_id`, `barrel_condition` stay as strings. All other fields are numeric. For the chamber fields, convert empty string to `null` (not 0) since they're optional: `field === 'freebore_mm' || field === 'throat_angle_deg' || field === 'headspace_mm' ? (value === '' ? null : Number(value)) : Number(value)`.

8. Before form submission, strip `undefined` values: if `form.freebore_mm` is `undefined`, don't include it. Actually, the API handles `null` fine, so just ensure empty-string converts to `null`.

**Unit context changes (unit-context.tsx):**

1. Add `formatLength` method to `UnitContextValue`:
```typescript
formatLength: (mm: number, decimals?: number) => FormattedValue;
```

2. Implement it:
- metric: return `{ value: mm, formatted: formatNum(mm, decimals ?? 2), unit: 'mm' }`
- imperial: convert mm to inches (mm / 25.4), return `{ value: inches, formatted: formatNum(inches, decimals ?? 3), unit: 'in' }`

3. Export `formatLength` in the provider value.

This extends the existing context without breaking anything. The header toggle and localStorage key remain unchanged.
  </action>
  <verify>
Run `cd C:/Users/vall-/Desktop/projectes/simulador_balistica/frontend && npx next build 2>&1 | tail -20` -- should compile with no errors. Check the rifles page has 3 new Input elements by grepping for "headspace_mm" and "freebore_mm" in the file.
  </verify>
  <done>
Rifle create/edit form shows collapsible "Datos de Recamara" section with headspace_mm, freebore_mm, throat_angle_deg inputs. Editing a rifle with existing chamber data auto-expands the section. Unit context exposes formatLength for mm/inches conversion.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create settings page and make DimensionLabel respect unit preferences</name>
  <files>
    frontend/src/app/settings/page.tsx
    frontend/src/components/drawings/DimensionLabel.tsx
    frontend/src/components/layout/Sidebar.tsx
  </files>
  <action>
**Settings page (settings/page.tsx):**

Create a new page at `/settings` with a clean card-based layout. Use the `'use client'` directive.

1. Import `useUnits` from `@/lib/unit-context`, `Card`/`CardHeader`/`CardTitle`/`CardContent` from UI, and `Settings` icon from lucide-react.

2. The page shows the current unit system and lets the user switch between `metric` and `imperial` using radio buttons or a segmented control. Structure:

```tsx
<div className="space-y-8">
  <div>
    <h2 className="text-2xl font-bold text-white">Configuracion</h2>
    <p className="mt-1 text-sm text-slate-400">Preferencias de unidades y visualizacion</p>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>Sistema de Unidades</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {/* Two radio-card options: Metrico and Imperial */}
        {/* Each shows what units it uses */}
      </div>
    </CardContent>
  </Card>
</div>
```

3. Show two selectable cards (radio-style):
   - **Metrico**: Presion: MPa, Velocidad: m/s, Longitud: mm
   - **Imperial**: Presion: PSI, Velocidad: FPS, Longitud: pulgadas (in)

4. Each card is a clickable div with border highlight when selected. Clicking calls a new `setUnitSystem` method on the context (see below -- but actually, since the existing toggle just flips between two values, we can use `toggleUnits` if current !== desired, or better, add a `setUnitSystem` to the context).

5. Update `unit-context.tsx` to also expose `setUnitSystem: (system: UnitSystem) => void` in addition to `toggleUnits`. Implementation: just wrap the existing `setUnitSystem` state setter with localStorage write:
```typescript
const setSystem = useCallback((system: UnitSystem) => {
  setUnitSystem(system);
  localStorage.setItem(STORAGE_KEY, system);
}, []);
```
Add `setUnitSystem: setSystem` to the provider value.

6. Show a summary table at the bottom of the settings page showing the current active unit for each dimension:
   | Dimension | Unit |
   |-----------|------|
   | Presion | MPa / PSI |
   | Velocidad | m/s / FPS |
   | Longitud | mm / in |

**DimensionLabel changes (DimensionLabel.tsx):**

1. Import `useUnits` from `@/lib/unit-context`.

2. Replace the hardcoded dual-unit `valueText` line:
```typescript
// OLD:
const valueText = `${formatMm(value_mm)} mm / ${formatInch(value_mm)} in${estSuffix}`;

// NEW:
const { unitSystem } = useUnits();
const valueText = unitSystem === 'metric'
  ? `${formatMm(value_mm)} mm${estSuffix}`
  : `${formatInch(value_mm)} in${estSuffix}`;
```

This single change affects ALL dimension labels across all drawings (cross-section, chamber, assembly) since they all use this component.

**Sidebar changes (Sidebar.tsx):**

1. Add a settings nav item at the bottom of the `navItems` array (before the Rifles entry or at the very end):
```typescript
{ href: '/settings', label: 'Configuracion', icon: Settings },
```

2. Import `Settings` from lucide-react.

Place it as the last item in the nav array so it appears at the bottom of the sidebar.
  </action>
  <verify>
Run `cd C:/Users/vall-/Desktop/projectes/simulador_balistica/frontend && npx next build 2>&1 | tail -20` -- should compile with no errors. Grep DimensionLabel.tsx for "useUnits" to confirm integration. Grep settings/page.tsx for "Configuracion" to confirm page exists.
  </verify>
  <done>
Settings page at /settings shows unit system selector with Metrico/Imperial options. DimensionLabel renders only one unit (mm or inches) based on user preference. Sidebar has Configuracion link. Header toggle and settings page stay in sync via shared unit context.
  </done>
</task>

</tasks>

<verification>
1. `cd C:/Users/vall-/Desktop/projectes/simulador_balistica/frontend && npx next build` compiles cleanly
2. Rifle form at /rifles shows chamber fields when "Datos de Recamara" is expanded
3. Settings page at /settings renders with unit selection
4. DimensionLabel uses single-unit display based on context
5. Header toggle and settings page reflect same unit system
</verification>

<success_criteria>
- Rifle create/edit form includes headspace_mm, freebore_mm, throat_angle_deg in collapsible section
- Editing rifle with chamber data auto-expands the section and pre-fills values
- Empty chamber fields submit as null (not 0)
- Settings page accessible at /settings with sidebar link
- Unit system choice persists in localStorage
- Drawing dimensions show ONLY mm OR ONLY inches depending on preference
- Build passes with zero errors
</success_criteria>

<output>
After completion, create `.planning/quick/4-add-missing-rifle-chamber-fields-to-edit/4-SUMMARY.md`
</output>
