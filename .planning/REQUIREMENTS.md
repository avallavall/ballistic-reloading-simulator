# Requirements: Simulador de Balistica v1.2

**Defined:** 2026-02-21
**Core Value:** The most accurate internal ballistics simulation available, validated against published load data, with comprehensive pre-loaded databases so users can simulate immediately without manual data entry.

## v1.2 Requirements

Requirements for v1.2 Component Databases + Search milestone. Each maps to roadmap phases.

### Powder Database

- [x] **PWD-01**: User can batch-import 200+ powders from GRT community database XML files with collision handling (skip/overwrite)
- [x] **PWD-02**: User sees red/yellow/green quality badges on each powder based on GRT Qlty field and data completeness
- [x] **PWD-03**: User can view computed quality score (0-100) with breakdown tooltip showing data completeness and source reliability
- [x] **PWD-04**: Powder records track data source provenance (grt_community, manufacturer, manual, estimated)
- [x] **PWD-05**: Powder aliases are resolved so duplicate entries across markets are linked (e.g., ADI AR2208 = Hodgdon Varget)

### Bullet Database

- [x] **BUL-01**: Simulator ships with 100-200 pre-loaded bullets from major manufacturers (Sierra, Hornady, Berger, Nosler, Lapua) covering .308, 6.5CM, .223, .300WM calibers
- [x] **BUL-02**: Bullet records include manufacturer, model number, weight, diameter, BC (G1/G7), bullet type, and base type
- [x] **BUL-03**: Bullet schema tolerates missing fields (nullable length_mm, bc_g7) with completeness indicators
- [ ] **BUL-04**: User can batch-import bullets from JSON fixture files via scriptable pipeline

### Cartridge Database

- [x] **CRT-01**: Simulator ships with 50+ pre-loaded cartridges with CIP/SAAMI specs (max pressure, case capacity, bore/groove diameter)
- [x] **CRT-02**: Cartridge records include parent cartridge lineage and extended dimensions
- [ ] **CRT-03**: User can batch-import cartridges from JSON fixture files via scriptable pipeline

### Quality System

- [ ] **QLT-01**: All component records display quality/completeness badges (green = well-validated, yellow = estimated, red = sparse data)
- [x] **QLT-02**: Quality scores are automatically recomputed when records are updated via PUT endpoints
- [x] **QLT-03**: Quality scoring uses deterministic formula: data completeness (fields filled) + source reliability tier (manufacturer > GRT community > manual > estimated)

### Search & Filtering

- [x] **SRC-01**: All component list endpoints support server-side pagination (page, size params) with total count
- [x] **SRC-02**: User can fuzzy-search components by name using pg_trgm (handles typos like "hodgon" -> "Hodgdon")
- [x] **SRC-03**: User can filter components by manufacturer, caliber/caliber family, and quality level
- [ ] **SRC-04**: Simulation form replaces flat <Select> dropdowns with searchable picker modals for powder, bullet, and cartridge selection
- [ ] **SRC-05**: Frontend pagination with smooth transitions (TanStack Query keepPreviousData)

### Solver Fix

- [x] **SOL-01**: Solver reads web_thickness per powder from DB instead of hardcoded 0.0004m default, with fallback for legacy records

## v1.3 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Data Expansion

- **EXP-01**: Expand bullet database to 500+ covering all popular calibers
- **EXP-02**: Dedicated bullet/cartridge upload UI (import from CSV/JSON in browser)
- **EXP-03**: Caliber-scoped parametric search optimization (filter compatible powders before simulating)

### Community

- **COM-01**: Community powder model submissions from chrono data
- **COM-02**: Reverse-engineering algorithm (chrono data -> burn parameters)
- **COM-03**: Shared load recipes (publish, browse, filter, rate)

## Out of Scope

| Feature | Reason |
|---------|--------|
| 500+ bullets in v1.2 | Manual compilation is labor-intensive; 100-200 is achievable, expand in v1.3 |
| Elasticsearch for search | pg_trgm handles 750 records trivially; Elasticsearch is disproportionate |
| Client-side table virtualization | Server-side pagination at 50/page eliminates the need |
| Community submission workflow | Requires auth infrastructure not in v1.2 scope |
| Bullet/cartridge upload UI | API endpoints ship in v1.2; browser upload UI deferred to v1.3 |
| QuickLoad file import | Low demand; GRT is primary competitor and data source |
| Automated web scraping for bullet data | Legal concerns; manual compilation from public specs |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PWD-01 | Phase 5 | Complete |
| PWD-02 | Phase 3 | Complete |
| PWD-03 | Phase 3 | Complete |
| PWD-04 | Phase 3 | Complete |
| PWD-05 | Phase 5 | Complete |
| BUL-01 | Phase 5 | Complete |
| BUL-02 | Phase 5 | Complete |
| BUL-03 | Phase 5 | Complete |
| BUL-04 | Phase 5 | Pending |
| CRT-01 | Phase 5 | Complete |
| CRT-02 | Phase 5 | Complete |
| CRT-03 | Phase 5 | Pending |
| QLT-01 | Phase 6 | Pending |
| QLT-02 | Phase 3 | Complete |
| QLT-03 | Phase 3 | Complete |
| SRC-01 | Phase 4 | Complete |
| SRC-02 | Phase 4 | Complete |
| SRC-03 | Phase 4 | Complete |
| SRC-04 | Phase 6 | Pending |
| SRC-05 | Phase 6 | Pending |
| SOL-01 | Phase 3 | Complete |

**Coverage:**
- v1.2 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-02-21*
*Last updated: 2026-02-21 after roadmap creation*
