# Phase 2: Extended Simulation Charts - Research

**Researched:** 2026-02-21
**Domain:** Frontend charting (Recharts 2.13), backend solver curve data extraction, interactive parameter exploration
**Confidence:** HIGH

## Summary

This phase visualizes physics data the solver already computes but does not currently expose. The backend solver (solver.py) integrates a 4-variable ODE system (Z, x, v, Q_loss) and computes gas temperature, burn fraction, pressure, and heat loss at 200 time points -- but the API only returns two curve arrays (pressure_curve and velocity_curve) plus scalar summary values. The primary backend work is extracting additional curve data from the existing ODE solution arrays and returning them in the API response. No new physics models are needed.

The frontend work is substantial: restructuring the simulate/page.tsx from a vertical stack of cards/charts into a responsive dashboard grid with 7+ chart tiles, adding error band visualization using Recharts Area components, building a collapsible slider panel for sensitivity exploration, and implementing per-chart PNG/CSV export. The project already uses Recharts 2.13.0 with the existing pattern of LineChart + ResponsiveContainer + custom Tooltip.

**Primary recommendation:** Add new curve arrays (burn_curve, energy_curve, temperature_curve) to the backend SimResult/API response by extracting data from the existing ODE solution, then build a chart grid dashboard on the frontend with Recharts ComposedChart for error bands and syncId for crosshair synchronization.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Dashboard grid layout: all charts displayed as tiles in a 2-column (or responsive) grid
- Hero row: Pressure vs Time and Velocity vs Distance remain the two largest, most prominent charts at the top
- All other charts (burn progress, energy, temperature, harmonics, recoil) are smaller tiles below the hero row
- Harmonics (OBT) chart moves into the grid as a regular tile alongside the new charts
- Click any tile to expand into a modal/overlay with full detail, tooltips, and zoom
- Close modal to return to grid view
- Collapsible side panel with sliders for charge weight, seating depth, and barrel length
- Replace (live update) mode: charts update in real-time as user drags sliders -- no overlaid traces
- All charts in the grid respond to slider changes simultaneously
- Result summary cards update live AND show a +/- delta badge vs the original simulation value
- Shaded semi-transparent fill between +/- curves, with dashed boundary lines at the extremes
- Default variation: +/- 0.3 grains of charge weight
- Error bands visible by default on P/V charts, with a toggle to hide them
- Bands are dynamic: when sensitivity sliders change, error bands recalculate around the new center value
- All charts support: hover tooltip with crosshair, click-drag to zoom into a region, double-click to reset zoom
- Color coding by physics domain: blue for pressure/velocity, orange for combustion/burn, red for temperature/heat, green for energy/recoil
- Each chart tile offers both PNG image download and CSV data export (per-chart, not just global)
- Delta badges on summary cards should show direction clearly (green for favorable, red/amber for approaching limits)
- Error bands use the same domain color as the main curve but at reduced opacity
- Side panel for sliders should not obscure the chart grid -- push content or overlay with enough transparency

### Claude's Discretion
- Synchronized crosshair across time-domain charts (Claude decides based on Recharts feasibility)
- Exact grid column count and responsive breakpoints
- Modal sizing and animation
- Slider step increments and ranges
- Chart axis formatting and tick density
- Dark mode palette specifics within the domain color scheme

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHART-01 | Energy and momentum curves (KE vs distance, recoil impulse vs time) | Backend: derive KE = 0.5*m*v^2 and recoil impulse from existing v_arr at each time step. Frontend: new EnergyRecoilChart component with green domain color |
| CHART-02 | Burn progress chart (Z vs time, dZ/dt vs time) | Backend: Z_arr already in ODE solution; dZ/dt computed via np.gradient(Z_arr, t_eval). Frontend: new BurnProgressChart with orange domain color, dual Y-axis |
| CHART-03 | Temperature/heat curves (gas temp, wall temp estimate, cumulative heat loss vs time) | Backend: T_gas computed in ODE rhs; Q_arr is cumulative heat loss. Wall temp estimated as T_wall + Q/(m_wall*c_p). Frontend: new TemperatureChart with red domain color |
| CHART-04 | Sensitivity error bands on P/V charts (+/- charge weight) | Backend: run 3 simulations (center, +delta, -delta) per request. Frontend: ComposedChart with Area fill between upper/lower bounds, dashed boundary Lines |
| CHART-05 | Interactive sensitivity explorer with sliders (charge, seating depth, barrel length) | Frontend: collapsible side panel, debounced slider inputs, live re-simulation via existing /simulate/direct endpoint. Backend: no changes needed (already accepts all params) |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Recharts | 2.13.0 | All chart rendering | Already used for P/V/Harmonics charts; supports ComposedChart, Area, syncId |
| React | 18.3.1 | UI framework | Already installed; provides useDeferredValue for slider performance |
| TanStack Query | 5.59.0 | API data fetching | Already used for all simulation mutations |
| Tailwind CSS | 3.4.13 | Styling | Already used for all UI components |
| lucide-react | 0.447.0 | Icons | Already used (Download, Activity, etc.) |

### Supporting (new dependencies)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| html2canvas | 1.4.1 | PNG export of chart tiles | Per-chart PNG download button |
| file-saver | 2.0.5 | Trigger file download | CSV/PNG save-as dialog |
| @types/file-saver | 2.0.7 | TypeScript types | Dev dependency for file-saver |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| html2canvas | recharts-to-png | recharts-to-png v3 requires Recharts ^3.0.0; project uses 2.13. html2canvas works with any DOM element |
| html2canvas | dom-to-image / html-to-image | html-to-image is lighter but less battle-tested; html2canvas has broader community support |
| Custom debounce | lodash.debounce | Unnecessary dependency; React 18 useDeferredValue + useTransition handles this natively |

**Installation:**
```bash
cd frontend && npm install html2canvas file-saver && npm install -D @types/file-saver
```

## Architecture Patterns

### Backend: Extended Curve Data

The solver already computes everything needed. The architecture change is extracting additional arrays from the existing post-processing loop (lines 304-338 of solver.py) and adding them to SimResult.

**New curve arrays to add to SimResult:**

```python
# In solver.py, inside the post-processing loop:
burn_curve: list[dict]       # [{t_ms, z, dz_dt, psi}]
energy_curve: list[dict]     # [{t_ms, x_mm, ke_j, ke_ft_lbs, momentum_ns}]
temperature_curve: list[dict] # [{t_ms, t_gas_k, t_wall_est_k, q_loss_j}]
recoil_curve: list[dict]     # [{t_ms, impulse_ns}]
```

These can ALL be derived from existing arrays (Z_arr, v_arr, Q_arr, x_arr, t_eval) without re-running the ODE.

### Backend: Sensitivity Endpoint

For CHART-04 (error bands), the backend needs to run 3 simulations per request (center, +delta, -delta). Two approaches:

**Option A: Client-side 3-call approach** -- Frontend makes 3 separate /simulate/direct calls with different charge weights. Simple, no backend changes, but 3x API roundtrips.

**Option B: New /simulate/sensitivity endpoint** -- Backend accepts center params + delta, runs 3 sims internally, returns all 3 curve sets in one response. Single roundtrip, better UX.

**Recommendation: Option B** -- Single endpoint reduces latency from ~3x to ~1x for the user. The backend already has the _make_params helper that makes this straightforward. Rate limit at 5/minute (same as ladder).

### Frontend: Dashboard Grid Layout

```
src/
  app/simulate/
    page.tsx                    # Restructured: grid layout orchestrator
  components/charts/
    PressureTimeChart.tsx        # MODIFIED: add error band support via ComposedChart
    VelocityDistanceChart.tsx    # MODIFIED: add error band support via ComposedChart
    HarmonicsChart.tsx           # UNCHANGED (moves into grid)
    BurnProgressChart.tsx        # NEW: Z(t) and dZ/dt dual-axis chart
    EnergyRecoilChart.tsx        # NEW: KE(x) and recoil impulse(t)
    TemperatureChart.tsx         # NEW: T_gas(t), T_wall(t), Q_loss(t)
    ChartTile.tsx                # NEW: wrapper with title, domain color, expand/export buttons
    ChartModal.tsx               # NEW: full-screen modal for expanded chart view
    ChartExportButtons.tsx       # NEW: PNG + CSV download buttons
  components/panels/
    SensitivityPanel.tsx         # NEW: collapsible side panel with sliders
  hooks/
    useSimulation.ts             # MODIFIED: add sensitivity mutation
    useSensitivity.ts            # NEW: manages slider state, debounced re-simulation
    useChartExport.ts            # NEW: html2canvas PNG export + CSV generation
    useChartZoom.ts              # NEW: click-drag zoom state management
  lib/
    types.ts                     # MODIFIED: add new curve types and sensitivity types
    api.ts                       # MODIFIED: add sensitivity endpoint call
```

### Pattern 1: Error Bands with Recharts ComposedChart + Area

**What:** Render shaded fill between upper/lower pressure bounds using stacked invisible Area
**When to use:** CHART-04 error bands on P/V charts
**Example:**
```tsx
// Approach: Two stacked Areas where the lower one is invisible (fillOpacity=0)
// Data shape: [{t_ms, p_center, p_lower, p_upper, p_band}]
// where p_band = p_upper - p_lower (the delta to stack on top of p_lower)
<ComposedChart data={chartData} syncId="sim-time">
  {/* Invisible lower bound area */}
  <Area
    type="monotone"
    dataKey="p_lower"
    stackId="error"
    stroke="none"
    fill="transparent"
    fillOpacity={0}
  />
  {/* Visible band between lower and upper */}
  <Area
    type="monotone"
    dataKey="p_band"
    stackId="error"
    stroke="none"
    fill="#ef4444"
    fillOpacity={0.15}
  />
  {/* Dashed boundary lines */}
  <Line dataKey="p_upper" stroke="#ef4444" strokeDasharray="4 4" dot={false} strokeWidth={1} />
  <Line dataKey="p_lower" stroke="#ef4444" strokeDasharray="4 4" dot={false} strokeWidth={1} />
  {/* Main center line */}
  <Line dataKey="p_center" stroke="#ef4444" strokeWidth={2} dot={false} />
</ComposedChart>
```

### Pattern 2: Synchronized Crosshairs via syncId

**What:** Recharts native syncId prop synchronizes tooltip position across charts sharing the same time axis
**When to use:** All time-domain charts (pressure, burn, temperature, recoil impulse)
**How:** All charts that share x-axis domain (time in ms) use `syncId="sim-time"`. Distance-domain charts (velocity, KE) are NOT synced with time-domain charts.

```tsx
// Time-domain charts: pressure, burn, temperature, recoil impulse
<LineChart data={data} syncId="sim-time">...</LineChart>

// Distance-domain charts: velocity, KE vs distance
<LineChart data={data} syncId="sim-distance">...</LineChart>
```

**Feasibility verdict for Claude's Discretion:** syncId IS supported in Recharts 2.x and works well for charts with the same x-axis data points. Since all time-domain curves share the same t_eval array (200 points), synchronization will be exact. **Recommendation: USE syncId for time-domain charts.**

### Pattern 3: Click-Drag Zoom with ReferenceArea

**What:** Custom zoom via mouse drag selection using Recharts ReferenceArea
**When to use:** All charts (both in grid tile and expanded modal)
**Example:**
```tsx
// State: refAreaLeft, refAreaRight (selection boundaries)
// On mouseDown: record start x
// On mouseMove: update end x (shows ReferenceArea preview)
// On mouseUp: filter data to selection range, update axis domain
// On doubleClick: reset to full range

const [zoomState, setZoomState] = useState({ left: 'dataMin', right: 'dataMax' });
const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
const [refAreaRight, setRefAreaRight] = useState<number | null>(null);

<LineChart
  onMouseDown={(e) => e && setRefAreaLeft(e.activeLabel)}
  onMouseMove={(e) => refAreaLeft && e && setRefAreaRight(e.activeLabel)}
  onMouseUp={handleZoom}
  onDoubleClick={resetZoom}
>
  <XAxis domain={[zoomState.left, zoomState.right]} />
  {refAreaLeft && refAreaRight && (
    <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} />
  )}
</LineChart>
```

### Pattern 4: Sensitivity Slider with Debounced Re-simulation

**What:** Collapsible panel with range sliders that trigger re-simulation
**When to use:** CHART-05 interactive sensitivity explorer
**Approach:**
```tsx
// Use React 18 useDeferredValue for non-blocking slider movement
// Combined with a 300ms debounce on the actual API call

const [chargeGrains, setChargeGrains] = useState(originalCharge);
const deferredCharge = useDeferredValue(chargeGrains);

// Effect triggers re-simulation when deferred value stabilizes
useEffect(() => {
  const timer = setTimeout(() => {
    // Call /simulate/direct with new params
    mutation.mutate({ ...originalParams, powder_charge_grains: deferredCharge });
  }, 300);
  return () => clearTimeout(timer);
}, [deferredCharge]);
```

### Pattern 5: Chart Tile Component

**What:** Reusable wrapper providing consistent tile chrome (title, domain color accent, expand/export buttons)
**When to use:** Every chart in the grid

```tsx
interface ChartTileProps {
  title: string;
  badge?: string;
  domainColor: 'blue' | 'orange' | 'red' | 'green';
  children: React.ReactNode;
  data: Record<string, unknown>[]; // for CSV export
  csvHeaders: string[];
}
```

### Anti-Patterns to Avoid
- **Running separate API calls per chart:** All new curve data (burn, energy, temperature) should come from a single simulation response. Do NOT make separate endpoint calls for each chart.
- **Computing derived curves on the frontend:** Kinetic energy, gas temperature, burn rate are physics computations that belong in the backend Python solver, not in TypeScript. The backend has numpy and the full ODE state.
- **Using separate Recharts containers for error bands:** The error band fill and main line MUST be in the same ComposedChart to share the same coordinate system. Do not layer separate charts via CSS.
- **Blocking the main thread during slider drag:** Never call the API synchronously on every slider onChange event. Always debounce or defer.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart PNG export | Custom SVG-to-canvas conversion | html2canvas on chart container div | SVG foreignObject, text rendering, and gradient handling are notoriously complex |
| Debounced slider | Custom setTimeout management | React 18 useDeferredValue + 300ms setTimeout | Framework-native, handles concurrent rendering, no extra deps |
| Tooltip synchronization | Custom event bus between charts | Recharts syncId prop | Built-in, battle-tested, handles edge cases (different data lengths) |
| Zoom/pan | Custom D3 zoom behavior | Recharts ReferenceArea + domain state | Integrates with Recharts coordinate system natively |
| Modal overlay | Custom portal + backdrop | Simple React portal with Tailwind classes | Project already uses Tailwind; no need for a modal library |
| File download trigger | Custom blob URL management | file-saver saveAs() | Handles browser differences, memory cleanup |

**Key insight:** Recharts already supports the three hardest features (syncId, ComposedChart stacking for bands, ReferenceArea for zoom). The main complexity is data plumbing, not charting library limitations.

## Common Pitfalls

### Pitfall 1: Error Band Data Shape
**What goes wrong:** Using two separate Area components with different dataKeys doesn't produce a filled band between them -- it fills from each line down to the baseline (zero).
**Why it happens:** Recharts Area fills from the line to baseValue (default 0), not between two arbitrary lines.
**How to avoid:** Use the stacked Area trick: lower bound Area with fillOpacity=0 + band delta Area stacked on top with visible fill. Data must contain the delta column (p_band = p_upper - p_lower).
**Warning signs:** Band fill appears from the upper line all the way to zero, covering the entire chart.

### Pitfall 2: Sensitivity Slider Flooding API
**What goes wrong:** User drags slider continuously, generating 30+ API calls per second, overwhelming the backend rate limiter (10/min on /simulate/direct).
**Why it happens:** HTML range input fires onChange on every pixel of mouse movement.
**How to avoid:** Debounce API calls with 300ms delay. Use useDeferredValue so the slider UI remains responsive while deferring expensive re-renders. Consider raising rate limit for sensitivity mode or using a separate unrated endpoint.
**Warning signs:** 429 Too Many Requests errors, UI freezing during slider drag.

### Pitfall 3: syncId with Mismatched Data Lengths
**What goes wrong:** Charts with different numbers of data points don't synchronize tooltips correctly.
**Why it happens:** syncId by default uses array index ("index" syncMethod), so chart A point 50 maps to chart B point 50 even if they represent different times.
**How to avoid:** All time-domain curves MUST use the same t_eval array (200 points, 0 to t_exit). The backend must return all curves at the same time points. Use syncMethod="value" if data lengths ever differ.
**Warning signs:** Tooltip on one chart highlights a different time point on another chart.

### Pitfall 4: Large Data Payloads
**What goes wrong:** Adding 4 new curve arrays (each 200 points x 4-5 fields) significantly increases API response size from ~20KB to ~80KB+.
**Why it happens:** Naive approach returns all curve data on every simulation request, even when the UI only shows summary cards initially.
**How to avoid:** Accept the increased payload size -- 80KB is still small for a simulation tool. Do NOT lazy-load curves separately; the user expects to see all charts immediately after simulation. The response is already JSON; compression via gzip middleware would reduce wire size by 70-80%.
**Warning signs:** None significant -- 80KB responses are fast on any modern connection.

### Pitfall 5: Modal Chart Resize
**What goes wrong:** Chart renders at grid tile size (h-64) inside modal, then doesn't resize to fill the modal.
**Why it happens:** ResponsiveContainer captures dimensions on mount and may not re-measure when the parent container size changes.
**How to avoid:** Use a key prop on the ResponsiveContainer that changes when the modal opens (e.g., `key={isExpanded ? 'expanded' : 'tile'}`), forcing a remount. Or use ResizeObserver.
**Warning signs:** Tiny chart in the center of a large modal.

### Pitfall 6: Rate Limiter Conflict with Sensitivity Mode
**What goes wrong:** The sensitivity explorer triggers rapid /simulate/direct calls, hitting the 10/minute rate limit.
**Why it happens:** Current rate limit (slowapi: 10/minute) is designed for manual form submissions, not slider-driven exploration.
**How to avoid:** Either (a) create a dedicated sensitivity endpoint with a higher rate limit (30/minute), or (b) use a lightweight sensitivity endpoint that only returns scalar values + key curves (not all 7 curve arrays), or (c) adjust the debounce to 500ms+ to keep calls under 10/minute in practice.
**Warning signs:** 429 errors during slider interaction.

## Code Examples

### Backend: Extended SimResult with New Curves

```python
# In solver.py, after the existing post-processing loop:

burn_curve = []
energy_curve = []
temperature_curve = []
recoil_curve = []

# dZ/dt via finite differences
dZ_dt_arr = np.gradient(Z_arr, t_eval)

for i in range(n_points):
    Z_c = min(max(Z_arr[i], 0.0), 1.0)
    # ... existing psi, P_avg computation ...

    # Burn progress
    burn_curve.append({
        "t_ms": float(t_eval[i] * 1000.0),
        "z": float(Z_c),
        "dz_dt": float(dZ_dt_arr[i]),
        "psi": float(psi),
    })

    # Energy
    ke_j = 0.5 * bullet.mass_kg * v_arr[i] ** 2
    momentum = bullet.mass_kg * v_arr[i]
    energy_curve.append({
        "t_ms": float(t_eval[i] * 1000.0),
        "x_mm": float(x_arr[i] / MM_TO_M),
        "ke_j": float(ke_j),
        "ke_ft_lbs": float(ke_j * J_TO_FT_LBS),
        "momentum_ns": float(momentum),
    })

    # Temperature
    gas_mass = omega * psi
    if gas_mass > 0.0 and P_avg > 0.0:
        V_corrected = V_f - gas_mass * powder.covolume_m3_kg
        if V_corrected > 0.0:
            T_gas = P_avg * V_corrected * GAS_MOLECULAR_WEIGHT / (gas_mass * 8.314)
        else:
            T_gas = powder.flame_temp_k
    else:
        T_gas = powder.flame_temp_k * psi

    temperature_curve.append({
        "t_ms": float(t_eval[i] * 1000.0),
        "t_gas_k": float(T_gas),
        "q_loss_j": float(Q_arr[i]),
    })

    # Recoil impulse accumulation
    impulse_so_far = bullet.mass_kg * v_arr[i] + omega * psi * 1.75 * v_arr[i]
    recoil_curve.append({
        "t_ms": float(t_eval[i] * 1000.0),
        "impulse_ns": float(impulse_so_far),
    })
```

### Backend: Sensitivity Endpoint

```python
# New endpoint in simulate.py

class SensitivityRequest(BaseModel):
    powder_id: uuid.UUID
    bullet_id: uuid.UUID
    rifle_id: uuid.UUID
    powder_charge_grains: float = Field(gt=0, le=200)
    coal_mm: float = Field(gt=0, le=200)
    seating_depth_mm: float = Field(gt=0, le=50)
    charge_delta_grains: float = Field(default=0.3, gt=0, le=5.0)

class SensitivityResponse(BaseModel):
    center: DirectSimulationResponse  # (extended with new curves)
    upper: DirectSimulationResponse
    lower: DirectSimulationResponse

@router.post("/sensitivity", response_model=SensitivityResponse)
@limiter.limit("5/minute")
async def run_sensitivity(request: Request, req: SensitivityRequest, db: ...):
    # Load DB rows once
    # Run 3 simulations: center, center+delta, center-delta
    # Return all 3 in one response
```

### Frontend: Error Band Data Transformation

```tsx
// Transform center + upper + lower curves into band-ready data
function buildErrorBandData(
  center: CurvePoint[],
  upper: CurvePoint[],
  lower: CurvePoint[],
  valueKey: string = 'p_psi'
): ErrorBandPoint[] {
  return center.map((c, i) => ({
    t_ms: c.t_ms,
    center: c[valueKey],
    upper: upper[i]?.[valueKey] ?? c[valueKey],
    lower: lower[i]?.[valueKey] ?? c[valueKey],
    band: (upper[i]?.[valueKey] ?? c[valueKey]) - (lower[i]?.[valueKey] ?? c[valueKey]),
  }));
}
```

### Frontend: Chart Tile with Export

```tsx
function ChartTile({ title, domainColor, children, data, csvFilename, onExpand }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handlePngExport = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: '#0f172a' });
    canvas.toBlob((blob) => {
      if (blob) saveAs(blob, `${csvFilename}.png`);
    });
  };

  const handleCsvExport = () => {
    // ... generate CSV from data array
  };

  return (
    <Card className={`border-${domainColor}-500/20`}>
      <CardHeader className="flex justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex gap-1">
          <button onClick={handlePngExport}><ImageIcon size={14} /></button>
          <button onClick={handleCsvExport}><Download size={14} /></button>
          <button onClick={onExpand}><Maximize2 size={14} /></button>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={chartRef}>{children}</div>
      </CardContent>
    </Card>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vertical stack of full-width charts | Responsive dashboard grid | This phase | All charts visible at once; better overview |
| No error bands | Stacked Area fill for +/- charge variation | This phase | Users see uncertainty; more informed decisions |
| Static parameters | Interactive sliders with live update | This phase | Exploratory workflow; faster iteration |
| Global CSV export only | Per-chart PNG + CSV export | This phase | Granular data sharing and documentation |

**Deprecated/outdated:**
- recharts-to-png v3 requires Recharts ^3.0.0: cannot use with project's Recharts 2.13.0. Use html2canvas instead.

## Open Questions

1. **Rate limit strategy for sensitivity sliders**
   - What we know: Current rate limit is 10/min on /simulate/direct. Slider exploration could easily exceed this.
   - What's unclear: Whether to raise the limit, create a separate endpoint, or rely solely on debouncing (500ms = max 2 calls/sec = 120/min theoretical).
   - Recommendation: Create a dedicated /simulate/sensitivity endpoint with a 30/minute rate limit. The debounce (300ms) means practical usage is ~5-10 calls/minute, well within limits.

2. **Grid tile chart height**
   - What we know: Current charts are h-80 (320px). Grid tiles should be smaller.
   - What's unclear: Exact height for readability at smaller sizes.
   - Recommendation: h-64 (256px) for grid tiles, h-[32rem] (512px) for expanded modal. Test readability with actual data.

3. **Barrel length slider range**
   - What we know: Barrel length is a property of the Rifle entity, not a simple numeric override.
   - What's unclear: Whether the sensitivity endpoint should accept a barrel_length_mm override, or whether the slider should only control charge_weight and seating_depth.
   - Recommendation: Accept barrel_length_mm as an optional override parameter in the sensitivity endpoint. When provided, it overrides the rifle's barrel length for that simulation only (not saved to DB).

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** -- solver.py (ODE system, SimResult dataclass, post-processing loop), simulate.py (API endpoints, _make_params), types.ts (TypeScript interfaces), PressureTimeChart.tsx (existing Recharts pattern)
- **Recharts API docs** (recharts.github.io) -- Area component baseValue/baseLine props, syncId prop on chart containers, ComposedChart composition, ReferenceArea for zoom selection
- **Recharts changelog** -- Band area feature confirmed available since v0.21.0, baseValue fix in v2.1.16, fully supported in 2.13.0

### Secondary (MEDIUM confidence)
- **GitHub issues** (recharts/recharts#316, #1209, #710) -- Confirmed stacked Area trick for error bands; confirmed no native zoom/pan but ReferenceArea + domain state is the standard workaround
- **recharts-to-png npm** -- Confirmed v3.0.0 requires Recharts ^3.0.0 peer dependency; incompatible with project's 2.13.0
- **React docs** (react.dev) -- useDeferredValue API for non-blocking slider updates in React 18

### Tertiary (LOW confidence)
- **shadcn Chart Brush** -- Referenced as a pattern for zoom; not verified in detail, but the underlying Recharts Brush component is documented

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use or well-documented npm packages
- Architecture: HIGH -- backend changes are data extraction from existing ODE arrays; frontend follows existing Recharts patterns
- Pitfalls: HIGH -- error band stacking trick, syncId, rate limiting are well-documented concerns
- Sensitivity UX: MEDIUM -- debounce timing and rate limit strategy need empirical tuning

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable; Recharts 2.x is mature, no breaking changes expected)
