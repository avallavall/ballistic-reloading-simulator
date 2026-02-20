# Architecture

**Analysis Date:** 2026-02-20

## Pattern Overview

**Overall:** Layered client-server architecture with domain-driven physics engine.

**Key Characteristics:**
- Separation of concerns: physics simulation (core), data access (models), API contracts (schemas)
- Async-first on backend (asyncio + SQLAlchemy AsyncSession)
- Frontend uses React hooks for state management (TanStack Query for server state)
- Physics engine isolated in `app.core` modules with pure numerical solvers
- Database-first design: all runtime configuration stored in PostgreSQL with UUIDs as PKs

## Layers

**Physics Core (`app.core`):**
- Purpose: Execute numerical ballistics simulations independent of HTTP/database
- Location: `backend/app/core/`
- Contains: Thermodynamics (Noble-Abel EOS, Vieille burn rate), internal ballistics (Lagrange pressure), ODE solver (4-variable system), structural analysis (Lamé hoop stress, case expansion, erosion), harmonics (barrel frequency, OCW), heat transfer (Thornhill convective model)
- Depends on: NumPy, SciPy (solve_ivp for ODE integration)
- Used by: Simulation API endpoint (`app.api.simulate`)
- Entry point: `simulate(powder, bullet, cart, rif, ld)` function returns `SimResult` dataclass with pressure/velocity curves, barrel time, structural metrics, harmonics data

**Data Access (`app.models` + `app.db`):**
- Purpose: ORM abstraction and database session management
- Location: `backend/app/models/` (SQLAlchemy ORM), `backend/app/db/session.py` (connection pooling)
- Contains: 7 SQLAlchemy models (Powder, Bullet, Cartridge, Rifle, Load, SimulationResult, + base classes)
- All models use UUID primary keys via `UUIDMixin`
- Uses `AsyncSession` factory for async/await database operations
- Depends on: SQLAlchemy 2.0, asyncpg
- Used by: API endpoints and seed data loader

**API Contracts (`app.schemas`):**
- Purpose: Pydantic v2 request/response validation with physical limit enforcement
- Location: `backend/app/schemas/`
- Contains: Create/Update/Response DTOs for each entity + simulation-specific schemas (SimulationRequest, LadderTestRequest, ParametricSearchRequest)
- Validates min/max values for all physical parameters (e.g., powder charge >= 0.1 grains, <= 100 grains)
- Configures `model_config = {"from_attributes": True}` for ORM→Pydantic conversion
- Used by: All API endpoints for request parsing and response serialization

**REST API (`app.api`):**
- Purpose: HTTP endpoint routing and request coordination
- Location: `backend/app/api/`
- Contains: 7 routers (powders, bullets, cartridges, rifles, loads, simulate, chrono)
- Unified under `/api/v1` prefix via `app.api.router.api_router`
- Each endpoint: dependency-injects `AsyncSession` from `get_db()`
- Used by: FastAPI app in `main.py`
- Rate limiting: `/simulate/*` endpoints rate-limited via slowapi (10/min for direct sim, 5/min for ladder, 3/min for parametric)

**Middleware & Infrastructure:**
- Purpose: Cross-cutting concerns (error handling, rate limiting, timing, CORS)
- Location: `backend/app/middleware.py`, `backend/app/main.py`
- Contains: Global exception handler (returns JSON, not HTML), slowapi limiter keyed by client IP, X-Process-Time-Ms response header, CORS middleware
- Health check: GET `/api/v1/health` verifies DB connectivity

**Frontend Pages (`frontend/src/app`):**
- Purpose: Next.js 14 App Router page components
- Location: `frontend/src/app/`
- Contains: Dashboard (page.tsx), Simulation (simulate/page.tsx), Ladder Test (ladder/page.tsx), CRUD pages for 5 entities (powders, bullets, cartridges, rifles, loads), Parametric Search (powders/search/page.tsx), Powder Comparison (powders/compare/page.tsx)
- Each page: uses `'use client'` directive, imports domain hooks (usePowders, useBullets, etc.)
- Used by: Next.js router

**Frontend Hooks (`frontend/src/hooks`):**
- Purpose: Encapsulate TanStack Query logic for server state management
- Location: `frontend/src/hooks/`
- Contains: usePowders, useBullets, useCartridges, useRifles, useLoads (each with useQuery + create/update/delete mutations), useSimulation, useLadderTest, useParametricSearch
- Pattern: Query hook returns { data, isLoading, error }, mutations return { mutate, isPending }
- Depends on: TanStack Query v5, `app.lib.api` client functions

**Frontend API Client (`frontend/src/lib/api.ts`):**
- Purpose: HTTP client abstraction
- Location: `frontend/src/lib/api.ts`
- Contains: Generic `request<T>()` function, typed wrapper functions for each API endpoint
- Converts HTTP errors to custom `ApiClientError` class
- Returns parsed JSON or throws

**Frontend UI Components (`frontend/src/components`):**
- Purpose: Reusable visual building blocks
- Location: `frontend/src/components/ui/`
- Contains: Badge, Button, Card, Input, Select, Spinner, Table, Tooltip
- Used by: All pages and forms

**Frontend Domain Components (`frontend/src/components/forms`, `charts`, `layout`):**
- Purpose: Feature-specific UI composition
- Location: `frontend/src/components/forms/`, `charts/`, `layout/`
- Contains: SimulationForm, LoadForm, PressureTimeChart, VelocityDistanceChart, HarmonicsChart, AppShell, Header, Sidebar
- Charts use Recharts for rendering

## Data Flow

**Direct Simulation Flow:**

1. User fills SimulationForm (rifle, bullet, powder, charge weight, COAL, seating depth)
2. Form submits → `useSimulation` hook → `runSimulation()` in `api.ts`
3. POST `/api/v1/simulate/direct` (DirectSimulationRequest)
4. Backend: `simulate.py` → `_load_simulation_data()` fetches Powder, Bullet, Rifle, Cartridge from DB
5. Backend: `_make_params()` converts DB units (grains→kg, PSI→Pa, mm→m) to SI
6. Backend: `simulate()` from `core.solver` runs ODE integration, returns SimResult
7. SimResult → SimulationResult ORM record created + stored in DB
8. API response: DirectSimulationResponse with pressure_curve, velocity_curve, barrel_time, structural, harmonics
9. Frontend: useSimulation receives data, components extract and render charts (PSI→MPa, FPS→m/s conversions)

**Ladder Test Flow:**

1. User selects powder, bullet, rifle + charge range (start, end, step)
2. Form submits → `useLadderTest` hook → `runLadderTest()` in `api.ts`
3. POST `/api/v1/simulate/ladder` (LadderTestRequest)
4. Backend: Loop from charge_start to charge_end in steps
5. Each iteration: call `simulate()` with incremented charge
6. Collect velocity, pressure, safety status for each charge
7. API response: LadderTestResponse with list of LadderTestResult (charge, velocity, pressure, safety_level)
8. Frontend: Render two overlaid LineCharts (velocity vs charge, pressure vs charge with SAAMI reference line)

**CRUD Flow (Example: Powders):**

1. GET `/api/v1/powders` → usePowders hook → renders table
2. User clicks Create → opens form dialog
3. POST `/api/v1/powders` (PowderCreate) → creates Powder ORM record, returns PowderResponse
4. useCreatePowder mutation invalidates 'powders' query key → automatic refetch
5. PUT `/api/v1/powders/{id}` → updates record
6. DELETE `/api/v1/powders/{id}` → soft delete or hard delete (check implementation)

**State Management:**

- **Server State (async data):** TanStack Query caches by query key (e.g., ['powders'], ['rifles', id])
- **Client State (UI state):** useState in page components for form visibility, editing mode
- **Unit System State:** useUnits context (metric vs imperial) in layout, consumed by all formatters
- **Simulation State:** useSimulation returns { simulate, result, isLoading, error } - no persistent cache, fresh calculation each time

## Key Abstractions

**Simulation Parameters (Dataclasses):**
- Purpose: Immutable parameter containers for physics engine
- Examples: `PowderParams`, `BulletParams`, `CartridgeParams`, `RifleParams`, `LoadParams` in `core.solver`
- Pattern: Named fields with SI units, no methods - pure data holders
- Used by: `simulate()` function signature to enforce type safety

**SimResult (Dataclass):**
- Purpose: Return value from physics simulation
- Location: `backend/app/core/solver.py`
- Contains: peak_pressure_psi, muzzle_velocity_fps, pressure_curve (list of [time, pressure] tuples), velocity_curve (list of [distance, velocity] tuples), barrel_time_ms, is_safe, warnings, structural (hoop_stress, case_expansion, erosion), harmonics (barrel_freq, obt_nodes, obt_match), recoil metrics
- Pattern: Immutable dataclass, conversion happens at API boundary (caller converts to PSI/FPS)

**ORM→API Pipeline:**
- ORM models (Powder, Bullet, etc.) → `model_dump()` → Pydantic schema → JSON response
- Reverse: JSON request → Pydantic schema validation → `Powder(**schema.model_dump())` → ORM.add()

## Entry Points

**Backend HTTP Server:**
- Location: `backend/app/main.py`
- Triggers: Docker `docker-compose up` or `uvicorn app.main:app --reload`
- Responsibilities: FastAPI app initialization, middleware setup, CORS, router registration, lifespan events (create_all, seed data)

**Frontend Dev Server:**
- Location: `frontend/` (Next.js app)
- Triggers: `npm run dev` or Docker
- Responsibilities: Next.js router, SSR/SSG for pages, client hydration, asset bundling

**Physics Simulation:**
- Entry: `backend/app/core/solver.py` → `simulate(powder, bullet, cart, rif, ld)` function
- Invoked by: `/api/v1/simulate/*` endpoints
- Returns: SimResult with all ballistic data

**Database Seeding:**
- Location: `backend/app/seed/initial_data.py`
- Triggers: On app startup via lifespan context manager
- Creates: 22 default powders, bullets, cartridges, 5 seed rifles

## Error Handling

**Strategy:** Centralized exception handling with JSON responses, validation errors caught at schema layer

**Patterns:**
- HTTPException(status_code, detail) for API errors (404 not found, 400 bad request)
- Global exception handler in middleware catches uncaught exceptions → 500 JSON response with CORS headers
- Pydantic validation failures auto-converted to 422 Unprocessable Entity by FastAPI
- Frontend: ApiClientError custom error class with status + detail fields, thrown by api.request()
- Frontend pages wrap mutations in try/catch, display error toast via UI state

## Cross-Cutting Concerns

**Logging:**
- Backend: Python logging module configured per module (e.g., `logger = logging.getLogger(__name__)`)
- Frontend: console.log for debugging (no structured logging)

**Validation:**
- Backend: Pydantic v2 schemas with Field(gt=min, lt=max) for all numeric inputs
- Example: `powder_charge_grains: float = Field(gt=0.1, lt=100, description="...")`
- Frontend: React Hook Form in SimulationForm with client-side validation

**Authentication:**
- Not implemented; Health endpoint and all CRUD operations are public
- CORS restricts browser requests to localhost:3000 or frontend:3000

**Unit Conversion:**
- Backend stores all calculated results in PSI/FPS (imperial), converts to SI only internally during solver
- Frontend: formatPressure(), formatVelocity() functions convert to user's preferred unit system (metric or imperial)
- Example: result.peak_pressure_psi * 0.00689476 = MPa
