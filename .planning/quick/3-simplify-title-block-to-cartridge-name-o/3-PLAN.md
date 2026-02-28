---
phase: quick-03
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/drawings/TitleBlock.tsx
  - frontend/src/lib/drawings/title-block.ts
  - frontend/src/lib/drawings/types.ts
  - frontend/src/components/drawings/CartridgeCrossSection.tsx
  - frontend/src/components/drawings/ChamberDrawing.tsx
  - frontend/src/components/drawings/AssemblyDrawing.tsx
  - frontend/src/components/drawings/BulletProfile.tsx
autonomous: true
requirements: [QUICK-03]

must_haves:
  truths:
    - "Title block in all four drawing types shows ONLY the cartridge/bullet name -- no scale, date, drawing type, or theme name"
    - "Primer flash hole (small circle) is visible at the center of the case head in the cross-section drawing"
    - "No rectangle/box artifact protrudes beyond the cartridge neck in the cross-section drawing"
  artifacts:
    - path: "frontend/src/components/drawings/TitleBlock.tsx"
      provides: "Simplified title block rendering (name only)"
    - path: "frontend/src/lib/drawings/title-block.ts"
      provides: "Simplified title block computation (name only)"
    - path: "frontend/src/lib/drawings/types.ts"
      provides: "Simplified TitleBlockData interface"
    - path: "frontend/src/components/drawings/CartridgeCrossSection.tsx"
      provides: "Restored primer flash hole + removed bore diameter annotation"
  key_links:
    - from: "frontend/src/components/drawings/TitleBlock.tsx"
      to: "frontend/src/lib/drawings/types.ts"
      via: "TitleBlockData interface"
      pattern: "TitleBlockData"
    - from: "frontend/src/components/drawings/CartridgeCrossSection.tsx"
      to: "frontend/src/lib/drawings/title-block.ts"
      via: "computeTitleBlock call"
      pattern: "computeTitleBlock"
---

<objective>
Fix three issues on the drawings page: (1) simplify title block to show only the cartridge/bullet name, (2) restore the primer flash hole circle in the cross-section, (3) remove the bore diameter annotation that creates a rectangle artifact beyond the cartridge neck.

Purpose: Clean up the technical drawing visuals per user request.
Output: Updated drawing components with simplified title block, restored primer hole, and no neck artifact.
</objective>

<execution_context>
@C:/Users/vall-/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/vall-/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/components/drawings/TitleBlock.tsx
@frontend/src/lib/drawings/title-block.ts
@frontend/src/lib/drawings/types.ts
@frontend/src/components/drawings/CartridgeCrossSection.tsx
@frontend/src/components/drawings/ChamberDrawing.tsx
@frontend/src/components/drawings/AssemblyDrawing.tsx
@frontend/src/components/drawings/BulletProfile.tsx

<interfaces>
<!-- TitleBlockData interface (to be simplified) -->
From frontend/src/lib/drawings/types.ts:
```typescript
export interface TitleBlockData {
  name: string;
  drawingType: string;  // REMOVE
  scale: string;        // REMOVE
  date: string;         // REMOVE
  style: string;        // REMOVE
}
```

From frontend/src/lib/drawings/title-block.ts:
```typescript
export const TITLE_BLOCK_WIDTH = 60;  // REDUCE (name-only box is smaller)
export const TITLE_BLOCK_HEIGHT = 15; // REDUCE (single row only)
export function computeTitleBlock(name, drawingType, scale, style): TitleBlockData;
// Simplify to just: computeTitleBlock(name): TitleBlockData
```

From DrawingTheme (used by TitleBlock):
```typescript
titleBlockBg: string;
titleBlockBorder: string;
fontFamily: string;
titleFontSize: number;
dimFontSize: number;
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Simplify title block to name-only across all components</name>
  <files>
    frontend/src/lib/drawings/types.ts
    frontend/src/lib/drawings/title-block.ts
    frontend/src/components/drawings/TitleBlock.tsx
    frontend/src/components/drawings/CartridgeCrossSection.tsx
    frontend/src/components/drawings/ChamberDrawing.tsx
    frontend/src/components/drawings/AssemblyDrawing.tsx
    frontend/src/components/drawings/BulletProfile.tsx
  </files>
  <action>
    1. In `frontend/src/lib/drawings/types.ts`: Simplify `TitleBlockData` to only have `name: string`. Remove `drawingType`, `scale`, `date`, `style` fields.

    2. In `frontend/src/lib/drawings/title-block.ts`:
       - Reduce `TITLE_BLOCK_HEIGHT` from 15 to 7 (single row for just a name).
       - Keep `TITLE_BLOCK_WIDTH` at 60 (cartridge names can be long like ".308 Winchester").
       - Simplify `computeTitleBlock` to accept only `name: string` and return `{ name }`. Remove the drawingType, scale, style parameters and all the date/scale formatting logic.

    3. In `frontend/src/components/drawings/TitleBlock.tsx`:
       - Remove the 3-row layout (row dividers, row 2 drawingType+scale, row 3 date+style).
       - Render a single box with the name centered vertically. Keep the outer rectangle with `theme.titleBlockBg` fill and `theme.titleBlockBorder` stroke.
       - Single `<text>` element for `data.name`, bold, using `theme.titleFontSize`, vertically centered in the box.

    4. Update all 4 callers to use the simplified `computeTitleBlock(name)` signature:
       - `CartridgeCrossSection.tsx` line ~226: `computeTitleBlock(cartridge.name)` (remove 'Cartridge Cross-Section', 1, style args)
       - `ChamberDrawing.tsx` line ~199: `computeTitleBlock(cartridge.name)` (remove 'Cartridge in Chamber', 1, style args)
       - `AssemblyDrawing.tsx` line ~155: `computeTitleBlock(cartridge.name)` (remove drawingType, 1, style args). Also remove the `simulation` dependency in the useMemo deps array since drawingType no longer depends on it.
       - `BulletProfile.tsx` line ~123: `computeTitleBlock(bullet.name)` (remove 'Bullet Profile', 1, style args)
  </action>
  <verify>
    Run `cd /c/Users/vall-/Desktop/projectes/simulador_balistica/frontend && npx tsc --noEmit` to verify no TypeScript errors after interface changes.
  </verify>
  <done>
    Title block in all four drawing types shows only the cartridge/bullet name in a compact single-row box. No scale, date, drawing type, or theme name visible. TypeScript compiles clean.
  </done>
</task>

<task type="auto">
  <name>Task 2: Restore primer flash hole and remove bore diameter neck artifact</name>
  <files>
    frontend/src/components/drawings/CartridgeCrossSection.tsx
  </files>
  <action>
    **Restore primer flash hole:**
    In `CartridgeCrossSection.tsx`, add a primer flash hole as a small circle at the center of the case head. This was removed in commit 7be980b along with the rectangular primer pocket. The flash hole is the small passage through the case web that allows the primer flash to ignite the powder.

    Add after the inner case wall path rendering (after the `<path d={innerWallPath} .../>` element), before the case web thickness line:

    ```tsx
    {/* Primer flash hole (small circle at case head center) */}
    <circle
      cx={cartridge.rim_thickness_mm ?? 1.3}
      cy={0}
      r={1.0}
      fill={theme.powderFill === 'none' ? 'url(#hatch-powder)' : theme.powderFill}
      stroke={theme.hiddenEdge}
      strokeWidth={theme.thinStrokeWidth}
    />
    ```

    The flash hole is centered on the centerline (cy=0), positioned at the rim thickness x-position (where the case web meets the primer pocket area), with a radius of approximately 1.0mm (standard flash hole diameter is ~1.6-2.0mm, so radius 0.8-1.0mm). Use `theme.powderFill` fill (same as the powder chamber interior) and `theme.hiddenEdge` stroke to indicate it's an internal feature.

    **Remove bore diameter annotation artifact:**
    In the `annotations` useMemo block, remove the bore diameter dimension annotation (lines ~198-205 in current file). This annotation draws at `caseLength + 2` which places extension lines beyond the cartridge neck, creating the visible rectangle/box artifact. The bore diameter is a property of the barrel, not the cartridge case, so it should not appear on a cartridge cross-section drawing.

    Remove this entire block:
    ```tsx
    dims.push({
      x1: caseLength + 2, y1: -(cartridge.bore_diameter_mm / 2),
      x2: caseLength + 2, y2: cartridge.bore_diameter_mm / 2,
      value_mm: cartridge.bore_diameter_mm,
      label: 'Bore Dia.',
      side: 'right',
      offset_tier: 1,
    });
    ```
  </action>
  <verify>
    Run `cd /c/Users/vall-/Desktop/projectes/simulador_balistica/frontend && npx tsc --noEmit` to verify no TypeScript errors. Then visually confirm by running `cd /c/Users/vall-/Desktop/projectes/simulador_balistica/frontend && npm run build` to ensure the build succeeds.
  </verify>
  <done>
    Primer flash hole circle is visible at the case head center in the cross-section drawing. No bore diameter rectangle/box artifact protrudes beyond the cartridge neck. Build passes clean.
  </done>
</task>

</tasks>

<verification>
1. `cd frontend && npx tsc --noEmit` -- zero TypeScript errors
2. `cd frontend && npm run build` -- build succeeds with no errors
3. Title block in all drawings shows only the name (no scale, date, type, theme)
4. Cross-section shows a small circle at the case head (primer flash hole)
5. No rectangle artifact protrudes beyond the neck in cross-section view
</verification>

<success_criteria>
- All four drawing components render title blocks with only the name
- Primer flash hole circle visible at case head center in cross-section
- No bore diameter annotation lines or rectangle beyond the case neck
- TypeScript compiles and Next.js builds without errors
</success_criteria>

<output>
After completion, create `.planning/quick/3-simplify-title-block-to-cartridge-name-o/3-SUMMARY.md`
</output>
