---
phase: quick-02
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/drawings/DrawingViewer.tsx
  - frontend/src/components/drawings/CartridgeCrossSection.tsx
  - frontend/src/components/drawings/AssemblyDrawing.tsx
  - frontend/src/components/drawings/ChamberDrawing.tsx
  - frontend/src/components/drawings/BulletProfile.tsx
  - frontend/src/lib/drawings/themes.ts
  - frontend/src/lib/drawings/types.ts
  - frontend/src/lib/drawings/dimension-layout.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "SVG drawings fit within the viewport without requiring horizontal scroll on a standard 1920px monitor"
    - "Cartridge/assembly/chamber outline strokes are visually thin (technical drawing weight, not bold)"
    - "All dimension labels (cotas) are readable without overlapping each other"
    - "Drawings still export correctly to PDF/PNG at full quality"
  artifacts:
    - path: "frontend/src/lib/drawings/types.ts"
      provides: "DrawingTheme with stroke width properties"
      contains: "outlineStrokeWidth"
    - path: "frontend/src/lib/drawings/dimension-layout.ts"
      provides: "Interval-span-aware overlap detection"
      contains: "intervalStart"
  key_links:
    - from: "frontend/src/lib/drawings/themes.ts"
      to: "drawing components"
      via: "theme.outlineStrokeWidth"
      pattern: "theme\\.outlineStrokeWidth"
    - from: "frontend/src/lib/drawings/dimension-layout.ts"
      to: "DimensionLabel"
      via: "layoutDimensions() assigns non-overlapping tiers"
      pattern: "layoutDimensions"
---

<objective>
Fix three visual issues on the /drawings page: (1) SVG drawings are oversized and not responsive to screen size, (2) cartridge/assembly line strokes are too thick, and (3) dimension labels (cotas) overlap making them unreadable.

Purpose: Make technical drawings usable and professional-looking at any screen size.
Output: Updated drawing components, theme, and layout algorithm with proper sizing, thin strokes, and non-overlapping labels.
</objective>

<execution_context>
@C:/Users/vall-/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/vall-/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/components/drawings/DrawingViewer.tsx
@frontend/src/components/drawings/CartridgeCrossSection.tsx
@frontend/src/components/drawings/AssemblyDrawing.tsx
@frontend/src/components/drawings/ChamberDrawing.tsx
@frontend/src/components/drawings/BulletProfile.tsx
@frontend/src/components/drawings/DimensionLabel.tsx
@frontend/src/lib/drawings/themes.ts
@frontend/src/lib/drawings/types.ts
@frontend/src/lib/drawings/dimension-layout.ts

<interfaces>
<!-- Key types the executor needs -->

From frontend/src/lib/drawings/types.ts:
```typescript
export interface DrawingTheme {
  name: string;
  background: string;
  outline: string;
  hiddenEdge: string;
  dimColor: string;
  textColor: string;
  hatchColor: string;
  caseFill: string;
  copperFill: string;
  leadColor: string;
  powderFill: string;
  steelFill: string;
  titleBlockBg: string;
  titleBlockBorder: string;
  fontFamily: string;
  dimFontSize: number;    // SVG user units (mm)
  titleFontSize: number;  // SVG user units (mm)
}

export interface DimensionAnnotation {
  x1: number; y1: number; x2: number; y2: number;
  value_mm: number;
  label: string;
  side: 'top' | 'bottom' | 'left' | 'right';
  offset_tier: number;
}
```

From frontend/src/lib/drawings/dimension-layout.ts:
```typescript
export const TIER_SPACING_MM = 9;
export const BASE_OFFSET_MM = 12;
export function layoutDimensions(
  annotations: DimensionAnnotation[],
  _drawingBounds: { width: number; height: number },
  dimFontSize?: number
): DimensionAnnotation[];
```

Current stroke widths (hardcoded across components):
- CartridgeCrossSection: outer profile strokeWidth={0.7}, inner wall strokeWidth={0.3}
- AssemblyDrawing: barrel walls strokeWidth={0.5}, cartridge strokeWidth={0.5}, bullet strokeWidth={0.4}
- ChamberDrawing: chamber strokeWidth={0.7}, cartridge strokeWidth={0.5}
- BulletProfile: profile strokeWidth={0.5}
- DimensionLabel: dim lines strokeWidth={0.4}, extension lines strokeWidth={0.25}

Current SVG sizing: all use style={{ width: '100%', height: 'auto' }} with no max-height constraint.
Container: div.overflow-x-auto with no height restrictions.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Responsive SVG sizing + thinner strokes via theme</name>
  <files>
    frontend/src/lib/drawings/types.ts
    frontend/src/lib/drawings/themes.ts
    frontend/src/components/drawings/DrawingViewer.tsx
    frontend/src/components/drawings/CartridgeCrossSection.tsx
    frontend/src/components/drawings/AssemblyDrawing.tsx
    frontend/src/components/drawings/ChamberDrawing.tsx
    frontend/src/components/drawings/BulletProfile.tsx
  </files>
  <action>
    **A) Add stroke width properties to DrawingTheme (types.ts + themes.ts):**
    Add these fields to the DrawingTheme interface in types.ts:
    - `outlineStrokeWidth: number` (main profile outlines)
    - `thinStrokeWidth: number` (secondary lines like inner walls, hidden edges)
    - `dimStrokeWidth: number` (dimension/extension lines)

    Set values in themes.ts for both blueprint and modern:
    - `outlineStrokeWidth: 0.35` (was 0.5-0.7 hardcoded -- halved for thinner look)
    - `thinStrokeWidth: 0.15` (was 0.2-0.3 hardcoded)
    - `dimStrokeWidth: 0.2` (was 0.25-0.4 hardcoded)

    **B) Replace hardcoded strokeWidths in all drawing components:**
    In CartridgeCrossSection.tsx:
    - Outer profile path: change `strokeWidth={0.7}` to `strokeWidth={theme.outlineStrokeWidth}`
    - Inner wall path: change `strokeWidth={0.3}` to `strokeWidth={theme.thinStrokeWidth}`
    - Case web line: change `strokeWidth={0.25}` to `strokeWidth={theme.thinStrokeWidth}`
    - Bullet jacket: change `strokeWidth={0.5}` to `strokeWidth={theme.outlineStrokeWidth}`
    - Centerline: keep `strokeWidth={0.15}` (cosmetic, fine as-is)

    In AssemblyDrawing.tsx:
    - Barrel wall rects: change `strokeWidth={0.5}` to `strokeWidth={theme.outlineStrokeWidth}`
    - Cartridge path: change `strokeWidth={0.5}` to `strokeWidth={theme.outlineStrokeWidth}`
    - Bullet path: change `strokeWidth={0.4}` to `strokeWidth={theme.outlineStrokeWidth}`
    - Rifling marks: change `strokeWidth={0.2}` to `strokeWidth={theme.thinStrokeWidth}`
    - Stress zone rect: change `strokeWidth={0.3}` to `strokeWidth={theme.thinStrokeWidth}`

    In ChamberDrawing.tsx:
    - Chamber path: change `strokeWidth={0.7}` to `strokeWidth={theme.outlineStrokeWidth}`
    - Cartridge path: change `strokeWidth={0.5}` to `strokeWidth={theme.outlineStrokeWidth}`
    - Freebore rect: change `strokeWidth={0.2}` to `strokeWidth={theme.thinStrokeWidth}`
    - Throat taper lines: change `strokeWidth={0.4}` to `strokeWidth={theme.thinStrokeWidth}`
    - Rifling indicators: change `strokeWidth={0.2}` to `strokeWidth={theme.thinStrokeWidth}`

    In BulletProfile.tsx:
    - Bullet profile path: change `strokeWidth={0.5}` to `strokeWidth={theme.outlineStrokeWidth}`

    **C) Constrain SVG height for responsive display (DrawingViewer.tsx):**
    In DrawingViewer.tsx, the primary drawing container div (line ~157, class `overflow-x-auto rounded border border-slate-700 bg-slate-800/50`), add a max-height and centering:
    - Change the container div to: `<div className="overflow-x-auto rounded border border-slate-700 bg-slate-800/50 flex items-center justify-center" style={{ maxHeight: '70vh' }}>`
    - This ensures drawings never exceed 70% of viewport height, with the SVG scaling down via viewBox/preserveAspectRatio.

    Also in each SVG component (CartridgeCrossSection, AssemblyDrawing, ChamberDrawing, BulletProfile), change the style prop from:
    `style={{ width: '100%', height: 'auto' }}`
    to:
    `style={{ width: '100%', height: '100%', maxHeight: '70vh' }}`
    This gives the SVG both width and height constraints while preserveAspectRatio handles proper scaling.

    **IMPORTANT:** Do NOT change the viewBox or preserveAspectRatio attributes -- those are correct. The fix is purely CSS max-height constraining.
    **IMPORTANT:** Do NOT alter the hidden alt-style div (for export) -- that must remain unconstrained for full-size export.
  </action>
  <verify>
    Run `cd C:/Users/vall-/Desktop/projectes/simulador_balistica/frontend && npx next build 2>&1 | tail -20` to verify no TypeScript errors. Check that DrawingTheme has 3 new fields, both themes define them, and no hardcoded 0.5/0.7 strokeWidth remains in drawing components (grep for `strokeWidth={0\.[4-9]}` in drawings/).
  </verify>
  <done>
    All 4 drawing components use theme-based stroke widths (0.35 outline, 0.15 thin). SVG container has max-height: 70vh preventing oversized rendering. No TypeScript errors. Export still uses unconstrained hidden SVG.
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix dimension label overlap with span-aware layout</name>
  <files>
    frontend/src/lib/drawings/dimension-layout.ts
  </files>
  <action>
    The current `layoutDimensions()` algorithm computes the overlap interval from the TEXT center only. This means two dimensions whose text doesn't overlap but whose dimension LINES visually cross (e.g., "Case Length" 0->51mm and "Neck Length" 45->51mm in cross-section) can land on the same tier, causing visual collision.

    **Fix the interval computation** to use the FULL SPAN of the dimension (from x1 to x2 for horizontal, y1 to y2 for vertical), UNION-ed with the text interval. This ensures that overlapping dimension line regions also trigger tier separation.

    In the main loop of `layoutDimensions()`, replace the interval computation block (lines ~102-114) with:

    ```typescript
    if (isHorizontal) {
      const midX = (ann.x1 + ann.x2) / 2;
      const textStart = midX - textWidth / 2 - margin;
      const textEnd = midX + textWidth / 2 + margin;
      // Union of dimension line span and text span
      const lineStart = Math.min(ann.x1, ann.x2);
      const lineEnd = Math.max(ann.x1, ann.x2);
      intervalStart = Math.min(textStart, lineStart);
      intervalEnd = Math.max(textEnd, lineEnd);
    } else {
      const midY = (ann.y1 + ann.y2) / 2;
      const textStart = midY - textWidth / 2 - margin;
      const textEnd = midY + textWidth / 2 + margin;
      // Union of dimension line span and text span
      const lineStart = Math.min(ann.y1, ann.y2);
      const lineEnd = Math.max(ann.y1, ann.y2);
      intervalStart = Math.min(textStart, lineStart);
      intervalEnd = Math.max(textEnd, lineEnd);
    }
    ```

    This makes any dimension that shares line span with another dimension go to a different tier. For the "Case Length" (0->51mm) and "Neck Length" (45->51mm) case: the line spans overlap at 45-51mm, so they get separate tiers even though their text midpoints (25.5 vs 48) would not have collided.

    **Also reduce tier spacing** for a more compact layout:
    - Change `TIER_SPACING_MM = 9` to `TIER_SPACING_MM = 6` (tiers are now closer since overlap detection is more accurate)
    - Change `BASE_OFFSET_MM = 12` to `BASE_OFFSET_MM = 8` (closer to the drawing outline)

    These reductions are safe because the algorithm now correctly separates overlapping dimensions, so the extra safety margin from large spacing is no longer needed.
  </action>
  <verify>
    Run `cd C:/Users/vall-/Desktop/projectes/simulador_balistica/frontend && npx next build 2>&1 | tail -20` to verify no TypeScript errors. Manually verify the algorithm logic: create a simple test scenario where two horizontal annotations share line span (0->50 and 40->50) and confirm they get different tiers. Can check by adding a `console.log` temporarily or by reading the code.
  </verify>
  <done>
    Dimension layout algorithm uses full dimension line span (union of line extent + text extent) for overlap detection. TIER_SPACING_MM reduced from 9 to 6, BASE_OFFSET_MM reduced from 12 to 8. Case Length and Neck Length dimensions in cross-section view now reliably land on separate tiers.
  </done>
</task>

</tasks>

<verification>
1. `cd C:/Users/vall-/Desktop/projectes/simulador_balistica/frontend && npx next build` -- clean build, no TS errors
2. Grep: no remaining hardcoded strokeWidth values > 0.35 in drawing components (except centerline 0.15 and OBT markers which are overlay-specific)
3. DrawingTheme interface has outlineStrokeWidth, thinStrokeWidth, dimStrokeWidth
4. SVG elements have maxHeight constraint in style prop
5. layoutDimensions interval computation includes both line span and text span
</verification>

<success_criteria>
- SVGs render at a reasonable size that fits in the browser viewport (max 70vh) without horizontal scrolling
- Cartridge/assembly/chamber outlines use 0.35mm strokes instead of 0.5-0.7mm (noticeably thinner)
- All dimension labels on cross-section view are readable and non-overlapping, including Case Length + Neck Length
- PDF/PNG export still works at full resolution (hidden alt SVG is unconstrained)
- No TypeScript compilation errors
</success_criteria>

<output>
After completion, create `.planning/quick/2-fix-drawings-responsive-sizing-thinner-l/2-SUMMARY.md`
</output>
