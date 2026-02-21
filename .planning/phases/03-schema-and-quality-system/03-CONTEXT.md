# Phase 3: Schema and Quality System - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Every component record carries a computed quality score (0-100) and data source provenance. The solver reads per-powder web_thickness from the database instead of the hardcoded 0.0004m default. This phase adds new DB columns via Alembic migration, implements the quality scoring algorithm, and adds minimal frontend display (badges + tooltip on powder page). Full frontend integration across all component pages is Phase 6.

Requirements covered: PWD-02, PWD-03, PWD-04, QLT-02, QLT-03, SOL-01

</domain>

<decisions>
## Implementation Decisions

### Quality score formula
- **Source reliability dominates**: 30% weight on field completeness, 70% on source reliability tier
- A manufacturer datasheet with gaps still scores higher than a complete estimated entry
- **Badge color thresholds**: Claude's discretion — pick thresholds based on testing with real data distribution from GRT import
- **Critical fields**: Claude's discretion — determine which powder fields are critical vs bonus based on solver dependencies (burn_rate_coeff, burn_rate_exp, force_constant, covolume, web_thickness, etc.)
- Quality score is deterministic: same inputs always produce the same 0-100 score

### Data source provenance
- **Source values**: `manufacturer`, `grt_community`, `grt_modified`, `manual`, `estimated`
- **Edit behavior**: When a user edits a GRT-imported powder, the source changes from `grt_community` to `grt_modified` — preserves import origin while tracking modification
- **Reliability tier order**: `manufacturer` > `grt_community` > `grt_modified` > `manual` > `estimated` (grt_modified ranks between grt_community and manual)
- **Source visibility**: Displayed as a small label on the powder list (e.g., "GRT Community", "Manual"), not hidden
- **New powder source**: Claude's discretion — decide the most practical default source when user creates a powder via the form

### Score breakdown tooltip
- **Format**: Summary sentence style — e.g., "78/100 — GRT Community, 8/10 fields filled, missing: web_thickness, gas_moles"
- **Missing fields**: List specific missing field names (actionable for the user)
- **Tooltip behavior**: Purely informational — no edit links or interactive elements inside
- **Tooltip trigger element**: Claude's discretion — pick the most intuitive placement (badge itself vs info icon)

### Web thickness in UI
- **Form visibility**: Only shown in Advanced mode of the powder create/edit form — hidden in Simple mode
- **Null display**: Show empty/blank when not set (no "default 0.4mm" placeholder)
- **Units**: Display in mm in the form, convert to meters (SI) internally for the solver — consistent with existing COAL/mm convention
- **Simulation warning when using default**: Claude's discretion — follow existing warning/note patterns in the UI

### Claude's Discretion
- Badge color thresholds (green/yellow/red cutoff scores)
- Critical vs bonus field classification for completeness scoring
- Tooltip trigger element placement
- Default data_source for manually created powders
- Whether to show a note in simulation results when default web_thickness is used
- Exact wording of provenance labels in the UI

</decisions>

<specifics>
## Specific Ideas

- Source labels should be human-readable in the UI: "GRT Community" not "grt_community", "Manufacturer" not "manufacturer"
- Tooltip summary should be concise enough to read at a glance — one sentence, not a table
- The quality score auto-recomputes on PUT (success criteria #4) — no manual "recalculate" action needed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-schema-and-quality-system*
*Context gathered: 2026-02-21*
