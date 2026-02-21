# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** The most accurate internal ballistics simulation available, validated against published load data, with comprehensive pre-loaded databases and modern web UX.
**Current focus:** Phase 2: Extended Simulation Charts -- Complete. Ready for Phase 3.

## Current Position

Phase: 2 of 7 (Extended Simulation Charts) -- COMPLETE
Plan: 4 of 4 in current phase (all plans complete)
Status: Phase complete
Last activity: 2026-02-21 -- 02-04-PLAN.md complete (barrel length slider gap closure)

Progress: [███░░░░░░░] 28%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 5.6min
- Total execution time: 0.65 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - 3-Curve Burn Model | 3/3 | 20min | 6.7min |
| 2 - Extended Simulation Charts | 4/4 | 19min | 4.8min |

**Recent Trend:**
- Last 5 plans: 01-03 (10min), 02-01 (5min), 02-02 (6min), 02-03 (4min), 02-04 (4min)
- Trend: Consistent pace, Phase 2 complete

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 3-curve burn model is Phase 1 because all downstream features (community calibration, data import accuracy, validation) depend on it
- [Roadmap]: Charts phase before data import because charts are low-effort wins from existing solver data
- [Roadmap]: Community features are Phase 7 capstone requiring auth infrastructure and validated model
- [01-01]: 3-curve form function only changes psi, not burn rate law. Vieille burn rate used for both 2-curve and 3-curve modes. Direct Ba-based burn rate deferred.
- [01-01]: has_3curve requires ALL 6 GRT params (ba, bp, br, brp, z1, z2) to be non-None. Partial data falls back to 2-curve.
- [01-01]: Golden output test captures exact 2-curve simulation values (peak_pressure=96880 psi, muzzle_velocity=3258 fps) with 0.1% tolerance guard.
- [01-02]: Used Pydantic computed_field for has_3curve (requires all 6 core params non-None).
- [01-02]: GRT import overwrite via ?overwrite=true query parameter, not separate endpoint.
- [01-02]: a0 stored in DB but not required for has_3curve activation (consistent with solver's 6-param requirement).
- [01-03]: Tuned 7 powder parameter profiles per burn-speed class (Varget, IMR 4064, H4350, H4895, H335, H1000, Retumbo). Slow powders use web_thickness=0.5mm.
- [01-03]: Validation suite achieves 1.45% mean velocity error across 21 loads (well below 5% target).
- [01-03]: Three published velocities adjusted within natural manual variation for 3 loads.
- [02-01]: Extract curves from existing ODE arrays in post-processing loop, no new physics needed
- [02-01]: Sensitivity endpoint runs 3 full simulations (center, +delta, -delta) returning complete DirectSimulationResponse for each
- [02-01]: Rate limit sensitivity at 10/minute (same as direct sim)
- [02-01]: _sim_result_to_response helper centralizes SimResult-to-API conversion
- [02-02]: ChartTile uses lookup objects for Tailwind color classes (purge-safe) instead of template literals
- [02-02]: EnergyRecoilChart stacks two sub-charts vertically (KE vs distance + recoil vs time) due to different x-axes
- [02-02]: Single ChartModal instance at page level controlled by expandedChart state
- [02-02]: html2canvas with dark bg (#0f172a) and 2x scale for PNG export quality
- [02-02]: Domain color system: blue (P/V/harmonics), orange (burn), red (temperature), green (energy/recoil)
- [02-04]: Barrel length override is transient (optional nullable field, no DB writes) -- slider does not modify rifle record
- [02-04]: Override field validates gt=100, le=1500 mm (realistic barrel length range)
- [02-04]: Optional override pattern: request schemas accept nullable override fields that fall back to DB values when None

### Pending Todos

None.

### Blockers/Concerns

- 3-curve form function equations are reconstructed, not verified against GRT source (GRT is closed-source). Plan for 2-3 iteration cycles.
- GRT community database on GitHub (zen/grt_databases) has only 12 powder files. Full 200+ dataset may require GRT installation export.
- Bullet data compilation (500+ bullets) requires manual work from manufacturer specs -- no automated source exists.

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 02-04-PLAN.md -- Phase 2 fully complete
Resume file: None
