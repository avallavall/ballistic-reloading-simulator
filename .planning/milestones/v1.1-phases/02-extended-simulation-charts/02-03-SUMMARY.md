---
phase: 02-extended-simulation-charts
plan: 03
subsystem: ui
tags: [sensitivity, error-bands, sliders, recharts, composedchart, safety, calibration]
---

## Summary

Added error band visualization to P(t) and V(x) charts and built the interactive sensitivity explorer with collapsible slider panel. Also fixed critical safety bugs in pressure calculation and charge density validation, and recalibrated all GRT-imported powder burn rate coefficients.

## Key Changes

### Error Bands (Task 1)
- Converted PressureTimeChart and VelocityDistanceChart from `LineChart` to `ComposedChart`
- Implemented stacked Area trick: invisible lower bound + visible band fill + dashed boundary lines
- Optional `upperData`/`lowerData`/`showBands` props (backward compatible)

### Sensitivity Panel (Task 2)
- `useSensitivity` hook: debounced re-simulation (300ms), TanStack Query mutations, delta computation
- `SensitivityPanel`: collapsible right panel with charge weight (+/-5gr) and seating depth (+/-2mm) sliders
- Barrel length slider shown as "proximamente" (disabled)
- Error band toggle, delta summary, reset button
- All charts update live when sliders are dragged

### Critical Safety Fixes (during checkpoint verification)
- **Solver charge density override**: `is_safe=False` forced when charge density exceeds physical limits (bulk fill >105% or covolume ratio >0.95)
- **Frontend multi-criteria safety**: `getPressureSafetyLevel()` now checks `is_safe` flag + warnings, not just pressure ratio
- **Danger label**: Shows "PELIGRO - CARGA FISICAMENTE IMPOSIBLE" for overcharged loads
- **GRT powder recalibration**: All 14 GRT-imported powders had burn_rate_coeff ~2.15x too low; RS50 calibrated against published ReloadSwiss data, all others scaled proportionally

### UI Polish
- Explorer button: blue gradient with shadow for better visibility

## Commits
- `f9b4abc` feat(02-03): add error band support to PressureTimeChart and VelocityDistanceChart
- `cf8c424` feat(02-03): add sensitivity panel, useSensitivity hook, and wire into simulate page

## Deviations
- **Safety fixes added**: Charge density validation and GRT calibration were not in the original plan but were critical safety issues discovered during human verification
- **Barrel length slider**: Display-only as planned (requires backend changes for full support)

## Key Files

### Created
- `frontend/src/components/panels/SensitivityPanel.tsx` — Collapsible sensitivity explorer panel
- `frontend/src/hooks/useSensitivity.ts` — Debounced re-simulation hook

### Modified
- `frontend/src/components/charts/PressureTimeChart.tsx` — ComposedChart + error bands
- `frontend/src/components/charts/VelocityDistanceChart.tsx` — ComposedChart + error bands
- `frontend/src/app/simulate/page.tsx` — Sensitivity panel integration + safety indicator fix
- `frontend/src/lib/utils.ts` — Multi-criteria safety level check
- `frontend/src/lib/types.ts` — ErrorBandPoint type
- `backend/app/core/solver.py` — Charge density safety override + bulk fill ratio check
