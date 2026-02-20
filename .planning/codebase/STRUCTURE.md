# Codebase Structure

**Analysis Date:** 2026-02-20

## Directory Layout

```
simulador_balistica/
├── backend/
│   ├── Dockerfile                    # Python 3.12-slim, uvicorn entry
│   ├── requirements.txt              # FastAPI, SQLAlchemy, scipy, numpy, slowapi
│   ├── alembic.ini                   # Async migration config
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app, lifespan, CORS, routers
│   │   ├── config.py                 # Pydantic Settings for DB URL
│   │   ├── middleware.py             # Global error handler, rate limiting, timing
│   │   ├── core/                     # Physics engine (pure functions, no I/O)
│   │   │   ├── __init__.py
│   │   │   ├── solver.py             # Main ODE integrator, SimResult dataclass
│   │   │   ├── thermodynamics.py     # Noble-Abel, Vieille, form function
│   │   │   ├── internal_ballistics.py # Lagrange pressure, free volume
│   │   │   ├── structural.py         # Hoop stress, case expansion, erosion
│   │   │   ├── harmonics.py          # Barrel frequency, OCW, muzzle deflection
│   │   │   ├── heat_transfer.py      # Thornhill convective model
│   │   │   ├── grt_parser.py         # Parse GRTools .propellant files
│   │   │   └── grt_converter.py      # Convert GRT params to internal format
│   │   ├── models/                   # SQLAlchemy ORM
│   │   │   ├── __init__.py
│   │   │   ├── base.py               # DeclarativeBase, UUIDMixin
│   │   │   ├── powder.py             # Powder table (10 fields)
│   │   │   ├── bullet.py             # Bullet table (9 fields)
│   │   │   ├── cartridge.py          # Cartridge table (8 fields)
│   │   │   ├── rifle.py              # Rifle table (7 fields + FK cartridge_id)
│   │   │   ├── load.py               # Load table (FK powder_id, bullet_id, rifle_id)
│   │   │   └── simulation.py         # SimulationResult table (JSONB curves + metrics)
│   │   ├── schemas/                  # Pydantic v2 request/response DTOs
│   │   │   ├── __init__.py
│   │   │   ├── powder.py             # PowderCreate, PowderUpdate, PowderResponse + GrtImportResult
│   │   │   ├── bullet.py             # BulletCreate, BulletUpdate, BulletResponse
│   │   │   ├── cartridge.py          # CartridgeCreate, CartridgeUpdate, CartridgeResponse
│   │   │   ├── rifle.py              # RifleCreate, RifleUpdate, RifleResponse
│   │   │   ├── load.py               # LoadCreate, LoadUpdate, LoadResponse
│   │   │   └── simulation.py         # SimulationRequest, LadderTestRequest, ParametricSearchRequest/Response
│   │   ├── api/                      # REST endpoint routers
│   │   │   ├── __init__.py
│   │   │   ├── router.py             # APIRouter with /api/v1 prefix, includes all sub-routers
│   │   │   ├── powders.py            # GET/POST/PUT/DELETE /powders + POST /powders/import-grt
│   │   │   ├── bullets.py            # GET/POST/PUT/DELETE /bullets
│   │   │   ├── cartridges.py         # GET/POST/PUT/DELETE /cartridges
│   │   │   ├── rifles.py             # GET/POST/PUT/DELETE /rifles
│   │   │   ├── loads.py              # GET/POST/PUT/DELETE /loads
│   │   │   ├── simulate.py           # POST /simulate (rate 10/min), POST /simulate/direct, POST /simulate/ladder (rate 5/min), POST /simulate/parametric (rate 3/min), GET /simulate/export/{id}
│   │   │   └── chrono.py             # POST /chrono/import (Labradar/MagnetoSpeed CSV)
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── session.py            # AsyncEngine, async_session_factory, get_db() dependency
│   │   │   └── migrations/           # Alembic (async)
│   │   │       ├── env.py            # Alembic config for async
│   │   │       ├── script.py.mako
│   │   │       └── versions/         # Individual migration files
│   │   └── seed/
│   │       ├── __init__.py
│   │       └── initial_data.py       # seed_initial_data() function, 22 powders + bullets + cartridges + 5 rifles
│   └── tests/
│       ├── conftest.py               # Pytest fixtures (async SQLite, seeded DB)
│       ├── test_thermodynamics.py    # 13 tests (Noble-Abel, Vieille, form function)
│       ├── test_solver.py            # 21 tests (ODE integration, curves, overpressure)
│       ├── test_structural.py        # 28 tests (hoop stress, case expansion, erosion)
│       ├── test_harmonics.py         # 17 tests (barrel frequency, OCW, muzzle deflection)
│       ├── test_schema_validation.py # 30 tests (physical limit validation)
│       └── test_api_integration.py   # 18 tests (CRUD endpoints, simulate, ladder, chrono)
├── frontend/
│   ├── Dockerfile                    # Node 20-alpine, next build + next start
│   ├── package.json                  # Next.js, React, TanStack Query, Recharts, Tailwind
│   ├── tsconfig.json                 # TypeScript config with path alias @/* → src/
│   ├── tailwind.config.js            # Tailwind CSS
│   ├── postcss.config.js
│   ├── next.config.js
│   └── src/
│       ├── app/
│       │   ├── layout.tsx            # Root layout (dark mode, Providers, AppShell)
│       │   ├── globals.css           # Global Tailwind styles
│       │   ├── page.tsx              # Dashboard with StatCards
│       │   ├── simulate/
│       │   │   └── page.tsx          # Simulation page (form + results + charts)
│       │   ├── ladder/
│       │   │   └── page.tsx          # Ladder Test page (velocity/pressure vs charge)
│       │   ├── powders/
│       │   │   ├── page.tsx          # Powder CRUD (table + inline edit)
│       │   │   ├── search/
│       │   │   │   └── page.tsx      # Parametric powder search (sortable, expandable rows)
│       │   │   └── compare/
│       │   │       └── page.tsx      # Powder comparison (side-by-side metrics)
│       │   ├── bullets/
│       │   │   └── page.tsx          # Bullet CRUD (table + inline edit)
│       │   ├── cartridges/
│       │   │   └── page.tsx          # Cartridge CRUD (table + inline edit)
│       │   ├── rifles/
│       │   │   └── page.tsx          # Rifle CRUD (table + inline edit)
│       │   └── loads/
│       │       └── page.tsx          # Load CRUD (table + inline edit)
│       ├── components/
│       │   ├── Providers.tsx         # QueryClientProvider wrapper
│       │   ├── ui/
│       │   │   ├── Badge.tsx         # Status badges (green/yellow/red)
│       │   │   ├── Button.tsx        # Styled button with variants
│       │   │   ├── Card.tsx          # Container with header/content
│       │   │   ├── Input.tsx         # Text input field
│       │   │   ├── Select.tsx        # Dropdown select
│       │   │   ├── Spinner.tsx       # Loading indicator
│       │   │   ├── Table.tsx         # Sortable data table
│       │   │   └── Tooltip.tsx       # Hover tooltip
│       │   ├── forms/
│       │   │   ├── SimulationForm.tsx   # Rifle/bullet/powder/charge selector
│       │   │   └── LoadForm.tsx         # Load creation/editing form
│       │   ├── charts/
│       │   │   ├── PressureTimeChart.tsx   # P(t) with SAAMI reference line
│       │   │   ├── VelocityDistanceChart.tsx # V(x)
│       │   │   └── HarmonicsChart.tsx       # OBT nodes as vertical lines
│       │   └── layout/
│       │       ├── AppShell.tsx      # Grid layout (header, sidebar, main)
│       │       ├── Header.tsx        # Top bar with title
│       │       └── Sidebar.tsx       # Navigation menu (Dashboard, Simulación, Ladder Test, etc.)
│       ├── hooks/
│       │   ├── usePowders.ts         # useQuery + useCreatePowder + useUpdatePowder + useDeletePowder + useImportGrtPowders
│       │   ├── useBullets.ts         # useQuery + CRUD mutations
│       │   ├── useCartridges.ts      # useQuery + CRUD mutations
│       │   ├── useRifles.ts          # useQuery + CRUD mutations
│       │   ├── useLoads.ts           # useQuery + CRUD mutations
│       │   ├── useSimulation.ts      # useMutation for POST /simulate/direct
│       │   └── useParametricSearch.ts # useMutation for POST /simulate/parametric
│       ├── lib/
│       │   ├── api.ts                # HTTP client (request<T>(), getPowders(), createPowder(), etc.)
│       │   ├── types.ts              # TypeScript interfaces (Powder, Bullet, SimulationResult, etc.)
│       │   ├── utils.ts              # Helper functions (psiToMpa, formatNum, getSafetyLevel, etc.)
│       │   └── unit-context.ts       # React Context for metric/imperial toggle (useUnits hook)
│       └── contexts/
│           └── UnitContext.tsx       # UnitProvider (metric vs imperial state)
├── docs/
│   ├── PROJECT_PLAN.md               # 6-phase roadmap
│   ├── physics_core.md               # Physics theory (1097 lines, 20 academic refs)
│   ├── materials_database.md         # Powder/bullet/cartridge specs (554 lines)
│   └── grtools_analysis.md           # GRTools feature comparison and roadmap
├── .env.example                      # Template for DB credentials
├── .gitignore
├── docker-compose.yml                # 4 services: db (PostgreSQL 16), backend (uvicorn), frontend (next), pgadmin
├── CLAUDE.md                         # Project brief (this file's source)
└── README.md                         # Project overview
```

## Directory Purposes

**`backend/app/core/`:**
- Purpose: Physics simulation engine (pure functions, no I/O)
- Contains: 8 Python modules implementing thermodynamics, ballistics, structural analysis, harmonics, heat transfer
- Key files: `solver.py` (main entry), `thermodynamics.py`, `internal_ballistics.py`, `structural.py`, `harmonics.py`, `heat_transfer.py`, GRT import utilities
- No HTTP/database dependencies; uses NumPy/SciPy for numerical computation

**`backend/app/models/`:**
- Purpose: SQLAlchemy ORM models (database schema in Python)
- Contains: 7 model classes (Powder, Bullet, Cartridge, Rifle, Load, SimulationResult, base classes)
- All tables use UUID primary keys (via `UUIDMixin`)
- Relationships: Rifle → Cartridge (FK), Load → Powder/Bullet/Rifle (FKs), SimulationResult → Load (FK)

**`backend/app/schemas/`:**
- Purpose: Pydantic v2 request/response contracts (input validation, output serialization)
- Contains: Create/Update/Response DTOs for each entity
- All numeric fields have physical limits (Field gt/lt constraints)
- Example: `powder_charge_grains: float = Field(gt=0.1, lt=100)`

**`backend/app/api/`:**
- Purpose: REST API endpoint definitions
- Contains: 7 routers, each handling CRUD for one entity + special endpoints (simulate, ladder, parametric, chrono, import-grt)
- Router registration: All included in `router.py` with `/api/v1` prefix

**`backend/app/db/`:**
- Purpose: Database connection, session management, migrations
- Contains: `session.py` with AsyncEngine and session factory, Alembic directory for schema migrations
- `get_db()` dependency function injected into all endpoint handlers

**`backend/app/seed/`:**
- Purpose: Populate database with initial data on app startup
- Contains: `initial_data.py` with 22 powders, bullets, cartridges, 5 seed rifles
- Invoked: During lifespan context manager in `main.py`

**`backend/tests/`:**
- Purpose: Unit and integration tests (127 total)
- Contains: Test modules organized by domain (thermodynamics, solver, structural, harmonics, validation, API integration)
- Runs: `pytest tests/ -v`

**`frontend/src/app/`:**
- Purpose: Next.js 14 App Router pages
- Contains: 10 page components (dashboard, simulate, ladder, CRUD, search, compare)
- All use `'use client'` for client-side interactivity
- Routing: File-based routing (e.g., `simulate/page.tsx` → `/simulate`)

**`frontend/src/components/ui/`:**
- Purpose: Atomic UI components (reusable primitives)
- Contains: 8 components (Badge, Button, Card, Input, Select, Spinner, Table, Tooltip)
- Used by: All pages and feature components
- Styled: Tailwind CSS dark theme

**`frontend/src/components/forms/`:**
- Purpose: Feature-specific form components
- Contains: SimulationForm, LoadForm
- Imports: UI components, hooks, utility functions

**`frontend/src/components/charts/`:**
- Purpose: Specialized visualization components
- Contains: PressureTimeChart (P vs t), VelocityDistanceChart (V vs x), HarmonicsChart (barrel nodes)
- Uses: Recharts library for rendering

**`frontend/src/components/layout/`:**
- Purpose: Page structure components
- Contains: AppShell (grid layout), Header (top bar), Sidebar (navigation)
- Used by: Root layout

**`frontend/src/hooks/`:**
- Purpose: Encapsulate TanStack Query logic for data fetching and mutations
- Contains: 7 custom hooks (usePowders, useBullets, useCartridges, useRifles, useLoads, useSimulation, useParametricSearch)
- Pattern: Each hook exports query + mutation hooks (useX, useCreateX, useUpdateX, useDeleteX)

**`frontend/src/lib/`:**
- Purpose: Shared utilities, types, API client
- Contains: `api.ts` (HTTP client), `types.ts` (TypeScript interfaces), `utils.ts` (formatters and helpers), `unit-context.ts` (unit system state)

**`frontend/src/contexts/`:**
- Purpose: React Context for shared application state
- Contains: UnitContext (metric vs imperial toggle)
- Used by: Charts and formatters to render in correct unit system

## Key File Locations

**Entry Points:**
- `backend/app/main.py`: FastAPI app initialization
- `frontend/src/app/layout.tsx`: Root React layout
- `docker-compose.yml`: Container orchestration

**Configuration:**
- `backend/app/config.py`: Database URL via Pydantic Settings
- `frontend/src/lib/api.ts`: API_BASE URL (process.env.NEXT_PUBLIC_API_URL)
- `docker-compose.yml`: Environment variables for all services
- `.env.example`: Template for database credentials

**Core Logic:**
- `backend/app/core/solver.py`: Main physics simulation (simulate() function)
- `backend/app/api/simulate.py`: Simulation endpoints coordination
- `frontend/src/app/simulate/page.tsx`: Simulation UI page

**Testing:**
- `backend/tests/conftest.py`: Pytest fixtures
- `backend/tests/test_*.py`: 6 test modules (127 tests total)

## Naming Conventions

**Files:**
- Python: `snake_case.py` (e.g., `thermodynamics.py`, `initial_data.py`)
- TypeScript: `PascalCase.tsx` for components (e.g., `SimulationForm.tsx`), `camelCase.ts` for utilities (e.g., `api.ts`, `types.ts`)
- Models: Singular PascalCase (e.g., `Powder`, `Bullet`, not `Powders`)
- Endpoints: Plural PascalCase with data (e.g., `PowderResponse`, `BulletCreate`)

**Directories:**
- Lowercase plural for feature areas: `models`, `schemas`, `api`, `hooks`, `components`
- Singular for purpose: `core` (physics), `lib` (utilities), `contexts` (state)

**Functions:**
- Backend: `snake_case` (e.g., `seed_initial_data()`, `get_db()`)
- Frontend: `camelCase` for utilities (e.g., `psiToMpa()`, `formatNum()`), `PascalCase` for React hooks (e.g., `usePowders()`)

**API Endpoints:**
- Plural resource names: `/api/v1/powders`, `/api/v1/bullets`
- Singular actions: `/api/v1/simulate`, `/api/v1/chrono/import`
- Sub-resources: `/powders/{id}`, `/powders/import-grt`

## Where to Add New Code

**New Feature (e.g., new ballistic calculation):**
- Physics code: `backend/app/core/new_module.py`
- Import in: `backend/app/core/solver.py` and integrate into `simulate()` function
- ORM: Add new model in `backend/app/models/new_entity.py`, register in `main.py`
- Schema: Add DTOs in `backend/app/schemas/new_entity.py`
- API: Create `backend/app/api/new_entity.py` with CRUD endpoints, include router in `router.py`
- Frontend: Create page in `frontend/src/app/new-entity/page.tsx`, hook in `frontend/src/hooks/useNewEntity.ts`

**New Component/Module (UI):**
- Implementation: `frontend/src/components/forms/` (form), `charts/` (visualization), `ui/` (primitive)
- Used by: Import in page components

**Utilities:**
- Shared helpers: `frontend/src/lib/utils.ts` or new `utils/*.ts` file
- API client functions: Add to `frontend/src/lib/api.ts`
- TypeScript interfaces: Add to `frontend/src/lib/types.ts`

**Tests:**
- Backend unit tests: `backend/tests/test_*.py` (one module per domain)
- Backend integration tests: In `test_api_integration.py`
- Frontend: No tests currently (see CONCERNS.md for E2E testing gaps)

## Special Directories

**`backend/app/db/migrations/`:**
- Purpose: Alembic version-controlled schema migrations
- Committed: Yes
- Generated: By Alembic on `alembic revision --autogenerate -m "..."`
- Usage: `alembic upgrade head` (production) or `create_all()` fallback (development)

**`backend/app/seed/`:**
- Purpose: Initial data loading
- Committed: Yes (seed script)
- Generated: Data created at runtime in DB
- Triggers: On app startup via lifespan

**`frontend/.next/`:**
- Purpose: Next.js build output
- Committed: No (in .gitignore)
- Generated: By `npm run build`

**`frontend/node_modules/`:**
- Purpose: NPM dependencies
- Committed: No (in .gitignore)
- Generated: By `npm install`

**`backend/__pycache__/`:**
- Purpose: Python bytecode cache
- Committed: No (in .gitignore)
- Generated: By Python interpreter
