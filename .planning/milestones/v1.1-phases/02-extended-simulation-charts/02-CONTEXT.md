# Phase 2: Extended Simulation Charts - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Expose all solver-computed physics as new chart types on the simulation results page: burn progress, energy/momentum, temperature/heat, sensitivity error bands, and an interactive parameter explorer. No new solver physics are added — this phase visualizes data the solver already computes.

</domain>

<decisions>
## Implementation Decisions

### Page layout & chart organization
- Dashboard grid layout: all charts displayed as tiles in a 2-column (or responsive) grid
- Hero row: Pressure vs Time and Velocity vs Distance remain the two largest, most prominent charts at the top
- All other charts (burn progress, energy, temperature, harmonics, recoil) are smaller tiles below the hero row
- Harmonics (OBT) chart moves into the grid as a regular tile alongside the new charts
- Click any tile to expand into a modal/overlay with full detail, tooltips, and zoom
- Close modal to return to grid view

### Sensitivity explorer UX
- Collapsible side panel with sliders for charge weight, seating depth, and barrel length
- Replace (live update) mode: charts update in real-time as user drags sliders — no overlaid traces
- All charts in the grid respond to slider changes simultaneously (burn, temperature, energy, etc. — not just P/V)
- Result summary cards update live AND show a +/- delta badge vs the original simulation value (e.g., "62,450 PSI (+2,100)")

### Error bands & uncertainty display
- Shaded semi-transparent fill between +/- curves, with dashed boundary lines at the extremes
- Default variation: +/- 0.3 grains of charge weight (represents typical hand-loading precision)
- Error bands visible by default on P/V charts, with a toggle to hide them
- Bands are dynamic: when sensitivity sliders change, error bands recalculate around the new center value

### Chart style & interactivity
- All charts support: hover tooltip with crosshair, click-drag to zoom into a region, double-click to reset zoom
- Color coding by physics domain: blue for pressure/velocity, orange for combustion/burn, red for temperature/heat, green for energy/recoil
- Each chart tile offers both PNG image download and CSV data export (per-chart, not just global)

### Claude's Discretion
- Synchronized crosshair across time-domain charts (Claude decides based on Recharts feasibility)
- Exact grid column count and responsive breakpoints
- Modal sizing and animation
- Slider step increments and ranges
- Chart axis formatting and tick density
- Dark mode palette specifics within the domain color scheme

</decisions>

<specifics>
## Specific Ideas

- Delta badges on summary cards should show direction clearly (green for favorable, red/amber for approaching limits)
- Error bands use the same domain color as the main curve but at reduced opacity
- Side panel for sliders should not obscure the chart grid — push content or overlay with enough transparency

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-extended-simulation-charts*
*Context gathered: 2026-02-21*
