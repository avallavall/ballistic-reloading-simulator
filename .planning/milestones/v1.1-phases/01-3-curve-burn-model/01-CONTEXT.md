# Phase 1: 3-Curve Burn Model - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Upgrade the internal ballistics solver from a 2-curve Vieille burn model to a GRT-style 3-phase combustion model (initial/main/tail-off with z1/z2 phase transitions). Store GRT-native powder parameters (Ba, k, z1, z2, Bp, Br, Brp) as first-class database fields. Enable .propellant file import. Validate predictions within 5% of published load manual data across 20+ reference loads. Existing 2-curve powders must continue to simulate identically.

</domain>

<decisions>
## Implementation Decisions

### GRT Import Flow
- Import button lives on the Powders list page, next to the existing "Add Powder" button
- Imports all powders from the file at once (no per-powder selection step)
- On name collisions: show a dialog asking the user to skip or overwrite for each duplicate
- After import: show a summary modal with imported/skipped/failed counts and a list of powder names with any issues
- File format: GRT .propellant XML files

### Powder Parameter Display
- New GRT fields (Ba, k, z1, z2, Bp, Br, Brp) displayed in a collapsible "Advanced: 3-Curve Parameters" section, collapsed by default
- Parameters are editable, but show a warning: "Modifying burn model parameters may reduce accuracy"
- Powders list table shows a badge (e.g., "3C") next to the powder name indicating whether it has 3-curve parameters loaded vs 2-curve only
- Manual powder creation form includes the collapsible GRT section as optional fields (user can fill in 3-curve params from scratch if they have the data)

### Validation Reference Loads
- Priority calibers (all four): .308 Win, 6.5 Creedmoor, .223 Rem, .300 Win Mag
- Ground truth sources: Hodgdon Reloading Data Center, Sierra Reloading Manual, Hornady Handbook, GRT community verified loads
- Validation results are user-visible, not just backend tests
- Dedicated /validation page showing per-load detail table (predicted vs published velocity, % error, pass/fail badge) plus comparison charts
- Backend test suite also runs the same validation as a quality gate in pytest

### Claude's Discretion
- 3-curve form function mathematical implementation (piecewise polynomial approach)
- ODE integrator modifications for 3-phase combustion
- GRT .propellant XML parsing strategy
- Backward compatibility layer for 2-curve powders
- Exact badge styling and color for "2C" vs "3C" indicators
- Validation chart type (bar chart, scatter, etc.)
- Error/warning toast vs inline message styling

</decisions>

<specifics>
## Specific Ideas

- The import flow should feel lightweight: button click, file picker, import, summary modal. No multi-step wizard.
- The "3C" badge on the powders list should make it immediately obvious which powders will benefit from the upgraded solver.
- The validation page serves as both a trust-building feature for users and a development quality dashboard.
- Reference loads should span a range of bullet weights per caliber (light/medium/heavy) to test the solver across operating conditions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-3-curve-burn-model*
*Context gathered: 2026-02-20*
