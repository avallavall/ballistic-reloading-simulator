# Phase 10: Tech Debt Cleanup - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Resolve 4 non-blocking tech debt items from the v1.2 audit: QualityBadge in ComponentPicker modals, caliber_family migration backfill fix, extended bullet table columns, and extended cartridge table columns. No new features or capabilities.

</domain>

<decisions>
## Implementation Decisions

### Picker badge display
- QualityBadge appears inline after component name on all 3 picker types (powder, bullet, cartridge)
- Show color dot + numeric score (not dot-only)
- Include hover tooltip with score breakdown (same QualityBadge component as list pages)
- No data source label in pickers — keep rows minimal
- **Powder picker rows:** Name + manufacturer + badge (e.g., "Varget · Hodgdon 🟢 85")
- **Bullet picker rows:** Name + caliber + weight + badge (e.g., "Sierra MatchKing .308 168gr 🟢 85")
- **Cartridge picker rows:** Name + badge only (e.g., ".308 Winchester 🟢 88")

### Bullets table extended columns
- Add 4 new columns: model_number, bullet_type, base_type, length_mm
- Column order: Name → model_number → bullet_type → base_type → length_mm → weight → diameter → BC → quality
- bullet_type and base_type displayed as small colored badge pills (e.g., blue for "Match", green for "Hunting")
- Horizontal scroll on narrow screens (no hidden columns)

### Cartridges table extended columns
- Add columns: parent_cartridge_name, case_capacity_grains, case_length_mm, max_oal_mm, neck_diameter_mm, bore_diameter_mm, groove_diameter_mm
- Column order: Name → parent_cartridge → case_capacity → dimensions (case length, OAL, neck dia) → bore/groove → max_pressure → quality
- Units displayed in column headers only (e.g., "Case Length (mm)"), not repeated in cell values
- Horizontal scroll on narrow screens (consistent with bullets table)

### Null/missing data handling
- All null/missing values display as em dash "—" in muted gray (text-gray-500)
- Badge-type columns (bullet_type, base_type) show em dash when null, not a gray "Unknown" badge
- Apply this convention retroactively to ALL existing nullable columns across all component tables (e.g., bc_g7 on bullets)
- Create a shared utility or component for consistent null display

### Claude's Discretion
- caliber_family backfill migration implementation details (use groove_diameter_mm matching live endpoint logic)
- Exact badge color palette for bullet_type and base_type values
- Responsive breakpoints for horizontal scroll trigger
- Shared null display utility implementation approach (helper function vs wrapper component)

</decisions>

<specifics>
## Specific Ideas

- Picker row examples the user confirmed:
  - Powder: "Varget · Hodgdon 🟢 85"
  - Bullet: "Sierra MatchKing .308 168gr 🟢 85"
  - Cartridge: ".308 Winchester 🟢 88"
- Bullet type/base badges should be "small colored pills" — scannable at a glance
- Em dash in muted gray for nulls is the project-wide standard going forward

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-tech-debt-cleanup*
*Context gathered: 2026-02-24*
