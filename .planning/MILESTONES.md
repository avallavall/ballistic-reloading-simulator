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


## v1.2 Component Databases + Search (Shipped: 2026-02-24)

**Delivered:** Built comprehensive pre-loaded component databases (208 powders, 127 bullets, 53 cartridges) with quality scoring, fuzzy search, pagination, filter controls, and searchable picker modals so users can simulate immediately without manual data entry.

**Phases:** 3-10 | **Plans:** 17 | **Tasks:** ~34
**Files modified:** 72 | **Insertions:** 8,045 | **Deletions:** 532
**Timeline:** 4 days (2026-02-21 -> 2026-02-24)
**Git range:** `53baf2c` -> `4da631c`

**Key accomplishments:**
1. Quality scoring system with red/yellow/green badges and 0-100 score tooltips across all component types, with auto-recompute on update
2. pg_trgm fuzzy search with server-side pagination on all component endpoints (handles typos like "hodgon" -> "Hodgdon")
3. Pre-loaded databases: 208 powders (GRT community data + estimated burn models), 127 bullets (Sierra/Hornady/Berger/Nosler/Lapua), 53 cartridges (CIP/SAAMI specs)
4. Searchable picker modals replacing flat dropdowns in simulation form with debounced search and quality badges
5. Filter controls (manufacturer, caliber family, quality level) on all list pages with AND composition
6. Powder alias system linking 18 powders across 11 alias groups (e.g., ADI AR2208 = Hodgdon Varget) with UI display and GRT import integration

**Requirements completed:** PWD-01 through PWD-05, BUL-01 through BUL-04, CRT-01 through CRT-03, QLT-01 through QLT-03, SRC-01 through SRC-05, SOL-01 (21/21)

**Archive:** `milestones/v1.2-ROADMAP.md`, `milestones/v1.2-REQUIREMENTS.md`, `milestones/v1.2-MILESTONE-AUDIT.md`

---

