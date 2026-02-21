---
phase: 02-extended-simulation-charts
verified: 2026-02-21T12:00:00Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "Dragging sliders updates ALL charts in the grid in near-real-time (debounced)"
    status: partial
    reason: "Barrel length slider is disabled (display-only). Requirement CHART-05 explicitly lists charge weight, seating depth, AND barrel length as required sliders. Only two of three sliders are functional."
    artifacts:
      - path: "frontend/src/components/panels/SensitivityPanel.tsx"
        issue: "Barrel length slider rendered with disabled=true and labeled '(proximamente)'"
      - path: "frontend/src/hooks/useSensitivity.ts"
        issue: "barrelLengthMm initialized to 0 (static) with comment 'Display only - initialized from rifle'. No re-simulation triggered on barrel length change."
    missing:
      - "Barrel length slider must trigger a re-simulation. Requires backend /simulate/direct to accept barrel_length_mm as an override param OR backend to allow rifle barrel length to be overridden at the endpoint level."
      - "useSensitivity hook must call runSimulation with the slider-adjusted barrel length."
human_verification:
  - test: "Verify error bands appear visually on P(t) chart by default"
    expected: "After running a simulation, shaded blue/red fill visible between dashed lines on pressure chart without opening sensitivity panel"
    why_human: "Error bands only render when sensitivityData is loaded from the sensitivity endpoint, which is triggered lazily when the panel opens. Need to verify bands auto-load or are conditional on panel state."
  - test: "Verify synchronized crosshairs across time-domain charts"
    expected: "Hovering over any time-domain chart (pressure, burn, temperature, recoil) shows crosshair on all other time-domain charts simultaneously"
    why_human: "syncId='sim-time' is set in code but visual crosshair sync requires Recharts runtime behavior verification"
  - test: "Verify chart expand modal re-measures container correctly"
    expected: "Clicking expand on any chart tile opens full-screen modal with chart rendered at full 512px height without layout or sizing issues"
    why_human: "Recharts ResponsiveContainer remeasurement after portal-based modal mount is a known pitfall; requires visual verification"
  - test: "Verify PNG export produces correct output"
    expected: "Clicking PNG download button on a chart tile produces a downloadable .png file with the chart rendered on dark background"
    why_human: "html2canvas behavior depends on browser environment and CSS; cannot be verified statically"
---

# Phase 02: Extended Simulation Charts Verification Report

**Phase Goal:** Users can visualize all physics computed by the solver, not just pressure and velocity
**Verified:** 2026-02-21T12:00:00Z
**Status:** gaps_found — 4 of 5 requirement must-haves verified. One partial gap: barrel length slider non-functional (CHART-05 incomplete).
**Re-verification:** No — initial verification.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Simulation API response includes burn_curve, energy_curve, temperature_curve, and recoil_curve arrays alongside existing pressure_curve and velocity_curve | VERIFIED | `backend/app/core/solver.py` lines 339-421: all four arrays built in post-processing loop and populated in SimResult. `backend/app/schemas/simulation.py` lines 41-44, 76-79: all four fields in DirectSimulationResponse and SimulationResultResponse. |
| 2 | Sensitivity endpoint accepts center params + charge delta and returns center/upper/lower simulation results in a single response | VERIFIED | `backend/app/api/simulate.py` lines 222-256: POST /simulate/sensitivity endpoint fully implemented, runs 3 simulations, returns SensitivityResponse with center/upper/lower and explicit charge values. |
| 3 | User sees a 2-column dashboard grid of chart tiles after running a simulation, with P(t) and V(x) as hero charts at the top | VERIFIED | `frontend/src/app/simulate/page.tsx` lines 608-646: hero 2-column grid with ChartTile-wrapped PressureTimeChart and VelocityDistanceChart. Secondary 2-column grid (lines 649-710) with 4 additional tiles. ChartTile, ChartModal, all 3 new chart components wired. |
| 4 | Sensitivity analysis shows shaded error bands on pressure/velocity charts for +/- charge weight variation | VERIFIED | `frontend/src/components/charts/PressureTimeChart.tsx` lines 139-181: ComposedChart + stacked Area trick implemented. `VelocityDistanceChart.tsx` lines 121-163: same pattern. `useSensitivity.ts` fetches SensitivityResponse via runSensitivity mutation and exposes upper/lower data. page.tsx lines 472-475 extracts and passes band data to charts. |
| 5 | Interactive sensitivity explorer allows user to drag sliders for charge weight, seating depth, AND barrel length and see charts update in real-time | PARTIAL | Charge weight and seating depth sliders are fully functional (debounced re-simulation via useSensitivity hook). Barrel length slider is disabled with label "(proximamente)". CHART-05 explicitly requires barrel length. |

**Score:** 4/5 truths verified (Truth 5 is partial — 2 of 3 sliders functional)

---

### Required Artifacts

#### Plan 02-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/core/solver.py` | Extended SimResult with 4 new curve arrays | VERIFIED | Lines 135-138: burn_curve, energy_curve, temperature_curve, recoil_curve fields in SimResult dataclass. Lines 339-421: all four populated in post-processing loop. Contains "burn_curve". |
| `backend/app/schemas/simulation.py` | SensitivityRequest and SensitivityResponse schemas | VERIFIED | Lines 82-98: SensitivityRequest and SensitivityResponse fully defined with all required fields. |
| `backend/app/api/simulate.py` | POST /simulate/sensitivity endpoint | VERIFIED | Lines 222-256: endpoint with @router.post("/sensitivity"), rate limited at 10/min, returns SensitivityResponse. |
| `backend/tests/test_solver.py` | Tests verifying new curve arrays are populated | VERIFIED | Lines 577+: TestExtendedCurves class with 16 tests covering all 4 curve arrays (200 points, keys, physics values, backward compat). |

#### Plan 02-02 Artifacts

| Artifact | Min Lines | Actual | Status | Details |
|----------|-----------|--------|--------|---------|
| `frontend/src/components/charts/ChartTile.tsx` | 40 | 89 | VERIFIED | Renders Card with domain color accent (lookup object), 3 icon buttons (PNG/CSV/expand), uses useChartExport, wraps children in chartRef div. |
| `frontend/src/components/charts/ChartModal.tsx` | 30 | 69 | VERIFIED | Portal to document.body, backdrop click close, Escape key close, body scroll lock, h-[32rem] content area. |
| `frontend/src/components/charts/BurnProgressChart.tsx` | 40 | 134 | VERIFIED | ComposedChart, dual Y-axis (Z left, dZ/dt right), orange theme (#f97316), syncId, expanded prop, dot={false}. Imports BurnCurvePoint. |
| `frontend/src/components/charts/EnergyRecoilChart.tsx` | 40 | 178 | VERIFIED | Two stacked sub-charts (KE vs distance, recoil vs time), green theme (#22c55e), separate syncIds, expanded prop. |
| `frontend/src/components/charts/TemperatureChart.tsx` | 40 | 133 | VERIFIED | ComposedChart, dual Y-axis (T_gas left, Q_loss right), red theme (#ef4444), syncId, expanded prop. |
| `frontend/src/hooks/useChartExport.ts` | 30 | 51 | VERIFIED | html2canvas PNG export (dark bg #0f172a, scale 2), CSV generation with file-saver, returns chartRef + exportPng + exportCsv. |
| `frontend/src/hooks/useChartZoom.ts` | 25 | 78 | VERIFIED | ZoomState with left/right, refAreaLeft/Right, onMouseDown/Move/Up with 5% threshold, onDoubleClickReset. |
| `frontend/src/app/simulate/page.tsx` | 100 | 841 | VERIFIED | Restructured dashboard grid, imports all new chart components and SensitivityPanel, single ChartModal instance. |

#### Plan 02-03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/components/panels/SensitivityPanel.tsx` | Collapsible side panel with charge/seating/barrel sliders | VERIFIED (partial) | 245 lines. Charge and seating sliders are functional. Barrel length slider is rendered but disabled (input disabled, labeled "proximamente"). |
| `frontend/src/hooks/useSensitivity.ts` | Slider state management with debounced re-simulation | VERIFIED (partial) | 217 lines. useMutation for runSimulation + runSensitivity, 300ms debounce, delta computation. Barrel length state initialized to 0 and never triggers re-simulation. |
| `frontend/src/components/charts/PressureTimeChart.tsx` | Error band rendering via ComposedChart with stacked Area | VERIFIED | Contains ComposedChart. Lines 139-181: stacked Area trick with p_lower (transparent) + p_band (red fill 0.15 opacity) + dashed boundary lines. |
| `frontend/src/components/charts/VelocityDistanceChart.tsx` | Error band rendering via ComposedChart with stacked Area | VERIFIED | Contains ComposedChart. Lines 121-163: same stacked Area pattern with blue fill for velocity. |

---

### Key Link Verification

#### Plan 02-01 Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `backend/app/core/solver.py` | `backend/app/schemas/simulation.py` | SimResult fields mapped to DirectSimulationResponse | VERIFIED | `_sim_result_to_response()` in simulate.py (lines 104-127) maps all four new curve fields: `burn_curve=result.burn_curve or []`, etc. Pattern "burn_curve" confirmed. |
| `backend/app/api/simulate.py` | `backend/app/core/solver.py` | simulate() call for sensitivity endpoint | VERIFIED | Lines 243-247: `simulate(powder, bullet, cart, rif, ld)` called 3 times in a loop within `run_sensitivity`. Pattern "simulate.*sensitivity" confirmed. |

#### Plan 02-02 Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `frontend/src/lib/types.ts` | backend API response | TypeScript interfaces matching backend curve arrays | VERIFIED | Lines 184-208: BurnCurvePoint, EnergyCurvePoint, TemperatureCurvePoint, RecoilCurvePoint all defined with exact field names matching backend JSON. |
| `frontend/src/components/charts/BurnProgressChart.tsx` | `frontend/src/lib/types.ts` | Import BurnCurvePoint type | VERIFIED | Line 13: `import type { BurnCurvePoint } from '@/lib/types';` |
| `frontend/src/app/simulate/page.tsx` | `frontend/src/components/charts/ChartTile.tsx` | Wraps each chart in ChartTile | VERIFIED | Lines 610-707: all 6 chart instances wrapped in ChartTile with required props. |
| `frontend/src/components/charts/ChartTile.tsx` | `frontend/src/hooks/useChartExport.ts` | Uses export hook for PNG/CSV buttons | VERIFIED | Line 6: `import { useChartExport } from '@/hooks/useChartExport';`. Line 45: `const { chartRef, exportPng, exportCsv } = useChartExport();`. Both PNG and CSV buttons call the hook functions. |

#### Plan 02-03 Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `frontend/src/hooks/useSensitivity.ts` | `frontend/src/lib/api.ts` | Calls runSensitivity/runSimulation on debounced slider change | VERIFIED | Lines 5-6: imports `runSimulation, runSensitivity`. Lines 93-116: both used in useMutation callbacks. Lines 154-170: both called in debounce timeout. |
| `frontend/src/components/panels/SensitivityPanel.tsx` | `frontend/src/hooks/useSensitivity.ts` | Uses sensitivity hook for slider state and handlers | VERIFIED | Panel receives slider values and handlers as props; page.tsx (line 455) instantiates `useSensitivity(...)` and passes return values to SensitivityPanel (lines 736-753). |
| `frontend/src/app/simulate/page.tsx` | `frontend/src/components/panels/SensitivityPanel.tsx` | Renders panel alongside chart grid | VERIFIED | Line 18: import. Lines 735-753: rendered with all props including sensitivity hook values. Pattern "SensitivityPanel" confirmed. |
| `frontend/src/components/charts/PressureTimeChart.tsx` | `frontend/src/lib/types.ts` | Accepts error band data props | VERIFIED | Line 15: `import type { CurvePoint } from '@/lib/types';`. Props include `upperData?: CurvePoint[]`, `lowerData?: CurvePoint[]`. Pattern "upperData|lowerData" confirmed. |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CHART-01 | 02-01, 02-02 | Energy and momentum curves displayed (kinetic energy vs distance, recoil impulse over time) | SATISFIED | `EnergyRecoilChart.tsx`: KE vs distance (x_mm axis, ke_ft_lbs dataKey) + recoil impulse vs time (t_ms axis, impulse_ns dataKey). Backend `energy_curve` and `recoil_curve` populated in solver with ke_j, ke_ft_lbs, momentum_ns, impulse_ns fields. |
| CHART-02 | 02-01, 02-02 | Powder burn progress chart shows burn fraction Z vs time and gas generation rate dZ/dt | SATISFIED | `BurnProgressChart.tsx`: ComposedChart with dual Y-axis, dataKey="z" on left axis and dataKey="dz_dt" on right axis. Backend `burn_curve` populated with z, dz_dt, psi fields at each of 200 time points. |
| CHART-03 | 02-01, 02-02 | Temperature and heat curves show gas temperature, barrel wall temperature estimate, and cumulative heat loss over time | SATISFIED | `TemperatureChart.tsx`: ComposedChart with dataKey="t_gas_k" (left) and dataKey="q_loss_j" (right). Backend `temperature_curve` computes T_gas from Noble-Abel EOS with heat loss correction and cumulative Q_loss from ODE state. NOTE: barrel wall temperature estimate is not shown as a separate line (only T_gas and Q_loss). Requirement mention of "barrel wall temperature estimate" is unverifiable programmatically — flagged for human review. |
| CHART-04 | 02-01, 02-03 | Sensitivity analysis shows error bands on pressure/velocity charts for +/- charge weight variation | SATISFIED | `PressureTimeChart.tsx` and `VelocityDistanceChart.tsx` both use ComposedChart + stacked Area trick. `useSensitivity.ts` fetches upper/lower curves from /simulate/sensitivity endpoint. Error band toggle (showBands) wired through SensitivityPanel. |
| CHART-05 | 02-03 | Interactive sensitivity explorer allows user to drag sliders (charge weight, seating depth, barrel length) and see pressure/velocity update in real-time | BLOCKED (partial) | Charge weight and seating depth sliders trigger debounced re-simulation (verified in useSensitivity.ts). Barrel length slider exists in SensitivityPanel.tsx (line 169-191) but is disabled (`disabled` attribute, labeled "proximamente"). Re-simulation is not triggered on barrel length change. The requirement lists barrel length as a required slider. REQUIREMENTS.md traceability table marks CHART-05 as "Pending" (not "Complete") — consistent with this gap. |

**Orphaned requirements check:** CHART-01, CHART-02, CHART-03, CHART-04, CHART-05 are all mapped to Phase 2 in REQUIREMENTS.md traceability. All five appear in plan frontmatter. No orphaned requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/src/components/panels/SensitivityPanel.tsx` | 169 | `{/* Barrel Length Slider (disabled - coming soon) */}` + `disabled` attribute on slider | Warning | Barrel length slider is intentionally non-functional. This is a feature gap relative to CHART-05, not a code quality issue. The UI shows "(proximamente)" to users. |
| `frontend/src/hooks/useSensitivity.ts` | 61 | `useState(0); // Display only - initialized from rifle` | Warning | barrelLengthMm is effectively a stub: it holds a value but never triggers re-simulation. |

No blockers found in the critical execution paths (API calls, chart rendering, export logic).

---

### Human Verification Required

#### 1. Error bands visibility without opening sensitivity panel

**Test:** Run a simulation without opening the Explorador panel. Observe the P(t) chart.
**Expected:** Error bands (shaded fill with dashed boundaries) are NOT visible until the sensitivity panel is opened (because `sensitivity.sensitivityData` is null until `enabled=true`). Confirm this is the intended UX — bands appear only after opening the panel.
**Why human:** The code shows `pressureUpperData = sensitivity.sensitivityData?.upper?.pressure_curve` (page.tsx line 472), and `useSensitivity` only fires the sensitivity mutation when `enabled=true` (panel open). Static analysis cannot confirm whether the intended default is bands-on or bands-off.

#### 2. Synchronized crosshairs across time-domain charts

**Test:** After simulation, hover over the P(t) chart. Observe the Burn Progress and Temperature charts.
**Expected:** Crosshair vertical line appears simultaneously on P(t), Burn Progress, and Temperature charts (all share syncId="sim-time"). Recoil sub-chart in EnergyRecoilChart also shows crosshair.
**Why human:** Recharts syncId crosshair sync requires actual browser rendering with shared Recharts context; cannot be verified statically.

#### 3. CHART-03 barrel wall temperature coverage

**Test:** Examine the Temperature chart after a simulation.
**Expected:** Requirement CHART-03 mentions "barrel wall temperature estimate." The current implementation shows T_gas and Q_loss. Confirm whether showing T_gas implicitly satisfies the "barrel wall temperature estimate" requirement or if a separate T_wall data series is expected.
**Why human:** Requirement language is ambiguous; human judgment needed on whether gas temperature alone satisfies the intent of "barrel wall temperature estimate."

#### 4. Modal chart expand behavior

**Test:** Click the expand (Maximize2) button on each chart tile.
**Expected:** Full-screen modal opens with chart rendered at h-[32rem] (512px). Chart uses the `key="expanded"` variant for Recharts remount and correct sizing.
**Why human:** Portal-based modals with Recharts ResponsiveContainer remeasurement is a known pitfall; requires visual confirmation.

---

### Gaps Summary

One gap blocks full CHART-05 satisfaction:

**Barrel length slider is non-functional.** The `SensitivityPanel.tsx` renders a disabled range input labeled "(proximamente)" for barrel length. The `useSensitivity` hook initializes `barrelLengthMm` to 0 and never passes it to any re-simulation call. REQUIREMENTS.md explicitly marks CHART-05 as "Pending" in the traceability table (line 100), consistent with this gap.

The gap was acknowledged in the 02-03-SUMMARY.md as an intentional deviation: "Barrel length slider: Display-only as planned (requires backend changes for full support)." However, the plan's own success criteria (02-03-PLAN.md) listed barrel length as a required slider, and REQUIREMENTS.md still marks CHART-05 as Pending, so this verification must flag it as a gap.

**Root cause:** The `/simulate/direct` endpoint accepts `rifle_id` which fixes the barrel length from the DB. Overriding barrel length requires either: (a) adding an optional `barrel_length_mm_override` field to `DirectSimulationRequest`, or (b) a new endpoint. Neither has been implemented.

**Scope of fix:** Backend schema change + API endpoint update + frontend hook update. Moderate effort (~2-4 hours).

---

*Verified: 2026-02-21T12:00:00Z*
*Verifier: Claude (gsd-verifier)*
