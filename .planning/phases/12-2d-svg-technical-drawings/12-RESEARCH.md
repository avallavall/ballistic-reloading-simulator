# Phase 12: 2D SVG Technical Drawings - Research

**Researched:** 2026-02-27
**Domain:** SVG technical drawing generation, client-side export (PNG/SVG/PDF), React inline SVG components
**Confidence:** HIGH

## Summary

This phase builds a 2D technical drawing system entirely in the frontend, leveraging the geometry engine created in Phase 11. The existing `generateCartridgeProfile()` and `generateBulletProfile()` functions already produce SVG path data and profile points from database dimensions, with completeness tiers (full/basic/insufficient). Phase 12 consumes this output to render three tabbed SVG drawings: cartridge cross-section, cartridge-in-chamber, and full barrel assembly with harmonics overlay.

The architecture is straightforward: React components render inline SVG elements using the geometry engine's output. No external SVG library is needed -- React's native JSX SVG support handles all rendering. ISO-standard hatching uses SVG `<pattern>` elements defined in `<defs>`. Dimension annotations use SVG `<line>`, `<text>`, and leader lines with a layout algorithm to avoid overlaps. Export uses three approaches: direct SVG serialization for SVG export, canvas-based rasterization at 600 DPI for PNG, and jsPDF + svg2pdf.js for vector PDF.

The main backend work is adding three nullable fields to the Rifle model (freebore_mm, throat_angle_deg, headspace_mm) per user decision, plus an Alembic migration. The rest is purely frontend.

**Primary recommendation:** Build inline React SVG components consuming the existing geometry engine, with a dedicated `useSvgExport` hook for PNG (canvas at 600 DPI), SVG (XMLSerializer), and PDF (jsPDF + svg2pdf.js) export.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Two visual styles available with a toggle button: **Blueprint** and **Modern**
- **Blueprint style**: Classic navy/midnight blue background with white/light blue lines and monospace labels -- traditional blueprint aesthetic
- **Modern style**: Clean white background with dark gray lines and realistic material colors (brass case = gold/amber, copper jacket = copper tone, lead core = dark gray, steel barrel = medium gray)
- Full cross-section views showing internal structure: case wall thickness, primer pocket, bullet jacket vs core, powder charge area
- Standard ISO/ANSI engineering hatching patterns: diagonal lines for metals, dots for powder area, solid fill for lead core
- ISO standard line weights: thick (0.7mm) visible outlines, medium (0.5mm) dimensions, thin (0.25mm) hatching, dashed for hidden edges
- Full engineering title block in bottom-right corner: cartridge/rifle name, scale indicator, date, drawing type -- included in all exports
- Fixed responsive sizing (no interactive zoom/pan) -- drawing scales to fit container
- PNG export at 600 DPI for high-quality print output
- **Dual unit display** on all dimensions: mm and inches (e.g., "52.0 mm / 2.048 in")
- Show ALL dimensions: both SAAMI spec dimensions and reloader-critical dimensions
- Smart staggered layout with leader lines to avoid overlap -- Claude handles layout algorithm
- Decimal precision matches database values (show exactly as stored)
- **Chamber drawing**: Show computed clearance values (headspace gap, neck clearance, body clearance) as labeled dimension callouts
- **Three entry points** for drawings:
  1. Dedicated `/drawings` page in sidebar -- select cartridge/rifle, view all 3 tabs
  2. Embedded "Drawings" tab within existing cartridge and rifle detail pages
  3. Linked from simulation results -- assembly drawing includes that sim's harmonics/stress data
- **Horizontal tabs** for the 3 drawing types: Cross-Section | Chamber | Assembly
- Assembly tab always available -- shows barrel + cartridge assembly even without simulation data; harmonics/stress overlay added only when simulation results exist
- **Three tiers** based on data completeness:
  - **Full detail**: All SAAMI dimensions populated -- complete cross-section with all labels
  - **Basic outline**: Minimum viable set (OAL + base diameter + case length) -- simplified outline shape with whatever dimensions are available labeled
  - **Insufficient data**: Below minimum viable set -- message "Not enough dimensions to draw this cartridge/rifle" with direct edit link
- **Yellow/orange banner** showing completeness: "Basic view -- 5 of 12 dimensions available" with link to complete the data
- Basic outline tier still shows dimension labels for all available fields
- Three export formats: **PNG** (600 DPI), **SVG** (vector), **PDF** (print-ready)
- Export always includes **both styles** (blueprint + modern) so user gets both versions
- Title block included in all exports
- Export available on all devices including mobile
- **Cartridge drawing** fed by: case_length_mm, overall_length_mm, bore_diameter_mm, groove_diameter_mm, shoulder_diameter_mm, neck_diameter_mm, base_diameter_mm, rim_diameter_mm, shoulder_angle_deg, neck_length_mm, body_length_mm, rim_thickness_mm, case_type
- **Bullet drawing** fed by: diameter_mm, length_mm, bearing_surface_mm, boat_tail_length_mm, meplat_diameter_mm, ogive_type (approximate ogive curve from type, no numeric radius field needed)
- **Chamber drawing**: SAAMI standard chamber specs derived from cartridge dimensions as defaults, with optional per-rifle overrides -- add freebore_mm, throat_angle_deg, headspace_mm fields to Rifle model
- **Assembly drawing**: Barrel as straight cylinder (no contour/taper data in model), rifling engagement shown based on bullet/bore dimensions
- **Simulation overlay** (when accessed from sim results): Stress/pressure zone coloring on case, OBT harmonic node positions on barrel, other simulation-derived data overlaid on the mechanical drawing
- Horizontal scroll on mobile -- drawing maintains full aspect ratio and detail, user scrolls to see full width
- Adapted mobile navigation: dropdown or segmented control instead of horizontal tabs to save vertical space
- Export buttons available on all screen sizes

### Claude's Discretion
- Style toggle persistence strategy (localStorage vs default)
- OBT harmonic node visual style (colored overlay vs engineering annotation)
- Powder charge area representation in cartridge cross-section
- Batch export approach (ZIP vs multi-page PDF vs individual only)
- Export button UX (dropdown vs separate buttons)
- SAAMI chamber dimension source (derived with tolerances vs lookup table)
- Smart dimension layout algorithm details

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIS2-01 | User can view cartridge cross-section SVG with labeled dimensions from DB data | Geometry engine (`generateCartridgeProfile`) already produces SVG paths + profile points; React inline SVG renders the cross-section with `<pattern>` hatching and dimension annotations |
| VIS2-02 | User can view cartridge-in-chamber drawing showing headspace, freebore, and rifling engagement | New chamber geometry function computes clearances from cartridge dims + rifle chamber fields (freebore_mm, throat_angle_deg, headspace_mm added to Rifle model via migration 010) |
| VIS2-03 | User can view full assembly drawing with barrel and OBT harmonic node positions overlaid | Assembly SVG composites cartridge + bullet + barrel cylinder, with optional simulation overlay (OBT nodes from `optimal_barrel_times`, stress from `hoop_stress_mpa`) |
| VIS2-04 | Drawings degrade gracefully in three tiers based on data completeness | Geometry engine already classifies `dataCompleteness: 'full' | 'basic' | 'insufficient'`; drawing components conditionally render tier-appropriate content and completeness banner |
| VIS2-05 | User can export 2D drawings as PNG | SVG-to-canvas at 600 DPI via XMLSerializer + Image + canvas.toBlob, plus SVG download via Blob, plus PDF via jsPDF + svg2pdf.js |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (inline SVG) | 18.3.1 (already installed) | SVG rendering | React's JSX natively supports all SVG elements; no wrapper library needed for static technical drawings |
| jsPDF | ^4.2.0 | PDF generation | Most popular client-side PDF library; v4 fixes critical security vulnerability (CVE-2025-68428) |
| svg2pdf.js | ^2.5.0 | SVG-to-PDF conversion | Only maintained SVG-to-jsPDF bridge; preserves vector quality in PDF output |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| file-saver | ^2.0.5 (already installed) | File download trigger | Used by existing chart export system; reuse for SVG/PNG/PDF downloads |
| lucide-react | ^0.447.0 (already installed) | Icons (download, toggle, tabs) | Already used throughout the UI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline React SVG | D3.js | D3 adds 80KB+ and imperative API; overkill for static technical drawings with known geometry |
| Inline React SVG | Fabric.js | Canvas-based; loses vector quality for SVG/PDF export |
| jsPDF + svg2pdf.js | html2canvas-based PDF | html2canvas has known SVG rendering bugs (patterns, transforms); svg2pdf preserves vectors |
| Canvas toBlob for PNG | html2canvas | html2canvas struggles with inline SVG patterns and transforms; direct canvas drawing from serialized SVG is more reliable |

**Installation:**
```bash
cd frontend && npm install jspdf@^4.2.0 svg2pdf.js@^2.5.0
```

Note: `file-saver`, `@types/file-saver`, `lucide-react`, and all React dependencies are already installed.

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/
├── lib/
│   ├── geometry/                    # Existing (Phase 11)
│   │   ├── types.ts                 # ProfilePoint, GeometryResult, etc.
│   │   ├── cartridge-geometry.ts    # generateCartridgeProfile()
│   │   ├── bullet-geometry.ts       # generateBulletProfile()
│   │   └── estimation.ts            # Heuristic estimation functions
│   └── drawings/                    # NEW - Drawing computation layer
│       ├── types.ts                 # DimensionAnnotation, DrawingConfig, StyleTheme, etc.
│       ├── dimension-layout.ts      # Smart stagger algorithm for dimension labels
│       ├── hatching-patterns.ts     # SVG <pattern> definitions for materials
│       ├── chamber-geometry.ts      # Chamber clearance computations
│       ├── assembly-geometry.ts     # Barrel + cartridge + bullet composition
│       ├── title-block.ts           # Title block data structure
│       └── export.ts                # PNG/SVG/PDF export utilities
├── components/
│   └── drawings/                    # NEW - React SVG components
│       ├── CartridgeCrossSection.tsx # Tab 1: Cartridge cross-section SVG
│       ├── ChamberDrawing.tsx       # Tab 2: Cartridge-in-chamber SVG
│       ├── AssemblyDrawing.tsx      # Tab 3: Full assembly with harmonics
│       ├── DimensionLabel.tsx       # Reusable dimension annotation component
│       ├── HatchPattern.tsx         # SVG <defs> with hatching patterns
│       ├── TitleBlock.tsx           # Engineering title block SVG group
│       ├── StyleToggle.tsx          # Blueprint/Modern toggle button
│       ├── DrawingTabs.tsx          # Tab container with responsive dropdown
│       ├── CompletenessBanner.tsx   # Yellow/orange data completeness warning
│       └── ExportMenu.tsx           # Export dropdown (PNG/SVG/PDF)
├── hooks/
│   └── useSvgExport.ts             # NEW - SVG/PNG/PDF export hook
└── app/
    └── drawings/
        └── page.tsx                 # NEW - Dedicated /drawings page
```

### Pattern 1: Inline React SVG Components
**What:** React components that return `<svg>` elements directly, using JSX for all SVG primitives (`<path>`, `<line>`, `<text>`, `<pattern>`, `<g>`, etc.)
**When to use:** When SVG content is computed from data (not static assets) and needs to respond to props/state changes.
**Example:**
```tsx
// Cartridge cross-section as a React component
interface CartridgeCrossSectionProps {
  cartridge: Cartridge;
  bullet?: Bullet;
  style: 'blueprint' | 'modern';
  width: number;
  height: number;
}

export function CartridgeCrossSection({ cartridge, bullet, style, width, height }: CartridgeCrossSectionProps) {
  const dims: CartridgeDimensions = {
    case_length_mm: cartridge.case_length_mm,
    base_diameter_mm: cartridge.base_diameter_mm,
    neck_diameter_mm: cartridge.neck_diameter_mm,
    // ... map all fields
  };

  const result = generateCartridgeProfile(dims);

  if (result.dataCompleteness === 'insufficient') {
    return <InsufficientDataMessage entityType="cartridge" entityId={cartridge.id} />;
  }

  // Compute scale: fit drawing into viewport with margin
  const drawingWidth = cartridge.overall_length_mm || cartridge.case_length_mm;
  const drawingHeight = (cartridge.rim_diameter_mm || cartridge.base_diameter_mm || 12) * 1.5;
  const scale = Math.min(
    (width - 100) / drawingWidth,   // Leave margin for dimensions
    (height - 80) / drawingHeight
  );

  const theme = style === 'blueprint' ? blueprintTheme : modernTheme;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <HatchPatterns theme={theme} />
      </defs>
      <rect width={width} height={height} fill={theme.background} />
      <g transform={`translate(${margin}, ${height/2}) scale(${scale})`}>
        <path d={result.svgPath} fill={theme.caseFill} stroke={theme.outline} strokeWidth={0.7 / scale} />
        {/* Internal structure, hatching, dimensions... */}
      </g>
      <TitleBlock
        x={width - titleBlockWidth}
        y={height - titleBlockHeight}
        name={cartridge.name}
        drawingType="Cartridge Cross-Section"
        scale={scale}
        theme={theme}
      />
    </svg>
  );
}
```

### Pattern 2: SVG Hatching with `<pattern>` Elements
**What:** ISO/ANSI material hatching defined as reusable SVG patterns in `<defs>`.
**When to use:** For cross-section material identification (metals = diagonal lines, powder = dots, lead = solid fill).
**Example:**
```tsx
// Source: MDN SVG Patterns documentation + ISO 128-50 hatching standards
export function HatchPatterns({ theme }: { theme: DrawingTheme }) {
  const lineColor = theme.hatchColor;
  return (
    <>
      {/* Metal hatching: 45-degree diagonal lines (ISO standard for metals) */}
      <pattern id="hatch-metal" width="6" height="6" patternUnits="userSpaceOnUse"
               patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6"
              stroke={lineColor} strokeWidth="0.25" />
      </pattern>

      {/* Powder area: dot pattern */}
      <pattern id="hatch-powder" width="4" height="4" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="0.5" fill={lineColor} />
      </pattern>

      {/* Lead core: solid dark fill */}
      <pattern id="fill-lead" width="1" height="1" patternUnits="objectBoundingBox">
        <rect width="1" height="1" fill={theme.leadColor} />
      </pattern>

      {/* Brass case: diagonal lines (can also use solid fill in modern style) */}
      <pattern id="hatch-brass" width="5" height="5" patternUnits="userSpaceOnUse"
               patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="5"
              stroke={lineColor} strokeWidth="0.25" />
      </pattern>
    </>
  );
}
```

### Pattern 3: Dimension Annotation with Leader Lines
**What:** Engineering-style dimension callouts using SVG `<line>`, `<text>`, and arrow markers.
**When to use:** For every dimension on the drawing -- dual-unit display (mm / inches).
**Example:**
```tsx
interface DimensionLabelProps {
  x1: number; y1: number;  // Start point on drawing
  x2: number; y2: number;  // End point on drawing
  value_mm: number;
  offset: number;           // How far above/below to place the dimension line
  side: 'top' | 'bottom' | 'left' | 'right';
  theme: DrawingTheme;
}

export function DimensionLabel({ x1, y1, x2, y2, value_mm, offset, side, theme }: DimensionLabelProps) {
  const value_in = value_mm / 25.4;
  const label = `${value_mm.toFixed(1)} mm / ${value_in.toFixed(3)} in`;
  // Extension lines + dimension line + arrows + centered text
  return (
    <g className="dimension-annotation">
      {/* Extension lines from feature to dimension line */}
      <line x1={x1} y1={y1} x2={x1} y2={y1 - offset}
            stroke={theme.dimColor} strokeWidth={0.25} strokeDasharray="2,1" />
      <line x1={x2} y1={y2} x2={x2} y2={y2 - offset}
            stroke={theme.dimColor} strokeWidth={0.25} strokeDasharray="2,1" />
      {/* Dimension line with arrows */}
      <line x1={x1} y1={y1 - offset} x2={x2} y2={y2 - offset}
            stroke={theme.dimColor} strokeWidth={0.5} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
      {/* Label text centered above dimension line */}
      <text x={(x1+x2)/2} y={y1 - offset - 2}
            textAnchor="middle" fill={theme.textColor}
            fontSize={theme.dimFontSize} fontFamily={theme.fontFamily}>
        {label}
      </text>
    </g>
  );
}
```

### Pattern 4: Client-Side SVG Export (PNG at 600 DPI)
**What:** Serialize inline SVG to string, render onto canvas at high DPI, export as PNG blob.
**When to use:** For the PNG export button.
**Example:**
```tsx
export async function exportSvgAsPng(svgElement: SVGSVGElement, filename: string, dpi: number = 600): Promise<void> {
  // Get SVG dimensions from viewBox
  const viewBox = svgElement.viewBox.baseVal;
  const svgWidth = viewBox.width || svgElement.clientWidth;
  const svgHeight = viewBox.height || svgElement.clientHeight;

  // Scale factor for target DPI (base = 96 DPI screen)
  const scaleFactor = dpi / 96;
  const canvasWidth = Math.round(svgWidth * scaleFactor);
  const canvasHeight = Math.round(svgHeight * scaleFactor);

  // Serialize SVG to string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  // Draw to canvas at target resolution
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const img = new Image();
  return new Promise((resolve, reject) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `${filename}.png`);
          resolve();
        } else {
          reject(new Error('Canvas toBlob returned null'));
        }
      }, 'image/png');
    };
    img.onerror = reject;
    img.src = url;
  });
}
```

### Pattern 5: SVG-to-PDF via jsPDF + svg2pdf.js
**What:** Client-side vector PDF generation from SVG elements.
**When to use:** For the PDF export button.
**Example:**
```tsx
import { jsPDF } from 'jspdf';
import 'svg2pdf.js'; // Side-effect import adds .svg() method to jsPDF

export async function exportSvgAsPdf(svgElement: SVGSVGElement, filename: string): Promise<void> {
  const viewBox = svgElement.viewBox.baseVal;
  const width = viewBox.width || svgElement.clientWidth;
  const height = viewBox.height || svgElement.clientHeight;

  // Create PDF with matching aspect ratio
  const orientation = width > height ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: [width, height],
  });

  await doc.svg(svgElement, { x: 0, y: 0, width, height });
  doc.save(`${filename}.pdf`);
}
```

### Anti-Patterns to Avoid
- **Using html2canvas for SVG export:** html2canvas has documented issues with SVG `<pattern>` elements, CSS-defined SVG styles, and transforms. Direct SVG serialization to canvas via `XMLSerializer + Image.src` is more reliable and produces better quality.
- **Using D3 or a charting library for static technical drawings:** The drawings are geometric shapes from known coordinates, not data visualizations. D3's data-binding paradigm adds complexity without benefit.
- **Putting drawing logic in React components:** Keep geometry computation (coordinates, clearances, scale) in pure TypeScript functions (`lib/drawings/`). React components should only handle rendering the computed SVG elements.
- **Rendering both styles simultaneously:** Only render the active style. Both styles are needed for export, so the export function renders each style off-screen, serializes, and exports both.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Custom PDF writer | jsPDF ^4.2.0 + svg2pdf.js ^2.5.0 | PDF format is extremely complex; jsPDF handles fonts, pages, metadata |
| File download trigger | `<a download>` hacks | file-saver's `saveAs()` (already installed) | Cross-browser blob download with proper MIME types |
| SVG path generation | Custom path strings | Existing geometry engine (`lib/geometry/`) | Already produces validated SVG `d` attributes with bezier curves |
| Data completeness tiers | Custom completeness logic | Existing `GeometryResult.dataCompleteness` field | Geometry engine already classifies full/basic/insufficient |
| Unit conversion | Manual mm-to-inch | Existing `lib/utils.ts` conversion functions | Already has `formatNum`, could add `mmToInches` if needed |

**Key insight:** The geometry engine from Phase 11 does the heavy lifting. Phase 12's job is primarily presentation: styling the SVG paths, adding annotations, compositing components, and handling export. Avoid duplicating geometry computation.

## Common Pitfalls

### Pitfall 1: SVG `<pattern>` Coordinate System Confusion
**What goes wrong:** Hatching patterns render at wrong scale or don't tile correctly when the SVG has transforms (scale, translate) applied.
**Why it happens:** SVG patterns have two coordinate modes (`patternUnits`): `userSpaceOnUse` (absolute coordinates) and `objectBoundingBox` (relative to filled shape). Transforms on parent `<g>` elements affect `userSpaceOnUse` patterns.
**How to avoid:** Use `patternUnits="userSpaceOnUse"` for hatching and set explicit `patternTransform` for rotation. Test hatching at different zoom/scale levels. If the drawing group has a scale transform, apply the inverse scale to the pattern's dimensions.
**Warning signs:** Hatching lines appear too thick/thin, pattern doesn't tile seamlessly, different cartridges show different hatching densities.

### Pitfall 2: PNG Export Cuts Off or Renders Blank
**What goes wrong:** The exported PNG is blank, black, or truncated.
**Why it happens:** (1) SVG serialization omits inline styles or pattern definitions that live in `<defs>`. (2) The Image element fails to load the SVG blob due to security restrictions. (3) Canvas dimensions exceed browser limits (varies but typically 16384x16384 max).
**How to avoid:** Ensure all styles are inline SVG attributes (not CSS classes). Include all `<defs>` patterns in the serialized SVG. For 600 DPI, calculate canvas size: a 1200x800 viewBox at 600 DPI = 7500x5000 pixels (well within limits). Use `img.onerror` to catch loading failures.
**Warning signs:** Export works in Chrome but not Safari; export works for small drawings but fails for large ones.

### Pitfall 3: Dimension Label Overlaps
**What goes wrong:** Multiple dimension annotations overlap, making them unreadable.
**Why it happens:** Naive placement puts all dimensions at the same offset distance from the drawing outline.
**How to avoid:** Implement a stagger algorithm: sort dimensions by position, assign alternating offset tiers (close, medium, far), and check for text bounding box collisions. Group horizontal dimensions (top/bottom) separately from vertical (left/right).
**Warning signs:** Labels readable for simple cartridges (.223) but overlapping for complex ones (.300 WSM with many close dimensions).

### Pitfall 4: Chamber Drawing Without Rifle Data
**What goes wrong:** Chamber drawing requires rifle-specific fields (freebore, headspace) that don't exist yet, causing null reference errors.
**Why it happens:** Rifle model currently lacks freebore_mm, throat_angle_deg, and headspace_mm fields.
**How to avoid:** Add fields as nullable with sensible SAAMI-derived defaults. When fields are null, derive from cartridge dimensions using standard tolerances (headspace typically +0.05mm from SAAMI min, freebore depends on caliber). Show "estimated" badge on derived values.
**Warning signs:** Chamber drawing always shows "insufficient data" because no rifles have the new fields populated.

### Pitfall 5: Export "Both Styles" Complexity
**What goes wrong:** Exporting both blueprint and modern styles doubles export time and creates confusing UX.
**Why it happens:** User decision requires both styles in every export. Rendering two full SVGs for PNG/PDF takes time.
**How to avoid:** For PNG: export two separate files (or a single ZIP). For PDF: two pages in one PDF (page 1 = blueprint, page 2 = modern). For SVG: two separate SVG files. Generate the non-visible style off-screen using a hidden div or by manipulating props without rendering to DOM.
**Warning signs:** Export takes >5 seconds, memory spikes, user confusion about which file is which.

### Pitfall 6: SVG Text Rendering Inconsistency Across Browsers
**What goes wrong:** Dimension labels render at different sizes/positions in Chrome vs Firefox vs Safari, especially when exported.
**Why it happens:** SVG text metrics differ between browsers. Font availability differs.
**How to avoid:** Use `font-family="monospace"` (always available) for blueprint style; use a web-safe font stack for modern style. Set explicit `font-size` in SVG units (not px/em). Avoid `textLength` and `lengthAdjust` for simple labels.
**Warning signs:** Labels overlap in one browser but not another; exported PNG text looks different from on-screen.

## Code Examples

### SVG viewBox and Scaling for Technical Drawings
```tsx
// The drawing's coordinate system is in mm (matching the geometry engine output).
// viewBox maps mm coordinates to screen pixels.
// A 100mm-long cartridge displayed at 800px width = 8px/mm scale.

const DRAWING_PADDING_MM = 15; // Space for dimension labels around the drawing

function computeViewBox(drawingBounds: { width: number; height: number }) {
  // Add padding for dimensions and title block
  const totalWidth = drawingBounds.width + DRAWING_PADDING_MM * 2;
  const totalHeight = drawingBounds.height + DRAWING_PADDING_MM * 2 + 15; // +15mm for title block
  return {
    viewBox: `${-DRAWING_PADDING_MM} ${-drawingBounds.height / 2 - DRAWING_PADDING_MM} ${totalWidth} ${totalHeight}`,
    aspectRatio: totalWidth / totalHeight,
  };
}
```

### Theme Configuration Objects
```tsx
interface DrawingTheme {
  name: 'blueprint' | 'modern';
  background: string;
  outline: string;        // Visible edge color
  hiddenEdge: string;     // Dashed hidden edges
  dimColor: string;       // Dimension lines and text
  textColor: string;      // Label text
  hatchColor: string;     // Hatching line color
  caseFill: string;       // Brass case fill
  copperFill: string;     // Copper jacket fill
  leadColor: string;      // Lead core fill
  powderFill: string;     // Powder area fill
  steelFill: string;      // Barrel steel fill
  titleBlockBg: string;
  titleBlockBorder: string;
  fontFamily: string;
  dimFontSize: number;    // In SVG user units (mm)
  titleFontSize: number;
}

const blueprintTheme: DrawingTheme = {
  name: 'blueprint',
  background: '#1a1f3a',        // Deep navy
  outline: '#e0e8ff',           // White-blue lines
  hiddenEdge: '#7088cc',        // Muted blue dashed
  dimColor: '#a0b4e8',          // Light blue dimensions
  textColor: '#e0e8ff',
  hatchColor: '#7088cc',
  caseFill: 'none',             // Blueprint: outline only, hatching fills
  copperFill: 'none',
  leadColor: '#4a5580',         // Muted solid fill
  powderFill: 'none',           // Dot pattern only
  steelFill: 'none',
  titleBlockBg: '#1a1f3a',
  titleBlockBorder: '#7088cc',
  fontFamily: '"Courier New", Courier, monospace',
  dimFontSize: 2.0,
  titleFontSize: 3.0,
};

const modernTheme: DrawingTheme = {
  name: 'modern',
  background: '#ffffff',
  outline: '#333333',
  hiddenEdge: '#999999',
  dimColor: '#555555',
  textColor: '#333333',
  hatchColor: '#888888',
  caseFill: '#d4a94c',          // Gold/amber for brass
  copperFill: '#b87333',        // Copper tone
  leadColor: '#4a4a4a',         // Dark gray for lead
  powderFill: '#8b7355',        // Muted brown for powder
  steelFill: '#a0a0a0',         // Medium gray for barrel
  titleBlockBg: '#f5f5f5',
  titleBlockBorder: '#333333',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  dimFontSize: 2.0,
  titleFontSize: 3.0,
};
```

### Style Toggle with localStorage Persistence
```tsx
// Discretion decision: use localStorage for persistence (same pattern as unit-context.tsx)
const STYLE_KEY = 'drawing-style';

function useDrawingStyle() {
  const [style, setStyle] = useState<'blueprint' | 'modern'>('blueprint');

  useEffect(() => {
    const stored = localStorage.getItem(STYLE_KEY);
    if (stored === 'blueprint' || stored === 'modern') {
      setStyle(stored);
    }
  }, []);

  const toggleStyle = useCallback(() => {
    setStyle((prev) => {
      const next = prev === 'blueprint' ? 'modern' : 'blueprint';
      localStorage.setItem(STYLE_KEY, next);
      return next;
    });
  }, []);

  return { style, toggleStyle };
}
```

### Chamber Clearance Computation
```tsx
// Discretion decision: Derive SAAMI chamber dimensions from cartridge dimensions
// with standard manufacturing tolerances applied.
//
// SAAMI chamber specs are the cartridge dimensions PLUS specified tolerances.
// For most dimensions, chamber is 0.002"-0.005" (0.05-0.127mm) larger than cartridge.

interface ChamberClearances {
  headspace_gap_mm: number;     // Headspace: how much case floats in chamber
  neck_clearance_mm: number;    // Radial clearance at neck
  body_clearance_mm: number;    // Radial clearance at body
  freebore_mm: number;          // Unrifled lead before rifling engagement
  throat_angle_deg: number;     // Angle of leade/throat
  rifling_engagement_mm: number; // How much bullet engages rifling
}

function computeChamberClearances(
  cartridge: Cartridge,
  bullet: Bullet | null,
  rifle: { freebore_mm?: number | null; throat_angle_deg?: number | null; headspace_mm?: number | null }
): ChamberClearances {
  // Use rifle overrides if present, otherwise derive from SAAMI tolerances
  const headspace_gap = rifle.headspace_mm ?? 0.05; // SAAMI min ~0.05mm for rimless
  const neck_clearance = (cartridge.neck_diameter_mm
    ? cartridge.neck_diameter_mm * 0.005  // ~0.5% radial clearance
    : 0.05);
  const body_clearance = (cartridge.base_diameter_mm
    ? cartridge.base_diameter_mm * 0.003  // ~0.3% radial clearance
    : 0.04);
  const freebore = rifle.freebore_mm ?? estimateFreebore(cartridge);
  const throat_angle = rifle.throat_angle_deg ?? 1.5; // SAAMI standard ~1.5 degrees

  const rifling_engagement = bullet
    ? Math.max(0, (bullet.length_mm ?? 20) - (bullet.bearing_surface_mm ?? (bullet.length_mm ?? 20) * 0.45))
    : 0;

  return { headspace_gap_mm: headspace_gap, neck_clearance_mm: neck_clearance,
           body_clearance_mm: body_clearance, freebore_mm: freebore,
           throat_angle_deg: throat_angle, rifling_engagement_mm: rifling_engagement };
}
```

### Assembly Drawing with Optional Harmonics Overlay
```tsx
// Discretion decision: OBT harmonic nodes as colored vertical markers
// with engineering-style annotation labels (position in mm from breech).

interface AssemblyDrawingProps {
  cartridge: Cartridge;
  bullet: Bullet | null;
  rifle: Rifle;
  simulation?: SimulationResult; // Optional - overlay only when present
  style: 'blueprint' | 'modern';
}

// OBT node rendering:
// - Green markers at optimal barrel times (where muzzle is at node = minimum deflection)
// - Red markers at anti-nodes (maximum deflection)
// - Barrel time indicator as a colored vertical line
function renderObtOverlay(
  barrelLength: number,
  simulation: SimulationResult,
  theme: DrawingTheme,
  scale: number
) {
  const nodes: JSX.Element[] = [];
  const obtTimes = simulation.optimal_barrel_times ?? [];

  obtTimes.forEach((time_ms, i) => {
    // OBT nodes are times; convert to position along barrel
    // Position is proportional: barrel_time at muzzle, so OBT < barrel_time means
    // the node "moment" happened while bullet was still in barrel
    const fraction = time_ms / simulation.barrel_time_ms;
    const xPos = barrelLength * fraction;

    nodes.push(
      <g key={`obt-${i}`}>
        <line x1={xPos} y1={-15} x2={xPos} y2={15}
              stroke="#22c55e" strokeWidth={0.3} strokeDasharray="2,1" />
        <text x={xPos} y={-17} textAnchor="middle"
              fill="#22c55e" fontSize={1.5}>
          OBT {i + 1}
        </text>
      </g>
    );
  });

  return nodes;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| html2canvas for all exports | Direct SVG serialization + canvas for PNG | 2024-2025 | Better quality, no SVG rendering bugs with patterns/transforms |
| jsPDF v2 | jsPDF v4 | Jan 2026 | Critical security fix (CVE-2025-68428), breaking changes in API |
| Separate SVG library (Snap.svg, SVG.js) | React inline SVG | 2022+ | React's native JSX SVG support is complete; no wrapper needed |
| framer-motion for SVG animations | No animations (static technical drawings) | N/A | User decision: fixed sizing, no interactive zoom/pan |

**Deprecated/outdated:**
- **html2canvas for SVG elements:** Has documented issues with `<pattern>`, CSS styles in SVG, and transform attributes. Use direct XMLSerializer approach instead.
- **jsPDF v2/v3:** Has a critical path traversal vulnerability. Use v4+ only.

## Open Questions

1. **SAAMI Chamber Dimension Derivation Accuracy**
   - What we know: Standard SAAMI tolerances are well-documented for common cartridges. Body clearance ~0.003" radial, neck clearance ~0.002-0.005" radial, headspace varies by case type (rimless ~0.004-0.006", belted ~0.002-0.004").
   - What's unclear: Whether per-cartridge lookup tables would be more accurate than applying generic percentage-based tolerances.
   - Recommendation: Start with percentage-based derivation from cartridge dimensions (simpler, works for all cartridges including uncommon ones). Mark derived values as "estimated" in the drawing. If accuracy complaints arise, add a lookup table for common calibers in a future phase.

2. **Batch Export UX: ZIP vs Separate Files vs Multi-Page PDF**
   - What we know: User decision requires "both styles" in every export.
   - What's unclear: Best UX for delivering two files to the user.
   - Recommendation: For PNG/SVG: trigger two separate downloads (browser shows them in download bar). For PDF: single PDF with two pages (page 1 = blueprint, page 2 = modern). No ZIP needed -- avoids JSZip dependency and ZIP files are annoying on mobile.

3. **Freebore Estimation When No Rifle Override Exists**
   - What we know: Freebore varies significantly by caliber (0.05mm for .308 Win to 5mm+ for .300 Win Mag magnums).
   - What's unclear: Whether a single heuristic can reasonably estimate freebore for all calibers.
   - Recommendation: Use caliber-aware estimation based on bore diameter: small bore (<7mm) = 1.0mm, medium bore (7-8mm) = 2.0mm, large bore (>8mm) = 3.0mm. Mark as estimated. Encourage users to enter actual freebore measured with a Hornady OAL gauge.

## Validation Architecture

> `workflow.nyquist_validation` is not set in config.json (not present), so: minimal test mention only.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest + pytest-asyncio (backend); no frontend test framework installed |
| Config file | `backend/tests/conftest.py` (sys.path setup only) |
| Quick run command | `cd backend && python -m pytest tests/ -x -q` |
| Full suite command | `cd backend && python -m pytest tests/ -v` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| VIS2-01 | Cartridge cross-section SVG rendering | manual | Frontend-only; verify visually in browser |
| VIS2-02 | Chamber drawing with clearances | manual + unit | Chamber geometry computations can be unit tested; rendering is visual |
| VIS2-03 | Assembly drawing with OBT overlay | manual | Frontend-only; verify with simulation data |
| VIS2-04 | Graceful degradation tiers | unit | Geometry engine already tests completeness; verify banner logic manually |
| VIS2-05 | PNG export at 600 DPI | manual | Browser-only; verify file dimensions match 600 DPI calculation |

### Backend Tests Needed
- Schema validation tests for new Rifle fields (freebore_mm, throat_angle_deg, headspace_mm) in `test_schema_validation.py`
- Migration 010 test coverage via existing migration infrastructure

### Wave 0 Gaps
- [ ] Backend: Add Rifle schema tests for new nullable fields
- [ ] Frontend: No test framework installed (no Jest/Vitest); visual testing only

## Sources

### Primary (HIGH confidence)
- MDN SVG Patterns documentation: https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorials/SVG_from_scratch/Patterns
- MDN SVG `<pattern>` element: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/pattern
- svg2pdf.js GitHub (yWorks): https://github.com/yWorks/svg2pdf.js
- jsPDF npm: https://www.npmjs.com/package/jspdf (v4.2.0)
- svg2pdf.js npm: https://www.npmjs.com/package/svg2pdf.js (v2.5.0)
- file-saver GitHub: https://github.com/eligrey/FileSaver.js
- Codebase: `frontend/src/lib/geometry/` (Phase 11 geometry engine) -- read directly
- Codebase: `backend/app/models/rifle.py`, `backend/app/schemas/rifle.py` -- read directly
- Codebase: `frontend/src/hooks/useChartExport.ts` -- existing export pattern

### Secondary (MEDIUM confidence)
- SVG to PNG JavaScript guide (multiple sources confirming XMLSerializer + canvas approach): https://www.svgai.org/blog/svg-to-png-javascript
- ISO 128-50 hatching standards (PDF): https://cdn.standards.iteh.ai/samples/24240/aa3e220f4e2644c4a192c655dc10add8/ISO-128-50-2001.pdf
- html2canvas SVG limitations (npm-compare analysis): https://npm-compare.com/dom-to-image-more,html-to-image,html2canvas

### Tertiary (LOW confidence)
- SAAMI chamber tolerance values: Based on published SAAMI specifications and reloading engineering knowledge. Specific tolerance values should be validated against official SAAMI Technical Data Sheets for each cartridge if precision is critical.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - React inline SVG is well-established; jsPDF + svg2pdf.js verified on npm with recent releases
- Architecture: HIGH - Geometry engine from Phase 11 provides the foundation; drawing components are straightforward SVG composition
- Pitfalls: HIGH - SVG pattern behavior, canvas size limits, and cross-browser text rendering are well-documented challenges
- Chamber geometry: MEDIUM - SAAMI tolerance derivation from generic percentages is reasonable but not cartridge-specific
- Export dual-style: MEDIUM - Two-download approach is functional but UX could be surprising to users

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable domain; SVG and jsPDF don't change rapidly)
