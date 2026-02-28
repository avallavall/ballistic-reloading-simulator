# Phase 13: 3D Parametric Cartridge Viewer - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Interactive 3D model of cartridges generated parametrically from database dimensions. Users can rotate, zoom, pan, toggle a cutaway half-section, and optionally view dimension labels. The model uses PBR materials for realistic metallic rendering. Creating new geometry engines or modifying database schemas is NOT in scope — this phase consumes the existing geometry engine output (`ProfilePoint[]` from `bullet-geometry.ts` and `cartridge-geometry.ts`).

</domain>

<decisions>
## Implementation Decisions

### Visual presentation
- Realistic PBR metallic materials: brass case, copper/lead bullet (type-aware), nickel primer
- Bullet material varies by `bullet_type` field: FMJ = copper jacket, HP = copper with exposed lead core, solid copper = uniform copper
- HDR environment map for realistic reflections on metallic surfaces (~1-2MB HDR file)
- Toggle-able dimension labels in 3D space (HTML overlays via drei `<Html>`) showing key dimensions (case length, OAL, neck diameter), off by default

### Cutaway behavior
- Animated clip plane sliding along the longitudinal axis (smooth transition)
- Single toggle button to activate/deactivate cutaway
- Fixed longitudinal cut (classic engineering half-section), NOT user-rotatable
- Full internal structure revealed: case wall thickness, powder space with fill level (when load data available), bullet seating depth, primer pocket
- Solid colored cross-section faces per material zone (brass yellow for case wall, dark gray for powder space, copper for bullet) — no hatching in 3D

### Page integration
- New "3D" tab added to existing `/drawings` page alongside cross-section/chamber/assembly tabs
- Reuses existing cartridge/rifle/bullet selector dropdowns and deep linking pattern
- Deep link support from simulation results: `/drawings?tab=3d&cartridge_id=...&bullet_id=...`
- Auto-load on tab select (no manual render button), show loading spinner while geometry builds
- WebGL context disposed immediately when leaving the 3D tab (ensures VIS3-05: no memory leak after 20+ navigations)
- Code-split: Three.js bundle only loaded when 3D tab is active (VIS3-04)

### Degradation tiers
- **Full** (all dimensions from DB): Full 3D render with PBR materials
- **Basic** (some estimated fields): Full 3D render, but show info badge listing which dimensions were estimated (e.g., "Bearing surface, boat tail length estimated")
- **Insufficient** (missing critical dimensions): No 3D canvas — show message "Insufficient data for 3D model" with direct link to cartridge/bullet edit form (reuse existing `CompletenessBanner` component pattern)
- **No WebGL**: Auto-redirect to cross-section 2D tab with toast notification "WebGL not available — showing 2D drawing instead"

### Claude's Discretion
- HDR environment map selection (studio vs outdoor, brightness level)
- Exact PBR material parameters (roughness, metalness values)
- Camera default position and orbit control limits
- Loading spinner design within the canvas
- Powder fill level visualization approach (color gradient, particle texture, or simple volume)
- Dimension label positioning algorithm in 3D space
- Clip plane animation easing and duration

</decisions>

<specifics>
## Specific Ideas

- Cutaway should feel like a technical engineering half-section drawing brought to life in 3D
- Material differentiation by bullet type adds realism — FMJ, HP, and solid copper should look visibly different
- Powder space fill level is a nice touch when load data is available, but should degrade gracefully (just show empty internal space if no load selected)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bullet-geometry.ts`: Generates `ProfilePoint[]` (16-sample ogive curves) designed for Three.js `LatheGeometry` — direct input for 3D mesh
- `cartridge-geometry.ts`: Generates `ProfilePoint[]` for cartridge case profile — same LatheGeometry-ready output
- `estimation.ts`: Fallback estimators for missing dimensions (bearing surface, boat tail, shoulder angle, etc.)
- `types.ts`: Shared `GeometryResult` with `dataCompleteness` tier and `estimatedFields` array — ready for degradation logic
- `CompletenessBanner.tsx`: Existing component showing data completeness warnings with edit links — reusable for insufficient tier
- `DrawingViewer.tsx`: Tab container managing 2D drawing tabs — extend with 3D tab
- `DrawingTabs.tsx`: Tab navigation component — add "3D" tab option

### Established Patterns
- Drawing components use `forwardRef` for export serialization — 3D viewer won't need this (no SVG export), but should follow component patterns
- Geometry computation is pure (no React imports) — 3D mesh generation should also be pure, consumed by R3F components
- `viewBox + preserveAspectRatio` pattern for SVG — analogous to R3F `Canvas` with responsive sizing
- Deep linking via query params (`cartridge_id`, `rifle_id`, `bullet_id`, `tab`) already implemented

### Integration Points
- R3F already installed: `@react-three/fiber` 8.18, `@react-three/drei` 9.122, `three` 0.170
- `/drawings` page selector state and deep link logic — 3D tab plugs into existing `selectedCartridgeId`/`selectedBulletId` state
- `useCartridges`, `useRifles`, `useBullets` hooks for data fetching — already used in drawings page
- Sidebar already has "Dibujos Técnicos" link — no sidebar changes needed
- Simulation results page has existing deep link buttons to drawings — add "Vista 3D" button

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-3d-parametric-cartridge-viewer*
*Context gathered: 2026-02-28*
