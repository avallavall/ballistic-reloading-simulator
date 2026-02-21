---
phase: 02-extended-simulation-charts
plan: 02
subsystem: ui
tags: [recharts, charts, dashboard, react, html2canvas, file-saver, responsive-grid]

# Dependency graph
requires:
  - phase: 02-extended-simulation-charts
    provides: "SimResult with 4 new curve arrays: burn_curve, energy_curve, temperature_curve, recoil_curve"
provides:
  - "Responsive 2-column dashboard grid with 6 chart tiles (P/V hero + burn/energy/temperature/harmonics)"
  - "ChartTile wrapper with domain color accent, PNG/CSV export, expand-to-modal"
  - "ChartModal full-screen overlay with Escape/backdrop close and Recharts remount"
  - "BurnProgressChart (Z/dZ/dt dual-axis, orange), EnergyRecoilChart (KE+recoil stacked, green), TemperatureChart (T/Q dual-axis, red)"
  - "useChartExport hook (html2canvas PNG + CSV generation)"
  - "useChartZoom hook (click-drag zoom state management)"
  - "SensitivityInput/SensitivityResponse TS types + runSensitivity API function"
affects: [02-03-PLAN, sensitivity-explorer, frontend-charts]

# Tech tracking
tech-stack:
  added: [html2canvas, file-saver, "@types/file-saver"]
  patterns:
    - "ChartTile wrapper pattern: domain color accent + PNG/CSV/expand buttons for all chart types"
    - "ChartModal: single instance renders expanded chart via state-driven conditional rendering"
    - "syncId pattern: time-domain charts share sim-time, distance-domain share sim-distance"
    - "expanded prop pattern: charts accept expanded boolean for larger modal rendering"

key-files:
  created:
    - "frontend/src/components/charts/ChartTile.tsx"
    - "frontend/src/components/charts/ChartModal.tsx"
    - "frontend/src/components/charts/BurnProgressChart.tsx"
    - "frontend/src/components/charts/EnergyRecoilChart.tsx"
    - "frontend/src/components/charts/TemperatureChart.tsx"
    - "frontend/src/hooks/useChartExport.ts"
    - "frontend/src/hooks/useChartZoom.ts"
  modified:
    - "frontend/src/lib/types.ts"
    - "frontend/src/lib/api.ts"
    - "frontend/src/app/simulate/page.tsx"
    - "frontend/src/components/charts/PressureTimeChart.tsx"
    - "frontend/src/components/charts/VelocityDistanceChart.tsx"
    - "frontend/src/components/charts/HarmonicsChart.tsx"
    - "frontend/package.json"

key-decisions:
  - "Used html2canvas with dark background (#0f172a) matching app theme for PNG export"
  - "ChartTile uses lookup objects for Tailwind color classes instead of template literals (purge safety)"
  - "EnergyRecoilChart stacks two sub-charts vertically (KE vs distance, recoil vs time) since they have different x-axes"
  - "Single ChartModal instance controlled by expandedChart state, not per-chart modals"
  - "Extended CSV export now includes all 6 curve arrays when available"
  - "Graceful fallback: dashboard grid only renders when extended curves available, hero charts always render"

patterns-established:
  - "ChartTile: reusable wrapper for any Recharts chart with consistent chrome"
  - "ChartModal: portal-based overlay with key prop for Recharts remount"
  - "Domain color system: blue (pressure/velocity/harmonics), orange (burn), red (temperature), green (energy/recoil)"
  - "syncId crosshair sync: sim-time for all time-domain, sim-distance for distance-domain"

requirements-completed: [CHART-01, CHART-02, CHART-03]

# Metrics
duration: 6min
completed: 2026-02-21
---

# Phase 2 Plan 2: Frontend Chart Infrastructure + Dashboard Grid Summary

**Responsive 2-column dashboard grid with 6 chart tiles (burn/energy/temperature + existing P/V/harmonics), ChartTile wrapper with PNG/CSV export, and full-screen expand modal using html2canvas**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-21T11:13:38Z
- **Completed:** 2026-02-21T11:19:27Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments
- Built reusable ChartTile wrapper and ChartModal infrastructure providing consistent tile chrome (domain color accent, PNG/CSV/expand buttons) for all chart types
- Created 3 new chart components: BurnProgressChart (Z and dZ/dt dual-axis, orange), EnergyRecoilChart (KE vs distance + recoil impulse vs time, green), TemperatureChart (T_gas and Q_loss dual-axis, red)
- Restructured simulation page from vertical stack of 2 charts into responsive 2-column dashboard grid with 6 chart tiles, hero row, and full-screen expand modal
- Added SensitivityInput/SensitivityResponse TS types and runSensitivity API function for Plan 03
- TypeScript compiles cleanly, Next.js build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies, add TS types, update API client, create chart infrastructure** - `f639c8e` (feat)
2. **Task 2: Create BurnProgressChart, EnergyRecoilChart, and TemperatureChart components** - `9eaf2e8` (feat)
3. **Task 3: Restructure simulate/page.tsx into responsive dashboard grid** - `66272fd` (feat)

## Files Created/Modified
- `frontend/src/components/charts/ChartTile.tsx` - Reusable chart wrapper with domain color accent, PNG/CSV export, expand button
- `frontend/src/components/charts/ChartModal.tsx` - Full-screen portal overlay with Escape/backdrop close, body scroll lock
- `frontend/src/components/charts/BurnProgressChart.tsx` - Z(t) and dZ/dt(t) dual-axis ComposedChart with orange domain color
- `frontend/src/components/charts/EnergyRecoilChart.tsx` - Stacked KE(x) vs distance + recoil impulse(t) vs time, green domain
- `frontend/src/components/charts/TemperatureChart.tsx` - T_gas(t) and Q_loss(t) dual-axis ComposedChart with red domain color
- `frontend/src/hooks/useChartExport.ts` - html2canvas PNG export (dark bg, 2x scale) + CSV generation with file-saver
- `frontend/src/hooks/useChartZoom.ts` - Click-drag zoom state management with 5% minimum threshold
- `frontend/src/lib/types.ts` - Added BurnCurvePoint, EnergyCurvePoint, TemperatureCurvePoint, RecoilCurvePoint, SensitivityInput/Response
- `frontend/src/lib/api.ts` - Added runSensitivity API function
- `frontend/src/app/simulate/page.tsx` - Restructured to 2-column dashboard grid with ChartTile wrappers and single ChartModal
- `frontend/src/components/charts/PressureTimeChart.tsx` - Added syncId and expanded props
- `frontend/src/components/charts/VelocityDistanceChart.tsx` - Added syncId and expanded props
- `frontend/src/components/charts/HarmonicsChart.tsx` - Added syncId and expanded props
- `frontend/package.json` - Added html2canvas, file-saver, @types/file-saver dependencies

## Decisions Made
- Used html2canvas with dark background (#0f172a) for PNG exports to match the app's dark theme
- EnergyRecoilChart stacks two sub-charts vertically rather than using dual Y-axis, because KE uses distance on X-axis while recoil uses time -- incompatible X-axes
- Single ChartModal instance at page level controlled by expandedChart state (not per-chart modal instances) for cleaner DOM
- ChartTile uses lookup objects for Tailwind color classes (purge-safe) instead of template literal interpolation
- Enhanced global CSV export to include all 6 curve arrays when available
- Graceful degradation: extended curve grid only shows when burn_curve has data, hero charts always render

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Enhanced CSV export with extended curves**
- **Found during:** Task 3 (restructuring simulate/page.tsx)
- **Issue:** The existing exportCsv function only exported pressure and velocity curves. With 4 new curve arrays now available, the global CSV export would omit important data.
- **Fix:** Extended exportCsv to include burn_curve, energy_curve, temperature_curve, and recoil_curve sections when available
- **Files modified:** frontend/src/app/simulate/page.tsx
- **Verification:** TypeScript compiles, build succeeds
- **Committed in:** 66272fd (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Enhances data completeness of CSV export. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 6 chart tiles operational in dashboard grid with per-chart PNG/CSV export and expand-to-modal
- SensitivityInput/SensitivityResponse types and runSensitivity API function ready for 02-03-PLAN (error bands + sensitivity explorer)
- useChartZoom hook created and ready for integration with error band charts
- No blockers

## Self-Check: PASSED

- All 14 created/modified files verified on disk
- All 3 task commits (f639c8e, 9eaf2e8, 66272fd) verified in git history
- TypeScript compiles cleanly (tsc --noEmit)
- Next.js build succeeds (npm run build)

---
*Phase: 02-extended-simulation-charts*
*Completed: 2026-02-21*
