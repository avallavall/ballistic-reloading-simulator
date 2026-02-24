# Phase 5: Import Pipelines and Fixture Data - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship the simulator with comprehensive pre-loaded component databases: 200+ powders from GRT community data, 100-200 bullets from major manufacturers, and 50+ cartridges from CIP/SAAMI standards. Provide batch import endpoints for future data expansion. Frontend display of this data (picker modals, quality badges on all pages) belongs in Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Data Coverage Priorities
- **Calibers**: All popular rifle calibers — .308 Win, 6.5 Creedmoor, .223 Rem, .300 WM plus .270 Win, .30-06, 7mm Rem Mag, .22-250, .243 Win, 6mm Creedmoor, .338 Lapua Mag, and other widely used calibers
- **Bullet types**: Match/precision AND hunting lines — Sierra MatchKing + GameKing, Hornady ELD-M + ELD-X, Berger Target/Hybrid + VLD Hunting, Nosler AccuBond/Partition, Lapua Scenar. Exclude varmint/plinking/FMJ
- **Powders**: Import the full GRT database (600+ powders). Let search/filtering handle discoverability
- **Cartridges**: Claude's discretion on including popular proprietary cartridges (6.5 PRC, .224 Valkyrie, .300 PRC) beyond CIP/SAAMI standardized ones, based on data availability

### Powder Alias Behavior
- Separate records for each alias, linked together (both ADI AR2208 and Hodgdon Varget exist as distinct records with a visible link/badge indicating equivalence)
- Independent simulation parameters per record — link is informational only. Data may differ between aliased powders (different GRT entries, user edits)
- Alias storage approach: Claude's discretion (alias group field vs separate table)
- Alias data: Pre-loaded from GRT known alias mappings during import, PLUS users can manually link powders they know are equivalent

### Import Collision Handling
- Import endpoint accepts a mode parameter: skip, overwrite, or merge — user chooses per import operation
- User-created records (source='manual') are NEVER overwritten. On collision, the imported version gets a renamed name (e.g., "Hodgdon Varget (GRT Import)") so both coexist and the user understands why
- Rename format for colliding imports: Claude's discretion on exact naming pattern
- On fresh Docker boot (first-ever seed): data loads automatically, no manual import needed. Extends current seed behavior with larger dataset

### Data Sourcing Approach
- **Powders**: GRT community data. Claude researches GRT export format (XML) and builds the parser from documentation/samples. User does not have GRT files to provide
- **Bullets**: Claude's discretion on best available sources — compile from manufacturer public catalogs, existing open datasets, or a combination
- **Cartridges**: CIP/SAAMI official tables as the primary source for specs (max pressure, case capacity, bore/groove diameter)
- **Fixture storage**: JSON fixture files committed to the repo under backend/seed/. Version-controlled and auditable, no build-time generation

### Claude's Discretion
- GRT XML parsing approach and field mapping
- Alias storage model (group field vs join table)
- Rename pattern for collision imports
- Bullet data compilation strategy (catalog scraping vs open datasets vs manual)
- Cartridge selection for proprietary/non-SAAMI entries
- Fixture file structure and organization within backend/seed/

</decisions>

<specifics>
## Specific Ideas

- Auto-seed on first Docker boot (extend existing startup lifespan) — user expects the database to be populated immediately
- Bullets should cover both match and hunting lines but NOT varmint/plinking/FMJ — the simulator targets precision reloaders
- When a user's manual record collides with an import, the imported record should have a clearly different name so the user understands why there are two entries

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-import-pipelines-and-fixture-data*
*Context gathered: 2026-02-22*
