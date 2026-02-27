# Feature Landscape: Data Expansion + Visual Viewers (v1.3)

**Domain:** Bullet data expansion, community contribution, 2D SVG technical drawings, 3D parametric cartridge viewer
**Researched:** 2026-02-27

---

## Table Stakes

Features users expect when a ballistics simulator claims to have "technical drawings" and "expanded databases." Missing = feature feels broken or half-baked.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| 2D cartridge cross-section with dimension labels | GRT ships this as a core feature in expert mode. Every CIP/SAAMI spec document includes dimensioned drawings. Users expect to see their cartridge's profile with rim, base, shoulder, neck, and OAL labeled. | Medium | Cartridge model (shoulder_diameter_mm, neck_diameter_mm, base_diameter_mm, rim_diameter_mm, case_length_mm, overall_length_mm already exist) | Pure SVG from existing data. No new DB fields required for basic version. Missing: shoulder_angle, neck_length_mm, body_taper angle. |
| Bullet database with 300+ entries covering all popular calibers | At 127 bullets we cover core match/target bullets. Users loading hunting or mil-spec ammo will find gaps. ShootForum DB has 3900+ entries, QuickLoad ships 2500+ projectiles. 300+ is minimum credibility. | Medium | Bullet model (all needed fields exist: weight_grains, diameter_mm, length_mm, bc_g1, bc_g7, sectional_density, material, bullet_type, base_type, model_number) | Data compilation is the bottleneck, not code. Public specs from Sierra, Hornady, Berger, Nosler, Lapua, Barnes, Speer, Nosler cover 300+ easily. |
| Caliber-scoped parametric search | Current parametric search iterates ALL powders regardless of caliber appropriateness. Searching .223 Rem powders should not test H1000 (magnum powder). Users expect the search to be caliber-aware. | Low | Existing ParametricSearchRequest already requires cartridge_id. Need burn_rate_relative filtering logic on backend. | Add min/max burn_rate_relative bounds per cartridge family, or filter powders where burn_rate_relative falls within a configurable window. |
| Browser-based CSV/JSON upload for bullets | Batch import endpoints exist (POST /bullets/import) but have no frontend UI. Users must use curl or API clients. A basic file upload dialog is table stakes for any "import" feature. | Low | Existing batch import endpoint for bullets + cartridges | File input + preview table + collision handling dialog. Pattern established by GRT powder import UI. |
| Dimension labels on 2D drawings are accurate to stored data | If dimensions shown on the drawing don't match the actual cartridge record, trust is destroyed. Every label must pull from the Cartridge model, not hardcoded. | Low | Cartridge model fields | Binding SVG text elements to cartridge object properties. |
| 3D model responds to zoom/rotate/pan | Any 3D viewer that cannot be rotated is useless. This is the absolute baseline for browser 3D. | Low | React Three Fiber + OrbitControls from @react-three/drei | OrbitControls is a single component from drei. |

## Differentiators

Features that set the product apart from GRT and other tools. Not expected, but valued.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| 3D parametric cartridge model generated from DB dimensions | GRT shows a 2D CIP drawing. No reloading tool offers interactive 3D. This is a visual differentiator. The cartridge shape is generated procedurally from case_length, base_diameter, shoulder_diameter, neck_diameter, bore_diameter, OAL, and bullet length -- not a pre-made mesh. | High | Cartridge + Bullet DB dimensions, @react-three/fiber v8 (React 18 compat), @react-three/drei, Three.js LatheGeometry | Use LatheGeometry: define 2D profile from DB dimensions, revolve around Y-axis. Case body = cylinder tapering to shoulder, then neck. Bullet = ogive curve (tangent ogive or secant). Half-section cutaway shows internal powder volume. 64 segments is visually smooth. |
| 2D chamber cross-section (Tab 2) | Show the cartridge seated inside a chamber with headspace gap, freebore/throat, and leade angle visible. Helps users understand cartridge-to-chamber fit. GRT has this in expert mode. | Medium | Cartridge dimensions + Rifle model (chamber_volume_mm3). Missing: freebore_mm, throat_angle_deg, leade_mm on Rifle model. | Requires adding 3-4 optional dimension fields to Rifle model. Can interpolate defaults from cartridge family if not provided. |
| 2D full assembly with harmonics overlay (Tab 3) | Show cartridge + barrel section with OBT node positions marked. Connects the harmonics analysis to a visual representation. No existing tool does this in a web browser. | Medium-High | Harmonics calculation (barrel_frequency_hz, optimal_barrel_times already computed), Rifle barrel_length_mm | Draw barrel as rectangle, mark OBT node positions along barrel length. Overlay muzzle deflection amplitude. Needs the harmonics result data to be available alongside the drawing. |
| Community JSON contribution format | GRT's killer advantage is crowdsourced data. Defining a clear, validated JSON schema for bullet/cartridge contributions enables community growth. | Low | JSON Schema definition, validation endpoint | Define a .json contribution format with required/optional fields and validation rules. Users download template, fill in, upload. Lower friction than raw CRUD. |
| Quality badge on contributed data | Differentiate manufacturer-sourced data (green) from community-contributed data (yellow) from estimated data (red). Already have quality_score system -- extend to community contributions. | Low | Existing quality_score + data_source fields on Bullet/Cartridge models | data_source="community" scores lower than "manufacturer" but higher than "estimated". |
| Bullet profile shape in 2D SVG | Show the bullet's ogive profile: flat base vs boat tail, tangent ogive vs secant ogive, polymer tip. Derived from base_type and bullet_type fields + diameter_mm and length_mm. | Medium | Bullet model fields (base_type, bullet_type, diameter_mm, length_mm). Missing: ogive_radius, meplat_diameter, boat_tail_angle, bearing_surface_mm. | Can approximate from base_type enum. For precise rendering, need 4-5 additional optional dimension fields on Bullet model. |
| Interactive dimension editing on 3D model | Click a dimension on the 3D model, type a new value, see the model update in real-time. "What if the neck was 0.5mm longer?" | High | 3D model + state management for dimension overrides | Impressive demo feature but niche utility. Defer unless easy. |
| Cutaway/cross-section mode in 3D | Show the cartridge cut in half to reveal powder charge volume, primer pocket, and bullet seating. | Medium | 3D model + clipping plane in Three.js | Three.js clipping planes are well-documented. Visual impact is high. |
| CSV import with column mapping UI | Upload any CSV and map columns to fields (weight, diameter, BC, etc.) via drag-and-drop or dropdowns. Handles manufacturer CSVs that all have different formats. | Medium | File upload + mapping logic + preview | Better UX than strict format requirement. Adds complexity. |

## Anti-Features

Features to explicitly NOT build in v1.3.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full CAD-quality 3D model with thread detail and primer flash hole | Massive complexity for zero simulation value. A parametric approximation is sufficient for visualization. Users doing CAD work use SolidWorks/Fusion. | Smooth parametric approximation from DB dimensions. Omit microscale features (extractor groove, primer flash hole geometry). |
| Pre-built GLTF/OBJ mesh files per cartridge | 53 cartridges times multiple model formats = massive asset management overhead. Models become stale when dimensions change. | Generate procedurally from DB dimensions every render. LatheGeometry is fast enough (<5ms). |
| Scraping manufacturer websites for bullet data | Legal risk, brittle (sites change layouts), and unnecessary. Manufacturer specs are publicly listed on product pages and can be manually compiled. | Compile bullet data manually from public spec pages and PDF catalogs. Store provenance. |
| Authentication/user accounts for community contributions | Premature. No community exists yet. Auth adds login friction. | Accept contributions via JSON upload with optional contributor_name field. Add auth later when abuse becomes a concern. |
| Real-time collaborative data editing | Over-engineering for a data contribution workflow. | Submit -> review -> merge workflow (manual or automated validation). |
| External ballistics trajectory in 3D | Different physics domain entirely. Muzzle velocity + BC is the handoff point to external tools like Applied Ballistics. | Provide muzzle velocity + BC for users to plug into external ballistics calculators. |
| Wildcat cartridge designer | Explicitly listed as out of scope in PROJECT.md. Complex liability issues. | Focus on SAAMI/CIP standardized cartridges only. |
| Bullet ogive profile from BC reverse-engineering | BC does not uniquely determine shape. Two bullets with same BC can have different ogive profiles. | Use approximate profiles from base_type + bullet_type enums. Accept optional ogive_radius from contributors. |

## Feature Dependencies

```
Cartridge DB dimensions ──> 2D SVG cross-section (Tab 1)
                       ──> 2D Chamber drawing (Tab 2) [+ Rifle dimension fields]
                       ──> 3D parametric model

Bullet DB dimensions ──> 3D parametric model (bullet portion)
                    ──> 2D bullet profile SVG

Harmonics calculation ──> 2D full assembly + harmonics (Tab 3)
                     ──> 3D assembly view (future)

Batch import endpoints ──> Browser upload UI (frontend only)

Bullet data expansion ──> Caliber-scoped parametric search (more bullets to search against)

Community JSON format ──> Browser upload UI
                     ──> Quality badge system (data_source = "community")
```

Key ordering constraints:
1. Cartridge dimension fields must be populated before 2D/3D viewers are useful
2. Bullet data expansion can proceed in parallel with viewer development
3. Community contribution format should be defined before building the upload UI
4. Caliber-scoped search is backend-only and independent of viewers

## Detailed Feature Analysis

### 1. Bullet Database Expansion (127 -> 500+)

**Data sources (by priority):**

| Source | Bullets Available | Data Quality | Effort |
|--------|-------------------|-------------|--------|
| Berger Quick Reference Sheets (PDF) | ~150 bullets | HIGH - includes OAL, base-to-ogive, bearing surface, G1/G7 BC | Medium - PDF parsing or manual entry |
| Sierra Bullets BC page (web) | ~200 bullets | HIGH - weight, diameter, BC G1 (velocity-banded), some G7 | Medium - manual compilation |
| Hornady BC page (web) | ~300 bullets | HIGH - weight, diameter, G1/G7 BC at Mach 2.25 | Medium - manual compilation |
| Nosler product catalog (web) | ~150 bullets | MEDIUM - weight, diameter, BC G1, limited G7 | Medium - manual compilation |
| Lapua product pages (web) | ~80 bullets | HIGH - includes length, BC G1/G7 | Low - fewer products |
| Barnes product pages (web) | ~100 bullets | MEDIUM - weight, diameter, BC G1 | Medium |
| Speer product pages (web) | ~100 bullets | MEDIUM - weight, diameter, BC G1 | Medium |
| ShootForum/AccurateShooter DB | 3900+ bullets | MEDIUM - community-measured, may differ from manufacturer claims | Medium - if scrapeable; LOW confidence on format accessibility |
| Applied Ballistics data (paid) | ~800 bullets | VERY HIGH - Doppler-verified G7 BCs | N/A - proprietary, cannot use without license |

**Recommendation:** Start with the 5 major match bullet manufacturers (Sierra, Hornady, Berger, Nosler, Lapua) from their public specification pages. This gets us to 500+ with HIGH confidence data. Each manufacturer publishes weight, diameter, BC G1, and often BC G7 on their product pages. Manual compilation into our JSON import format takes ~2-3 days for 400 bullets.

**Fields available per manufacturer:**

| Field | Sierra | Hornady | Berger | Nosler | Lapua |
|-------|--------|---------|--------|--------|-------|
| weight_grains | Yes | Yes | Yes | Yes | Yes |
| diameter_mm | Yes | Yes | Yes | Yes | Yes |
| length_mm | Partial | Partial | Yes (OAL) | Partial | Yes |
| bc_g1 | Yes (3 ranges) | Yes | Yes | Yes | Yes |
| bc_g7 | Via Litz | Yes | Yes | Partial | Yes |
| sectional_density | Computable | Computable | Yes | Computable | Computable |
| model_number | Yes | Yes | Yes | Yes | Yes |
| bullet_type | Yes | Yes | Yes | Yes | Yes |
| base_type | Inferable | Yes | Yes | Inferable | Yes |

**Confidence:** HIGH - manufacturer public specs are authoritative for weight, diameter, and BC.

### 2. Community JSON Contribution Format

**What GRT does:** Users fire loads over a chronograph, then submit velocity data + load details through GRT Lab (a plugin). The GRT team processes submissions, reverse-engineers powder parameters, and updates the database. 35,000 registered users, 28,000 active on Discord. Quality indicators (red/yellow/green) reflect submission volume.

**What we should do (simpler):** Accept bullet and cartridge data contributions in a defined JSON format. No reverse-engineering needed (that's powder models, a different problem). Bullet/cartridge specs are factual data from manufacturers, not derived models.

**Proposed JSON contribution schema for bullets:**
```json
{
  "$schema": "bullet-contribution-v1",
  "contributor": "optional-name",
  "source_url": "https://sierrabullets.com/...",
  "bullets": [
    {
      "name": "Sierra 175gr TMK .308",
      "manufacturer": "Sierra",
      "model_number": "7475",
      "weight_grains": 175,
      "diameter_mm": 7.82,
      "length_mm": 33.5,
      "bc_g1": 0.520,
      "bc_g7": 0.265,
      "material": "copper",
      "bullet_type": "match",
      "base_type": "polymer_tip_boat_tail"
    }
  ]
}
```

**Validation rules:**
- weight_grains: 10-800 (physical bounds)
- diameter_mm: 4.0-15.0 (covers .17 cal through .585 Nyati)
- bc_g1: 0.050-1.200 (physical bounds)
- bc_g7: 0.025-0.600 (physical bounds)
- length_mm: 5.0-80.0
- manufacturer: non-empty string
- Duplicate detection: match on manufacturer + model_number, or manufacturer + weight_grains + diameter_mm

**Confidence:** HIGH - we already have the batch import endpoint and validation schemas. The contribution format is a thin wrapper.

### 3. Browser Upload UI (CSV/JSON)

**Current state:** Batch import endpoints exist for powders (POST /powders/import), bullets (POST /bullets/import), and cartridges (POST /cartridges/import) with collision handling (skip/overwrite query param). No frontend UI exists -- users must use curl or API clients.

**What to build:**
1. File input accepting .json and .csv files
2. Preview table showing parsed rows with validation status per row
3. Collision detection: show which records already exist (by name or model_number)
4. Action buttons: Import All, Import New Only, Cancel
5. Results summary: X created, Y skipped, Z errors

**CSV handling:** For CSV, need column mapping. Two options:
- **Strict format:** Require exact column headers matching our field names. Low effort, inflexible.
- **Column mapper UI:** Let user map CSV columns to fields via dropdowns. Medium effort, handles any format.

**Recommendation:** Start with strict format + JSON upload. CSV column mapping is a v1.4 enhancement.

**Confidence:** HIGH - pattern already established with GRT powder import.

### 4. Caliber-Scoped Parametric Search

**Current behavior:** ParametricSearchRequest takes rifle_id, bullet_id, cartridge_id. The endpoint iterates ALL powders in the database, simulating each one. With 208 powders, this takes significant time and includes obviously inappropriate powders (e.g., testing pistol powder H110 for .300 Win Mag).

**What to change:** Filter powders by burn_rate_relative range before simulation. Each cartridge family has a "sweet spot" burn rate range:

| Cartridge Family | Appropriate Burn Rate Range | Example Powders |
|------------------|-----------------------------|-----------------|
| .223 Rem class | 50-85 | H322, H335, Varget, N135 |
| .308 Win class | 75-110 | IMR 4064, Varget, N140, N150, H4350 |
| .30-06 class | 85-115 | IMR 4350, H4350, N160 |
| .300 WM class | 100-130 | H4831SC, Retumbo, H1000, N570 |

**Implementation:** Add optional min_burn_rate / max_burn_rate fields to ParametricSearchRequest (or auto-derive from cartridge_id's case_capacity). Larger case capacity = slower burn rate range. A simple linear mapping from case_capacity_grains_h2o to burn_rate_relative range would work for 90% of cases.

**Confidence:** HIGH - straightforward filter logic.

### 5. 2D SVG Technical Drawings (3 Tabs)

**Tab 1: Cartridge Cross-Section**

**What GRT shows:** Auto-generated CIP-style dimensioned drawing showing the cartridge profile in cross-section. Dimensions include overall length, case length, neck diameter, shoulder diameter, base diameter, rim diameter, and bore/groove diameter. Lines with arrows show each dimension.

**What we have in DB already:**
- case_length_mm, overall_length_mm: define the horizontal extent
- bore_diameter_mm, groove_diameter_mm: define the bore
- neck_diameter_mm, shoulder_diameter_mm, base_diameter_mm, rim_diameter_mm: define the case profile
- Bullet: diameter_mm, length_mm: define the bullet portion

**What we're missing for precise drawing:**
- shoulder_angle_deg (can estimate from shoulder_diameter, neck_diameter, and case proportions)
- neck_length_mm (can estimate as ~1 caliber from bore_diameter_mm)
- body_taper_per_inch (usually small, 0.010-0.020")
- rim_thickness_mm (typically 1.0-1.5mm for rimless, larger for belted magnums)

**Recommendation:** Estimate missing dimensions from existing data for v1.3. Add optional fields to Cartridge model for precision. The SVG should:
- Draw half-section profile (one side of centerline, mirrored)
- Label all known dimensions with arrow leaders
- Color-code: brass case in gold/yellow, bullet in copper/orange, powder fill in grey
- Scale to viewport, maintain aspect ratio

**Implementation:** React component generating inline SVG. Each cartridge dimension maps to SVG path coordinates. Use viewBox for scaling. Text elements positioned along dimension lines.

**Tab 2: Cartridge in Chamber**

Show cartridge seated in chamber with:
- Chamber walls (steel grey)
- Headspace gap
- Freebore/throat region
- Bullet engagement with rifling (leade)
- Barrel bore continuing beyond

**Missing data on Rifle model:** freebore_mm, throat_angle_deg. These can be estimated from cartridge_id's parent cartridge specs or defaulted to CIP standard values (freebore ~0.5-2mm depending on cartridge).

**Tab 3: Full Assembly with Harmonics**

Show:
- Cartridge in chamber
- Full barrel length (scaled)
- OBT node positions marked along barrel
- Muzzle deflection amplitude at each node
- Current barrel time position (from latest simulation)

**Requires:** A recent simulation result to overlay. When no simulation exists, show the barrel with OBT nodes only (computed from barrel dimensions + material properties).

**Confidence:** MEDIUM - SVG generation from data is straightforward, but the dimension estimation for missing fields introduces approximation. Users may notice inaccuracies if shoulder angle is estimated poorly.

### 6. 3D Parametric Cartridge Model

**Technology:** React Three Fiber v8 (compatible with React 18.3.1, our current version). @react-three/drei for OrbitControls, Environment, and helpers.

**CRITICAL: Version compatibility.** @react-three/fiber v9 requires React 19. We must use v8. @react-three/drei v9.x pairs with fiber v8.

**Approach: LatheGeometry**

Ammunition cartridges are bodies of revolution -- rotationally symmetric around the bore axis. This maps perfectly to Three.js LatheGeometry, which takes an array of 2D points and revolves them around the Y-axis.

**Profile generation algorithm:**
1. Start at base center (y=0, x=0)
2. Rim: horizontal line to rim_diameter/2, vertical up rim_thickness
3. Extractor groove: small inward step (estimated)
4. Base: out to base_diameter/2
5. Body: gradual taper up to shoulder_diameter/2 over body_length
6. Shoulder: angled transition from shoulder_diameter/2 to neck_diameter/2
7. Neck: vertical cylinder at neck_diameter/2 for neck_length
8. Bullet base: transition from neck_diameter/2 to bore_diameter/2 (seating)
9. Bullet body: cylinder at diameter_mm/2 for bearing_surface
10. Ogive: curve from diameter_mm/2 to meplat (tip) using tangent ogive formula
11. Tip: close to 0 (or meplat diameter for hollow point)

Each segment is an array of Vector2 points. Total: ~50-80 points for a smooth profile.

**Materials:**
- Case body: MeshStandardMaterial with brass color (#B5A642) and metalness=0.7
- Bullet jacket: MeshStandardMaterial with copper color (#B87333) and metalness=0.6
- Bullet tip (if polymer): MeshStandardMaterial with red/green color and metalness=0.1
- Primer: MeshStandardMaterial with brass, positioned as separate geometry at base

**Features:**
- OrbitControls for rotate/zoom/pan
- Half-section cutaway (Three.js clipping plane along XZ plane)
- Environment lighting (drei's Environment component with "studio" preset)
- Dimension annotations (drei's Html component for 3D-positioned labels)
- Toggle between full view and cutaway view

**Performance:** LatheGeometry with 80 profile points and 64 segments = 5,120 faces. Trivial for any GPU. Sub-5ms generation time.

**Confidence:** MEDIUM - the geometry approach is proven (LatheGeometry is ideal for revolution bodies), but approximating bullet ogive profiles from limited data (only length_mm and base_type) will produce generic shapes rather than precise manufacturer profiles.

## MVP Recommendation

**Phase 1 (Parallel - Data):**
1. Bullet database expansion to 500+ (compile from manufacturer spec pages)
2. Community JSON contribution format definition
3. Browser upload UI for JSON import (bullets + cartridges)
4. Caliber-scoped parametric search backend filter

**Phase 2 (Sequential - 2D Viewers):**
5. 2D SVG cartridge cross-section with labeled dimensions (Tab 1)
6. 2D cartridge-in-chamber drawing (Tab 2)
7. 2D full assembly with harmonics overlay (Tab 3)

**Phase 3 (Sequential - 3D Viewer):**
8. 3D parametric cartridge model with LatheGeometry
9. Cutaway/half-section mode
10. Dimension annotations in 3D

**Defer to v1.4:**
- CSV column mapping UI (use strict format for now)
- Interactive dimension editing on 3D model
- Bullet profile shape in 2D SVG (needs additional DB fields)
- Chamber dimension fields on Rifle model (freebore_mm, throat_angle_deg)

## Schema Changes Required

### Cartridge Model (optional new fields for drawing precision)

| Field | Type | Purpose | Default Strategy |
|-------|------|---------|-----------------|
| shoulder_angle_deg | Float, nullable | Angle of shoulder taper | Estimate from shoulder/neck diameter ratio |
| neck_length_mm | Float, nullable | Length of neck section | Estimate as ~1x bore_diameter_mm |
| body_length_mm | Float, nullable | Length from base to shoulder | case_length - neck_length - shoulder_length |
| rim_thickness_mm | Float, nullable | Thickness of rim | Default 1.27mm (rimless) or 1.5mm (belted) |
| case_type | String(20), nullable | "rimless", "belted", "rimmed", "rebated" | Infer from rim_diameter vs base_diameter |

### Bullet Model (optional new fields for 3D rendering)

| Field | Type | Purpose | Default Strategy |
|-------|------|---------|-----------------|
| bearing_surface_mm | Float, nullable | Length of full-diameter cylindrical section | Estimate from length_mm and base_type |
| boat_tail_length_mm | Float, nullable | Length of boat tail taper | Estimate as ~0.15 * length_mm for BT types |
| meplat_diameter_mm | Float, nullable | Diameter of bullet tip | 0 for polymer tip, ~0.1 * diameter for HPBT |
| ogive_type | String(20), nullable | "tangent", "secant", "vld", "hybrid" | Map from bullet_type field |

### Rifle Model (optional new fields for chamber drawing)

| Field | Type | Purpose | Default Strategy |
|-------|------|---------|-----------------|
| freebore_mm | Float, nullable | Distance from case mouth to rifling | Default by cartridge family |
| throat_angle_deg | Float, nullable | Angle of the leade/throat | Default 1.5 deg (SAAMI standard) |

**All new fields are nullable** -- drawings degrade gracefully to estimates when precise data is unavailable. Quality_score badge can indicate when a drawing is using estimated dimensions.

## Sources

- [SAAMI Cartridge & Chamber Drawings](https://saami.org/technical-information/cartridge-chamber-drawings/) - Official dimension specifications
- [CIP TDCC Tables](https://www.cip-bobp.org/en/tdcc) - European dimension standards
- [GRT Caliber Database Documentation](https://grtools.de/doku.php?id=en:doku:dbcaliber) - GRT's auto-generated CIP drawings
- [GRT Input Fields](https://www.grtools.de/doku.php?id=grtools%3Aen%3Adoku%3Ainputfields) - Expert mode dimension fields
- [ShootForum Bullet Database](https://www.accurateshooter.com/ballistics/bullet-database-with-2900-projectiles/) - 3900+ bullet entries (free)
- [Berger Quick Reference Sheets](https://bergerbullets.com/pdf/Quick-Reference-Sheets.pdf) - Detailed bullet dimensions
- [Sierra Bullets BC Data](https://sierrabullets.com/load-data/) - Velocity-banded BCs
- [Hornady BC Data](https://www.hornady.com/team-hornady/ballistic-information/) - BC at Mach 2.25 reference
- [Three.js LatheGeometry](https://threejs.org/docs/pages/LatheGeometry.html) - 2D profile revolution geometry
- [React Three Fiber Installation](https://r3f.docs.pmnd.rs/getting-started/installation) - v8 for React 18, v9 for React 19
- [@react-three/fiber npm](https://www.npmjs.com/package/@react-three/fiber) - v9.5.0 latest (requires React 19)
- [@react-three/drei npm](https://www.npmjs.com/package/@react-three/drei) - v10.7.7 latest
- [Wikimedia Cartridge Cross Section SVG](https://commons.wikimedia.org/wiki/File:Cartridge_cross_section.svg) - Reference SVG structure
- [GRT Community Calibration Workflow](https://forum.accurateshooter.com/threads/gathering-data-for-powder-model-development-gordons-reloading-tool.4072119/) - How GRT crowdsources data
- [AccurateShooter Cartridge Diagrams](https://www.accurateshooter.com/technical-articles/cartridgediagrams/) - QuickDesign CIP/SAAMI diagrams
- [XXL-Reloading](https://www.xxlreloading.com/) - 2M+ loads, caliber-scoped search reference
