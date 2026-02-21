# Feature Landscape: Component Databases & Search (v1.2)

**Domain:** Pre-loaded component databases for internal ballistics simulator
**Researched:** 2026-02-21

## Table Stakes

Features users expect from a component database. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Pre-loaded powder database (200+) | Users should not enter thermodynamic params manually. GRT ships with 800+ powders. | Medium | GRT community DB + existing parser handles this. Main work is fixture curation. |
| Pre-loaded bullet database (100-500) | Users should select from known bullets, not enter BC/weight/diameter. | Medium | No API exists for manufacturer data. Manual compilation from spec pages. Start with most popular. |
| Pre-loaded cartridge database (50+) | Cartridge specs (SAAMI pressure, case capacity, bore diameter) are reference data. | Low | CIP/SAAMI specs are well-documented. Fewer records, simpler data. |
| Search by name | "Find Varget" or "168gr HPBT" should work immediately. | Low | pg_trgm fuzzy search on name field. |
| Filter by manufacturer | "Show only Sierra bullets" or "Show only Hodgdon powders". | Low | Simple WHERE clause + dropdown UI. |
| Filter by caliber/diameter | "Show only .308 bullets" groups by caliber_family. | Low | New caliber_family column + B-tree index. |
| Pagination | Cannot render 500 bullets in a flat table without lag. | Low | Server-side offset/limit. 50 per page. |
| Quality/confidence indicators | Users need to know which powder models are well-calibrated vs estimated. | Medium | Quality score algorithm. Green/yellow/red badges. |

## Differentiators

Features that set the product apart from GRT. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Fuzzy/typo-tolerant search | "hodgon" finds "Hodgdon". GRT has exact-match only. | Low | pg_trgm gives this for free. |
| Quality score transparency | GRT does not expose model confidence levels. We show score + breakdown. | Low | quality_detail JSONB with per-component scoring. |
| Batch import with collision handling | Upload GRT .zip, see which powders already exist, choose skip/overwrite. | Low | Already implemented for powders. Extend pattern to bullets/cartridges. |
| Combined search across manufacturers | Search "168gr" returns Sierra, Hornady, Berger, Nosler results together. | Low | pg_trgm on name column spans all manufacturers. |
| Caliber-scoped parametric search | After selecting a cartridge, show only compatible bullets/powders. | Medium | Filter by caliber_family + burn_rate_relative range. |
| Data source provenance | Know if a powder came from GRT community, manufacturer spec, or user entry. | Low | data_source enum column. |

## Anti-Features

Features to explicitly NOT build in v1.2.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| User accounts / auth | No community features yet. Single-user app. Adds auth infrastructure for no benefit. | Defer to community features milestone. |
| Online data sync | Auto-pulling from GRT GitHub adds network dependency, version conflicts, merge complexity. | Manual import via file upload. User controls when data updates. |
| Bullet drag model (multi-BC) | Complex external ballistics feature. Internal ballistics only uses mass/diameter/length. | Store bc_g1 and bc_g7 for external tool export. Do not model drag curves. |
| Community submission workflow | Requires auth, moderation, validation pipeline. Massive scope. | Defer to community features milestone. |
| Real-time collaborative editing | WebSocket infrastructure for a single-user tool. | Not needed. |
| Full-text search with stemming | Component names are identifiers, not documents. Stemming causes false matches. | pg_trgm trigram matching. |

## Feature Dependencies

```
Alembic migration 005 (schema) -> All other features depend on new columns

Pagination service -> Updated list endpoints -> Frontend pagination UI
Search service -> Updated list endpoints -> Frontend search UI
Quality scorer -> Import service -> Seed data loader
Import service -> Bulk import endpoints -> Frontend import UI (already exists for powders)

JSON fixtures -> Seed data loader -> Fresh docker-compose up seeds 750+ records
```

## MVP Recommendation

Prioritize for v1.2:
1. **Schema expansion + migration** -- gates everything else
2. **Paginated search endpoints** -- biggest UX improvement for existing users
3. **Quality scoring + badges** -- differentiator vs GRT
4. **Powder fixtures from GRT community DB** -- 200+ powders using existing parser
5. **Bullet fixtures (100-200 most popular)** -- start with top sellers from Sierra, Hornady, Berger, Nosler, Lapua
6. **Cartridge fixtures (50+)** -- CIP/SAAMI reference data

Defer to v1.3:
- **Full 500+ bullet database** -- data compilation is labor-intensive. Ship 100-200 in v1.2, expand later.
- **Caliber-scoped parametric search** -- optimization of existing parametric search is a separate concern.
- **Batch bullet/cartridge import UI** -- the API endpoints should exist in v1.2, but dedicated upload UI can wait. Seed data covers initial population.

## Sources

- [GRT community databases on GitHub](https://github.com/zen/grt_databases) -- primary powder data source
- [Sierra Bullets load data](https://sierrabullets.com/load-data/) -- bullet specs reference
- [Hodgdon Reloading Data Center](https://hodgdonreloading.com/rldc/) -- powder/cartridge reference data
