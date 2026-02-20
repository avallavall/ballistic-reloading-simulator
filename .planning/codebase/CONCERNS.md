# Codebase Concerns

**Analysis Date:** 2026-02-20

## Tech Debt

**Solver Bootstrapping with Z_PRIMER Hack:**
- Issue: Combustion cannot start from Z=0 (stable equilibrium). Code requires manual Z_PRIMER=0.01 initialization to trigger burn rate calculation.
- Files: `backend/app/core/solver.py` (line 41, 235)
- Impact: Makes solver fragile to initial conditions. If Z_PRIMER is removed or changed, simulations fail silently. No automated bootstrapping logic exists.
- Fix approach: Implement pressure-triggered ignition logic that automatically calculates ignition point based on primer specs instead of hardcoded constant.

**Heat Loss Model Calibration Uncertainty:**
- Issue: Thornhill convective heat loss model uses fixed h_coeff=2000 W/m²K default (line 98, solver.py). Empirically tuned but calibration data per cartridge/caliber is missing.
- Files: `backend/app/core/solver.py` (line 98), `backend/app/core/heat_transfer.py` (all functions)
- Impact: Pressure predictions vary significantly by cartridge type. Current model reduces overprediction by 30-50% but no validation against real chronograph data exists. Users cannot override h_coeff per load.
- Fix approach: Add h_coeff as optional parameter in API endpoint, create calibration guide, implement validation against known test cases (see MEMORY.md "Calibration flow" roadmap item).

**Database Seeding at Startup (create_all + seed):**
- Issue: Lifespan uses create_all() as fallback for development (line 37, main.py). Seeds data on every startup (line 42). In production with multiple replicas, this causes race conditions.
- Files: `backend/app/main.py` (lifespan), `backend/app/seed/initial_data.py` (359+)
- Impact: Duplicate seed data if multiple workers start simultaneously. No idempotency check before INSERT. Alembic migrations exist but create_all() is not disabled.
- Fix approach: Mark create_all as dev-only via environment variable. Add constraint checking in seed_initial_data to skip existing records. In production, rely solely on Alembic migrations.

**Frontend Component Complexity - Large Pages:**
- Issue: Several pages exceed 500+ lines with inline state management and forms.
- Files: `frontend/src/app/powders/search/page.tsx` (726 lines), `frontend/src/app/powders/page.tsx` (587 lines), `frontend/src/app/simulate/page.tsx` (546 lines), `frontend/src/app/ladder/page.tsx` (537 lines)
- Impact: Difficult to maintain, test, and reason about data flow. Mixed concerns (UI, forms, API calls, sorting). No component extraction or custom hooks for complex logic.
- Fix approach: Extract filtering/sorting logic into custom hooks. Break pages into smaller sub-components (e.g., SearchTable, FilterPanel, ExpandedRow as separate components). Move form logic to dedicated form components.

**API Error Handling Inconsistency:**
- Issue: Frontend API client catches errors generically (line 50-58, api.ts) but doesn't distinguish between validation errors, rate-limit (429), and server errors. No retry logic for transient failures.
- Files: `frontend/src/lib/api.ts` (request function)
- Impact: Users see generic "HTTP 429" or "HTTP 500" messages. Rate-limited endpoints silently fail with no user guidance. No exponential backoff.
- Fix approach: Create error handler middleware that maps HTTP codes to user messages. Add retry logic with backoff for 429/503. Export specific error types for components to handle (ValidationError, RateLimitError, etc.).

## Known Bugs

**Pressure Overprediction in Some Calibers:**
- Symptoms: Simulated peak pressures 15-25% higher than real-world data in some cartridge/powder combinations (e.g., .223 Rem with fast powders)
- Files: `backend/app/core/solver.py` (4-variable ODE), `backend/app/core/thermodynamics.py` (Noble-Abel)
- Trigger: Occurs with low-density powders and short barrels where heat loss is significant
- Workaround: Reduce charge by 1-2 grains to stay under SAAMI, validate against chronograph data
- Status: Mitigated by Thornhill model but not fully resolved. Documentation recommends real-world validation.

**GRT .propellant File Import Incomplete:**
- Symptoms: Successfully imports powder names but burn_rate_exp and other physics parameters not extracted from GRT format
- Files: `backend/app/core/grt_parser.py`, `backend/app/core/grt_converter.py`
- Trigger: Uploading GRT format .propellant files shows "Import successful" but derived parameters use fallback defaults
- Impact: Imported powders don't reflect GRTools' tuned ballistics; reloading simulator users get different velocity predictions
- Fix approach: Reverse-engineer GRT binary format for burn rate curve parameters or parse GRT XML export format if available.

## Security Considerations

**No Input Sanitization for Powder/Bullet Names:**
- Risk: User-submitted powder names can contain arbitrary strings. If displayed in UI without escaping, potential XSS if frontend isn't careful.
- Files: `backend/app/schemas/powder.py`, `backend/app/api/powders.py` (POST/PUT endpoints)
- Current mitigation: Frontend uses React (auto-escapes by default). No Pydantic sanitizer on backend.
- Recommendations: Add StringConstraints to Pydantic schemas (max_length, pattern validation). Frontend should still escape as defense-in-depth.

**Rate Limiting Bypass via Direct Batch Requests:**
- Risk: Rate limiter applies per-endpoint but doesn't track cumulative API load. Users can spawn multiple concurrent requests to different endpoints to bypass limits.
- Files: `backend/app/middleware.py` (slowapi configuration), `backend/app/main.py` (rate limit setup)
- Current mitigation: Rate limits: 10/min simulate, 5/min ladder, others unlimited
- Recommendations: Implement token bucket per IP address across all endpoints, not just /simulate. Add X-Rate-Limit-* response headers for transparency.

**No HTTPS Enforcement:**
- Risk: CORS_ORIGINS env var allows localhost (development), but production deployments might use HTTP if CORS_ORIGINS not updated.
- Files: `backend/app/main.py` (line 27-28)
- Current mitigation: .env.example doesn't ship production CORS config
- Recommendations: Document production setup. Add logging when CORS_ORIGINS contains http://. Use environment-specific config files.

**Credentials in Docker Compose:**
- Risk: `docker-compose.yml` contains PostgreSQL password in plaintext (balistica_dev_2024)
- Files: `docker-compose.yml` (and CLAUDE.md contains it)
- Current mitigation: .gitignore prevents pushing, but passwords are in docs
- Recommendations: Use .env file instead of docker-compose hardcoding. Update CLAUDE.md to reference .env.example only.

## Performance Bottlenecks

**ODE Integration Tolerance Settings (Tight):**
- Problem: Solver uses rtol=1e-8, atol=1e-10 for RK45 (line 244-245, solver.py). Extremely tight tolerances cause excessive steps and slow integration.
- Files: `backend/app/core/solver.py` (line 237-246)
- Cause: Aims for high accuracy but no performance profiling exists. Most applications need 1e-6/1e-8 at most.
- Improvement path: Profile against reference solutions. Reduce to rtol=1e-6, atol=1e-8. Add h_coeff tuning first (calibration issue), as tighter tolerances mask model inaccuracy.
- Impact: Each simulation ~1-3s. Ladder tests (10+ steps) ~30s+. Could reduce by 30-40% with looser (still accurate) tolerances.

**Parametric Search Iterates All Powders Serially:**
- Problem: POST /simulate/parametric loads all powders from DB and runs sequential simulations (rate limited 3/min).
- Files: `backend/app/api/simulate.py` (parametric endpoint implementation, around line 280+)
- Cause: No query pagination or bulk-insert optimizations. For 50+ powders in DB, response time scales linearly.
- Improvement path: Add powder filtering by burn_rate_relative range before iteration. Cache results. Use async gather() for concurrent simulations if rate limit allows.
- Impact: Future-scales poorly once powder database grows beyond 100 entries.

**Frontend Chart Rendering Re-renders on Every State Change:**
- Problem: PressureTimeChart, VelocityDistanceChart, HarmonicsChart re-render fully on any parent state change.
- Files: `frontend/src/components/charts/PressureTimeChart.tsx`, `frontend/src/components/charts/VelocityDistanceChart.tsx`, `frontend/src/components/charts/HarmonicsChart.tsx`
- Cause: Recharts components not memoized with React.memo(). Simulate page re-renders charts on slider changes.
- Improvement path: Wrap chart components with React.memo(). Use useMemo for data array derivations.
- Impact: Noticeable lag on slower devices (mobile) when adjusting ladder test sliders.

**No Query Result Pagination:**
- Problem: GET /powders, /bullets, /cartridges, /rifles, /loads return full lists (currently ~50-100 items but unbounded).
- Files: `backend/app/api/powders.py`, `backend/app/api/bullets.py`, etc. (line ~16 in each)
- Cause: select(Powder).order_by(name) with no limit/offset
- Improvement path: Add limit/offset query params. Implement cursor-based or offset pagination. Frontend can lazy-load.
- Impact: Not critical now but becomes issue once users accumulate >1000 custom powders/loads.

## Fragile Areas

**Solver ODE System Boundary Conditions:**
- Files: `backend/app/core/solver.py` (rhs function, line 147-195)
- Why fragile: Multiple division-by-zero guards (denom <= 0.0 at line 159, 292) but logic is not fully documented. If form_function returns unexpected values, or free_volume becomes negative, guards clamp to 1e-12 (numerically unstable).
- Safe modification: Add extensive logging and assertions. Create unit tests for each guard condition. Document mathematical assumptions for each ODE state variable.
- Test coverage: test_solver.py covers happy path but lacks edge cases (near-zero volume, extremely high pressures, negative velocity).

**Heat Transfer Temperature Calculation (Circular):**
- Files: `backend/app/core/solver.py` (line 181-190), `backend/app/core/heat_transfer.py` (line 55-82)
- Why fragile: Gas temperature depends on pressure and volume, both of which depend on heat loss Q. If Q_loss > total_energy, effective_energy goes to 0, causing P to drop, which makes T drop incorrectly (feedback loop).
- Safe modification: Add cap: effective_energy = max(total_energy - Q_loss, total_energy * 0.1) to prevent over-correction. Test with extreme heat loss scenarios.
- Test coverage: test_thermodynamics.py doesn't test heat loss feedback loops.

**Structural Calculations Use Fixed Defaults:**
- Files: `backend/app/core/solver.py` (line 82-95: BRASS_E, BRASS_NU, CASE_WALL_THICKNESS_M, etc.)
- Why fragile: All materials assumed to be brass C26000 with fixed dimensions. If real case is aluminum or different alloy, hoop stress calculations are wrong.
- Safe modification: Add material properties to Cartridge model (material, wall_thickness_mm). Pass to structural functions instead of hardcoded.
- Test coverage: test_structural.py only tests nominal case; no material variant tests.

**Harmonics Calculations Assume Fixed Barrel Geometry:**
- Files: `backend/app/core/solver.py` (line 92-95: STEEL_E, BARREL_OUTER_DIAMETER_M), `backend/app/core/harmonics.py`
- Why fragile: Barrel assumed to be 25mm OD steel 4140. Real barrels vary; thin-wall vs thick-wall changes frequencies by 20-40%.
- Safe modification: Add barrel_outer_diameter_mm, barrel_material to Rifle model. Pass to harmonics calculation.
- Test coverage: test_harmonics.py doesn't test diameter variations.

**Frontend Hooks Missing Dependency Arrays:**
- Files: Multiple files in `frontend/src/hooks/` (useSimulation, useLadderTest, useParametricSearch)
- Why fragile: If useEffect or useCallback dependencies incomplete, stale data or infinite loops can occur
- Safe modification: Run ESLint with exhaustive-deps rule enabled. Add unit tests for hook behavior with changing props.

## Scaling Limits

**Database Connection Pool:**
- Current capacity: asyncpg pool size not explicitly configured (defaults to 10)
- Limit: At 50+ concurrent users, pool exhaustion may cause timeouts
- Files: `backend/app/db/session.py`
- Scaling path: Add pool size config (min=5, max=20) via env var. Monitor connection usage. Consider read replicas for GET endpoints.

**Solver Computation Overhead:**
- Current: Each simulation ~1-3s (RK45 integration with tight tolerances)
- Limit: Ladder tests and parametric searches hit rate limits quickly (5-10/min)
- Scaling path: (1) Reduce ODE tolerances (performance concern above). (2) Cache results by load ID. (3) Async processing queue (Celery/RQ).

**Frontend State Management Overhead:**
- Current: TanStack Query caches all CRUD data in-memory
- Limit: 1000+ custom loads cause browser memory pressure
- Scaling path: Implement pagination for CRUD lists. Use IndexedDB for local caching instead of RAM.

**Docker Image Sizes:**
- Current: backend uses python:3.12-slim (good). frontend uses node:20-alpine (good).
- Limit: Not an issue currently but scipy/numpy add ~200MB to backend
- Scaling path: Use multi-stage build if CI/CD times become critical.

## Dependencies at Risk

**scipy 1.15.0 (Critical):**
- Risk: ODE integrator (solve_ivp) is core to entire physics engine. scipy is unmaintained (community support only, no Numfocus backing).
- Impact: If exploit found in scipy, entire ballistics simulation becomes unreliable. No fallback integrator exists.
- Migration plan: Keep scipy updated. Consider alternative: assimulo (actively maintained, same API). Requires benchmarking.

**slowapi 0.1.9 (Rate Limiting):**
- Risk: Small unmaintained package. Rate limiting is security-critical.
- Impact: Bypass vulnerabilities possible. Single-threaded design may not scale.
- Migration plan: Switch to limits library (maintained) or use Nginx rate-limiting at reverse proxy level instead.

**Pydantic v2 (Model Breaking Changes):**
- Risk: v2 has significant API changes. If critical bug found requiring v3, migration painful.
- Impact: Schema validations break. Recommended mitigation: pin version.
- Migration plan: Keep Pydantic updated within v2. Plan v3 migration when released.

## Missing Critical Features

**No Data Export/Import for User Powders:**
- Problem: Custom powders created by users are stuck in database. No way to export for backup or share with others.
- Blocks: Collaborative reloading, backup workflows, migration to other tools
- Fix approach: Add CSV export for Powder/Bullet/Cartridge/Load. Add CSV import with merge logic.

**No Historical Load Tracking:**
- Problem: Users cannot track which loads have been tested, shot, or retired.
- Blocks: Genealogy of load development (progression of charge weights), field testing notes
- Fix approach: Add created_at, updated_at, tested_count fields to Load. Add notes field. Add Audit table for load changes.

**No Ammunition Lot Number Tracking:**
- Problem: Simulations don't capture which specific brass/primer/powder lot was used.
- Blocks: Traceability for safety recalls, consistency analysis across lots
- Fix approach: Add Lot model linked to Powder/Bullet/Cartridge. Store lot_date, quantity_used in Load.

**No Real-World Velocity Matching Workflow:**
- Problem: Parametric search estimates max charge but users have no way to validate against chronograph data.
- Blocks: Calibration loop (shoot, measure, refine simulation model)
- Fix approach: Add /api/v1/chrono endpoint (already exists), but need UI to import CSV and compare predicted vs actual velocity.

## Test Coverage Gaps

**Missing E2E Tests:**
- What's not tested: Full workflow from login (if auth added) through simulate -> export -> results verification
- Files: No /e2e or /integration test directory
- Risk: Critical UI bugs in form submission, chart data binding, export CSV not caught until production
- Priority: High (currently phase 6 incomplete)

**Solver Edge Cases Untested:**
- What's not tested: (1) Near-zero charge weights, (2) Extremely long barrels, (3) Very heavy bullets, (4) Zero bore_length after chamber subtraction
- Files: test_solver.py (421 lines) focuses on .308 Win nominal case
- Risk: Edge cases silently return 0 velocity or crash
- Priority: Medium

**Database Constraints Not Validated:**
- What's not tested: (1) Foreign key cascades (rifle deletes when cartridge deleted?), (2) Duplicate powder names, (3) Load references deleted powder/bullet/rifle
- Files: test_api_integration.py (618 lines) uses SQLite, not PostgreSQL; SQLite FK constraint default OFF
- Risk: Production PostgreSQL behavior differs from test
- Priority: High

**Frontend Form Validation Edge Cases:**
- What's not tested: (1) Non-numeric input to "any" step inputs, (2) Negative seating depth, (3) Charge weight > 200 grains
- Files: Frontend Input components allow step="any" with no min/max validation
- Risk: Invalid data submitted to API, caught by Pydantic but user sees generic error
- Priority: Medium

**Heat Loss Model Calibration Verification:**
- What's not tested: Solver results against known ballistic test cases (e.g., ballistic coefficient tables, published load data)
- Files: No reference data file or test cases
- Risk: Model overpredicts/underpredicts systematically without validation
- Priority: Critical (blocking user trust in results)

---

*Concerns audit: 2026-02-20*
