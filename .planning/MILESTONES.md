# Milestones

## v1.1 3-Curve Engine + Extended Charts (Shipped: 2026-02-21)

**Delivered:** Upgraded the simulation engine from 2-curve Vieille to GRT-style 3-curve burn model with 1.45% mean velocity error across 21 reference loads, and added a comprehensive chart dashboard with interactive sensitivity explorer.

**Phases:** 1-2 | **Plans:** 7 | **Tasks:** 16
**Files modified:** 39 | **Insertions:** 6,544
**LOC:** 8,106 Python + 10,523 TypeScript
**Timeline:** 2 days (2026-02-20 -> 2026-02-21)
**Git range:** `f699215` -> `2e51874`

**Key accomplishments:**
1. 3-curve piecewise burn model (z1/z2 phase transitions) with dual-mode solver dispatch and 2-curve backward compatibility guard
2. Full-stack GRT parameter support: 7 DB columns, Alembic migration, GRT import with overwrite/collision dialog, 3C/2C badges
3. Validation suite: 21 reference loads across 4 calibers achieving 1.45% mean velocity error (target <5%), with /validation dashboard
4. Extended solver curves: burn fraction, energy, temperature, recoil extracted from ODE arrays + sensitivity endpoint
5. Responsive 6-tile chart dashboard with ChartTile wrapper, PNG/CSV export, expand-to-modal, domain color system
6. Interactive sensitivity explorer: error bands on P/V charts + 3 live sliders (charge weight, seating depth, barrel length) with critical safety fixes

**Requirements completed:** SIM-01, SIM-02, SIM-04, CHART-01, CHART-02, CHART-03, CHART-04, CHART-05 (8/8 for this milestone scope)

**Archive:** `milestones/v1.1-ROADMAP.md`, `milestones/v1.1-REQUIREMENTS.md`

---

