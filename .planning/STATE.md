# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** The most accurate internal ballistics simulation available, validated against published load data, with comprehensive pre-loaded databases and modern web UX.
**Current focus:** Phase 1: 3-Curve Burn Model

## Current Position

Phase: 1 of 7 (3-Curve Burn Model)
Plan: 1 of 3 in current phase
Status: Executing
Last activity: 2026-02-21 -- Completed 01-01-PLAN.md (3-curve form function + dual-mode solver)

Progress: [█░░░░░░░░░] 4%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 4min
- Total execution time: 0.07 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - 3-Curve Burn Model | 1 | 4min | 4min |

**Recent Trend:**
- Last 5 plans: 01-01 (4min)
- Trend: First plan completed

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

### Pending Todos

None yet.

### Blockers/Concerns

- 3-curve form function equations are reconstructed, not verified against GRT source (GRT is closed-source). Plan for 2-3 iteration cycles.
- GRT community database on GitHub (zen/grt_databases) has only 12 powder files. Full 200+ dataset may require GRT installation export.
- Bullet data compilation (500+ bullets) requires manual work from manufacturer specs -- no automated source exists.

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 01-01-PLAN.md
Resume file: None
