# Phase 11: Foundation and Data Expansion - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Schema extensions (5 cartridge fields + 4 bullet fields + velocity-banded BC fields), shared geometry engine library for 2D/3D viewers, 500+ bullet seed data from manufacturer specs, and npm dependency installation (React Three Fiber v8, drei v9, Three.js, PapaParse). This phase delivers the foundation that Phases 12-14 depend on.

</domain>

<decisions>
## Implementation Decisions

### Bullet Data Sourcing
- Prioritize match bullets first: Sierra MatchKing, Berger Hybrid/Target, Hornady ELD-M, Lapua Scenar
- Then expand to broader coverage (hunting, varmint) from Barnes, Speer, Nosler
- Leave BC G7 null when manufacturer doesn't publish it — do NOT estimate from G1
- Store all 3 velocity-banded G1 BCs for Sierra bullets (bc_g1_high, bc_g1_mid, bc_g1_low fields)
- Store velocity threshold values alongside BCs (bc_g1_high_vel, bc_g1_mid_vel) so users know which band applies at what speed
- Estimate bullet length_mm from weight + caliber when not published, mark estimated fields with data_source flag
- Include popular discontinued bullets (Sierra 168gr HPBT #2200, etc.) since reloaders still have stockpiles

### Geometry Engine Design
- Full estimated silhouette for visual appeal, but dimension labels only on known values
- Estimated geometry shown slightly transparent or dashed to signal uncertainty
- Type-aware ogive profiles: different curves per bullet_type (tangent for "match", secant for "vld", flat-nose for "hunting", etc.)
- Single shared geometry engine (cartridge-geometry.ts) outputting both SVG path data and Three.js Vector2 arrays — guarantees 2D and 3D match exactly
- No powder charge visualization in geometry engine — keep it pure component geometry

### Schema Field Defaults
- Backfill all 53 existing cartridges with estimated values for new fields (shoulder_angle, neck_length, body_length, rim_thickness, case_type) from CIP/SAAMI reference data
- case_type enum: rimless, belted, rimmed, rebated, semi_rimmed, straight_wall (6 values)
- ogive_type enum: tangent, secant, hybrid, flat_nose, round_nose, spitzer (6 values)
- New dimension fields boost quality_score when filled — incentivizes data completeness

### Seed Data Organization
- JSON files organized by manufacturer: sierra.json, hornady.json, berger.json, nosler.json, lapua.json, barnes.json, speer.json
- Replace existing 127 bullets with new comprehensive seed data (overwrites, ensures consistency)
- Startup seed pattern (same as current) — check threshold, import if needed

### Claude's Discretion
- Velocity band range design for BC fields (Sierra's own ranges vs standardized)
- Data source labeling strategy (tiered by field confidence: 'manufacturer' for published, 'estimated' for derived)
- Seed version tracking approach (version string vs hash-based)
- Exact estimation formulas for shoulder_angle, neck_length, body_length from existing cartridge dimensions
- Bullet length estimation formula from weight + caliber + typical density

</decisions>

<specifics>
## Specific Ideas

- Sierra publishes 3 velocity-banded G1 BCs per bullet — this is unique to Sierra and needs dedicated schema support
- Berger Quick Reference Sheets (PDF) have the most detailed bullet dimension data (OAL, base-to-ogive, bearing surface, G1/G7)
- Existing 53 cartridges already have case_length_mm, overall_length_mm, bore_diameter_mm, groove_diameter_mm, shoulder_diameter_mm, neck_diameter_mm, base_diameter_mm, rim_diameter_mm — the 5 new fields are supplementary drawing precision fields
- The geometry engine is a pure TypeScript module (lib/cartridge-geometry.ts, lib/bullet-geometry.ts) with zero framework dependencies — testable with simple unit tests

</specifics>

<deferred>
## Deferred Ideas

- Weekly cron job to fetch/update bullet data from external sources — future phase (requires scheduled task infrastructure, data source API design)
- CSV column mapping UI for flexible file format support — deferred to v1.4
- Applied Ballistics Doppler-verified G7 BCs — proprietary, cannot use without license

</deferred>

---

*Phase: 11-foundation-and-data-expansion*
*Context gathered: 2026-02-27*
