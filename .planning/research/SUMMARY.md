# Research Summary: Simulador de Balistica v2

**Domain:** Internal ballistics simulation -- web-based reloading tool
**Researched:** 2026-02-20
**Overall confidence:** MEDIUM-HIGH

## Executive Summary

The v2 milestone adds five major feature areas to an already-functional ballistics simulator: a 3-curve powder burn model, 3D/2D component viewers, community-driven data features, comprehensive pre-loaded databases, and additional simulation charts. The research confirms that **no exotic technologies are needed** -- the existing stack (FastAPI, Next.js, SciPy, Recharts, PostgreSQL) handles all v2 requirements with surgical additions.

The most technically uncertain area is the **3-curve burn model mathematics**. GRT is closed-source, and the exact piecewise form function equations cannot be directly verified. The approach must be: implement based on available parameter semantics (a0, z1, z2, Bp, Br from GRT XML files), then iteratively validate against GRT predictions for known loads. This is the highest-risk, highest-value feature.

The 3D rendering stack (Three.js + React Three Fiber) is mature and well-suited for procedural/parametric geometry. The critical architectural decision is to generate geometry from database dimensions rather than loading static 3D model files -- this makes the viewers data-driven and valuable to users.

Community features require authentication infrastructure that doesn't exist yet. The recommended approach uses FastAPI JWT (python-jose + passlib) on the backend and Auth.js v5 (next-auth) on the frontend. The reverse-engineering algorithm for powder calibration from chronograph data is feasible using SciPy's differential_evolution optimizer.

## Key Findings

**Stack:** 4 new npm packages (Three.js ecosystem) + 2 new pip packages (auth) + 2 new npm packages (auth). No new charting or computation libraries.
**Architecture:** Procedural 3D geometry (LatheGeometry + CSG), piecewise form function extending existing ODE, JWT auth with FastAPI backend.
**Critical pitfall:** 3-curve model accuracy depends on reconstructed equations from a closed-source tool; must validate iteratively against known loads.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **3-Curve Burn Model** -- Highest priority, highest risk. The accuracy improvement is the core value proposition vs GRT. Should come first because all other features (community calibration, powder quality indicators, temperature sensitivity) depend on the model being accurate enough to calibrate.
   - Addresses: Solver accuracy, GRT parameter utilization, model quality indicators
   - Avoids: Building community features on top of an inaccurate model

2. **Extended Charts + Solver Output** -- Low effort, high value. The solver already computes all necessary data (Z, T_gas, Q_loss, KE); this phase just exposes it in the API response and adds frontend charts.
   - Addresses: Burn progress, energy curves, temperature charts
   - Avoids: No new dependencies, no risk

3. **Data Import Pipeline** -- Medium effort. The GRT parser already exists. Expand to bulk import, add bullet/cartridge seed data, promote GRT params to first-class columns.
   - Addresses: Comprehensive powder/bullet/cartridge databases
   - Avoids: Manual data entry (the biggest UX friction point)

4. **3D/2D Viewers** -- Medium effort, visually impressive. Independent of simulation accuracy. Can be built in parallel with other phases.
   - Addresses: Rifle and cartridge visualization
   - Avoids: No dependency on simulation engine changes

5. **Community Features** -- Highest effort. Requires auth infrastructure, new database tables, moderation workflows. Should come last because the calibration algorithm needs an accurate 3-curve model to be useful.
   - Addresses: User submissions, load sharing, powder quality ratings, reverse-engineering
   - Avoids: Premature auth complexity before core features are ready

6. **Temperature Sensitivity** -- Small, self-contained. Can be added at any point after 3-curve model (needs temp_coeff from GRT data).
   - Addresses: Ambient temperature effects on predictions
   - Avoids: No dependencies beyond GRT params

**Phase ordering rationale:**
- 3-curve model must come first because community calibration validates against it
- Charts are quick wins that make existing features more useful immediately
- Data import should precede 3D viewers (viewers need populated component databases to be meaningful)
- Community features are the capstone -- they require everything else to be working

**Research flags for phases:**
- Phase 1 (3-curve model): NEEDS deeper research -- reconstructed equations must be validated against GRT predictions. Plan for 2-3 iteration cycles.
- Phase 2 (charts): Standard patterns, no research needed
- Phase 3 (data import): LOW risk -- parser exists, just needs expansion
- Phase 4 (3D viewers): MODERATE risk -- CSG boolean operations can be finicky with complex geometry
- Phase 5 (community): MODERATE risk -- auth flow integration between FastAPI and Auth.js needs careful testing

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack - 3D rendering | HIGH | Three.js + R3F is the only viable choice; versions verified on npm |
| Stack - Auth | HIGH | FastAPI JWT + Auth.js v5 is well-documented standard pattern |
| Stack - Charting | HIGH | Recharts already installed, all components available |
| Stack - 3-curve model | MEDIUM | GRT is closed-source; equations reconstructed, not verified |
| Stack - Data import | HIGH | Parser already exists; expansion is straightforward |
| Stack - Community calibration | MEDIUM | differential_evolution approach is sound but untested for this specific problem |

## Gaps to Address

- **3-curve form function exact equations**: Need to acquire or derive the exact piecewise functions GRT uses. Best path: import GRT powder files, run known loads in GRT, compare predicted values to our solver, iterate until match.
- **GRT database completeness**: The `zen/grt_databases` repo only has 12 powder files. The full GRT community database has 200+ powders -- need to determine how to access the complete dataset (may require GRT installation export).
- **Auth.js v5 stability**: Auth.js v5 is in beta. Need to verify it's stable enough for production use, or fall back to v4 if issues arise.
- **Bullet data compilation**: No automated source for bullet specifications. Manual compilation of 500+ bullets is labor-intensive.

---

*Research summary: 2026-02-20*
