# Phase 12: 2D SVG Technical Drawings - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can view accurate 2D technical drawings of their cartridge cross-section, cartridge-in-chamber, and full barrel assembly with harmonics overlay. Drawings are generated as SVG from database dimensions, degrade gracefully based on data completeness, and can be exported as PNG/SVG/PDF. This phase does NOT include 3D viewer functionality (Phase 13).

</domain>

<decisions>
## Implementation Decisions

### Drawing Style & Aesthetics
- Two visual styles available with a toggle button: **Blueprint** and **Modern**
- **Blueprint style**: Classic navy/midnight blue background with white/light blue lines and monospace labels — traditional blueprint aesthetic
- **Modern style**: Clean white background with dark gray lines and realistic material colors (brass case = gold/amber, copper jacket = copper tone, lead core = dark gray, steel barrel = medium gray)
- Full cross-section views showing internal structure: case wall thickness, primer pocket, bullet jacket vs core, powder charge area
- Standard ISO/ANSI engineering hatching patterns: diagonal lines for metals, dots for powder area, solid fill for lead core
- ISO standard line weights: thick (0.7mm) visible outlines, medium (0.5mm) dimensions, thin (0.25mm) hatching, dashed for hidden edges
- Full engineering title block in bottom-right corner: cartridge/rifle name, scale indicator, date, drawing type — included in all exports
- Fixed responsive sizing (no interactive zoom/pan) — drawing scales to fit container
- PNG export at 600 DPI for high-quality print output

### Dimension Annotations
- **Dual unit display** on all dimensions: mm and inches (e.g., "52.0 mm / 2.048 in")
- Show ALL dimensions: both SAAMI spec dimensions and reloader-critical dimensions
- Smart staggered layout with leader lines to avoid overlap — Claude handles layout algorithm
- Decimal precision matches database values (show exactly as stored)
- **Chamber drawing**: Show computed clearance values (headspace gap, neck clearance, body clearance) as labeled dimension callouts — critical for precision reloading

### Page Layout & Navigation
- **Three entry points** for drawings:
  1. Dedicated `/drawings` page in sidebar — select cartridge/rifle, view all 3 tabs
  2. Embedded "Drawings" tab within existing cartridge and rifle detail pages
  3. Linked from simulation results — assembly drawing includes that sim's harmonics/stress data
- **Horizontal tabs** for the 3 drawing types: Cross-Section | Chamber | Assembly
- Assembly tab always available — shows barrel + cartridge assembly even without simulation data; harmonics/stress overlay added only when simulation results exist

### Degradation Tiers
- **Three tiers** based on data completeness:
  - **Full detail**: All SAAMI dimensions populated — complete cross-section with all labels
  - **Basic outline**: Minimum viable set (OAL + base diameter + case length) — simplified outline shape with whatever dimensions are available labeled
  - **Insufficient data**: Below minimum viable set — message "Not enough dimensions to draw this cartridge/rifle" with direct edit link to the entity's edit page
- **Yellow/orange banner** showing completeness: "Basic view — 5 of 12 dimensions available" with link to complete the data
- Basic outline tier still shows dimension labels for all available fields

### Export Options
- Three export formats: **PNG** (600 DPI), **SVG** (vector), **PDF** (print-ready)
- Export always includes **both styles** (blueprint + modern) so user gets both versions
- Title block included in all exports
- Export available on all devices including mobile

### Data Source Mapping
- **Cartridge drawing** fed by: case_length_mm, overall_length_mm, bore_diameter_mm, groove_diameter_mm, shoulder_diameter_mm, neck_diameter_mm, base_diameter_mm, rim_diameter_mm, shoulder_angle_deg, neck_length_mm, body_length_mm, rim_thickness_mm, case_type
- **Bullet drawing** fed by: diameter_mm, length_mm, bearing_surface_mm, boat_tail_length_mm, meplat_diameter_mm, ogive_type (approximate ogive curve from type, no numeric radius field needed)
- **Chamber drawing**: SAAMI standard chamber specs derived from cartridge dimensions as defaults, with optional per-rifle overrides — add freebore_mm, throat_angle_deg, headspace_mm fields to Rifle model
- **Assembly drawing**: Barrel as straight cylinder (no contour/taper data in model), rifling engagement shown based on bullet/bore dimensions
- **Simulation overlay** (when accessed from sim results): Stress/pressure zone coloring on case, OBT harmonic node positions on barrel, other simulation-derived data overlaid on the mechanical drawing

### Responsive / Mobile
- Horizontal scroll on mobile — drawing maintains full aspect ratio and detail, user scrolls to see full width
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

</decisions>

<specifics>
## Specific Ideas

- Two complete styles switchable via toggle — blueprint for the traditional engineering feel, modern for clean color-coded presentation
- "Always export both styles" — user gets blueprint AND modern versions when exporting any format
- Chamber drawing should show the actual clearances as computed values, not just raw dimensions — this is what precision reloaders care about
- Barrel represented as straight cylinder since no contour data exists in the model
- When accessed from simulation results, overlay ALL relevant sim data: stress, pressure zones, harmonics — not just OBT nodes

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-2d-svg-technical-drawings*
*Context gathered: 2026-02-27*
