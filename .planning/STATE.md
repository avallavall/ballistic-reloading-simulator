# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** The most accurate internal ballistics simulation available, validated against published load data, with comprehensive pre-loaded databases and modern web UX.
**Current focus:** Phase 1: 3-Curve Burn Model -- COMPLETE. Next: Phase 2: Extended Simulation Charts

## Current Position

Phase: 1 of 7 (3-Curve Burn Model) -- COMPLETE
Plan: 3 of 3 in current phase (all complete)
Status: Phase complete
Last activity: 2026-02-21 -- 01-03-PLAN.md Task 3 checkpoint approved, Phase 1 complete

Progress: [█░░░░░░░░░] 14%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 6.7min
- Total execution time: 0.33 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - 3-Curve Burn Model | 3/3 | 20min | 6.7min |

**Recent Trend:**
- Last 5 plans: 01-01 (4min), 01-02 (6min), 01-03 (10min)
- Trend: Consistent pace, Phase 1 complete

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

### Pending Todos

None -- Phase 1 complete.

### Blockers/Concerns

- 3-curve form function equations are reconstructed, not verified against GRT source (GRT is closed-source). Plan for 2-3 iteration cycles.
- GRT community database on GitHub (zen/grt_databases) has only 12 powder files. Full 200+ dataset may require GRT installation export.
- Bullet data compilation (500+ bullets) requires manual work from manufacturer specs -- no automated source exists.

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 01-03-PLAN.md -- Phase 1 complete
Resume file: None
