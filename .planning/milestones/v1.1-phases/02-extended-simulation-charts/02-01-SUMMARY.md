---
phase: 02-extended-simulation-charts
plan: 01
subsystem: api
tags: [solver, ode, curves, sensitivity, fastapi, pydantic]

# Dependency graph
requires:
  - phase: 01-3-curve-burn-model
    provides: "3-curve solver with validated ODE integration (Z, x, v, Q_loss arrays)"
provides:
  - "SimResult with 4 new curve arrays: burn_curve, energy_curve, temperature_curve, recoil_curve"
  - "POST /simulate/sensitivity endpoint for 3-simulation error band data"
  - "_sim_result_to_response helper reducing SimResult-to-API conversion duplication"
affects: [02-02-PLAN, 02-03-PLAN, frontend-charts, sensitivity-explorer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Extended curve extraction from existing ODE solution arrays (no new physics models)"
    - "_sim_result_to_response helper for consistent SimResult-to-API conversion"
    - "Sensitivity endpoint pattern: single request, 3 simulations, combined response"

key-files:
  created: []
  modified:
    - "backend/app/core/solver.py"
    - "backend/app/schemas/simulation.py"
    - "backend/app/api/simulate.py"
    - "backend/tests/test_solver.py"
    - "backend/tests/test_api_integration.py"

key-decisions:
  - "Extract curves from existing ODE arrays in post-processing loop, no new physics or ODE re-runs needed"
  - "Sensitivity endpoint runs 3 full simulations (center, +delta, -delta) and returns complete DirectSimulationResponse for each"
  - "Rate limit sensitivity at 10/minute (same as direct sim, since it is one user interaction)"
  - "Lower charge clamped to max(0.1, center - delta) to prevent zero/negative charge"
  - "Used _sim_result_to_response helper to reduce code duplication across 3 endpoint callers"

patterns-established:
  - "_sim_result_to_response: centralized SimResult-to-DirectSimulationResponse converter"
  - "Sensitivity endpoint pattern: center/upper/lower structure with explicit charge values"

requirements-completed: [CHART-01, CHART-02, CHART-03, CHART-04]

# Metrics
duration: 5min
completed: 2026-02-21
---

# Phase 2 Plan 1: Extended Solver Curves + Sensitivity Endpoint Summary

**Extended solver SimResult with burn/energy/temperature/recoil curve arrays extracted from existing ODE solution, plus /simulate/sensitivity endpoint returning 3-simulation error band data**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-21T11:05:41Z
- **Completed:** 2026-02-21T11:10:18Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added 4 new curve arrays to SimResult (burn_curve, energy_curve, temperature_curve, recoil_curve), each with 200 data points extracted from existing ODE solution arrays
- Created POST /simulate/sensitivity endpoint that runs center/+delta/-delta simulations and returns all 3 full DirectSimulationResponse objects in one response
- All 255 tests pass (21 new: 16 solver curve tests + 5 integration tests) with golden output backward compatibility confirmed

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend solver SimResult with burn, energy, temperature, and recoil curves** - `2d57abb` (feat)
2. **Task 2: Add /simulate/sensitivity endpoint for error band data** - `1bcecbf` (feat)

## Files Created/Modified
- `backend/app/core/solver.py` - Extended SimResult dataclass with 4 new curve fields; added dZ/dt computation via np.gradient; populated burn/energy/temperature/recoil curves in post-processing loop
- `backend/app/schemas/simulation.py` - Added burn_curve/energy_curve/temperature_curve/recoil_curve to DirectSimulationResponse and SimulationResultResponse; added SensitivityRequest and SensitivityResponse schemas
- `backend/app/api/simulate.py` - Added _sim_result_to_response helper; added POST /simulate/sensitivity endpoint; refactored ladder and direct endpoints to use helper
- `backend/tests/test_solver.py` - Added TestExtendedCurves class with 16 tests covering all 4 curve arrays (200 points, keys, physics values, unit conversion, backward compat)
- `backend/tests/test_api_integration.py` - Added 5 tests: sensitivity success, upper>center pressure, extended curves in sensitivity, 404 handling, extended curves in direct endpoint

## Decisions Made
- Extracted curves from existing ODE arrays in the same post-processing loop that builds pressure_curve and velocity_curve -- no new physics or ODE re-runs needed
- Gas temperature computed from Noble-Abel EOS with heat loss correction (same formula as ODE rhs)
- Recoil impulse curve uses Thornhill factor 1.75 for gas jet momentum (consistent with scalar recoil calculation)
- Energy curve includes both SI (J, N*s) and imperial (ft-lbs) units for frontend flexibility
- Sensitivity endpoint returns full DirectSimulationResponse (including all 6 curve arrays) for each of the 3 variants

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extracted _sim_result_to_response helper**
- **Found during:** Task 1 (extending DirectSimulationResponse construction)
- **Issue:** SimResult-to-DirectSimulationResponse conversion was duplicated in 3 places (direct, ladder, and would be needed again in sensitivity). Adding 4 new fields to each copy would create maintenance risk.
- **Fix:** Extracted _sim_result_to_response helper function, refactored all callers to use it
- **Files modified:** backend/app/api/simulate.py
- **Verification:** All 255 tests pass
- **Committed in:** 2d57abb (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Refactoring reduces code duplication. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend data layer complete: all 6 curve arrays (pressure, velocity, burn, energy, temperature, recoil) available in API responses
- Sensitivity endpoint provides center/upper/lower simulation data for error band visualization
- Frontend can now build chart components (02-02-PLAN) and sensitivity explorer (02-03-PLAN) consuming this data
- No blockers

## Self-Check: PASSED

- All 6 modified/created files verified on disk
- Both task commits (2d57abb, 1bcecbf) verified in git history
- 255 tests passing (full suite)

---
*Phase: 02-extended-simulation-charts*
*Completed: 2026-02-21*
