# Ballistic Reloading Simulator

Internal ballistics simulator for precision ammunition reloading. Predicts chamber pressure, muzzle velocity, barrel harmonics, structural stress, and recoil from first principles using a lumped-parameter thermodynamic model.

## Features

- **Internal Ballistics Solver** - 4th-order ODE system (RK45) solving burn fraction, bullet travel, velocity, and heat loss simultaneously
- **Noble-Abel EOS + Vieille Burn Rate** - Gas equation of state with covolume correction and pressure-dependent burn rate
- **Thornhill Heat Loss Model** - Convective wall heat transfer reduces overprediction by 30-50%
- **Structural Analysis** - Lame hoop stress, brass case expansion, Lawton barrel erosion model
- **Barrel Harmonics** - Cantilever beam frequency analysis, Optimal Barrel Time (OBT) calculation
- **Ladder Test** - Sweep charge weight to find velocity/pressure nodes
- **GRT Import** - Import propellant data from Gordon's Reloading Tool `.propellant` XML files
- **Chronograph Import** - Parse Labradar and MagnetoSpeed CSV files
- **Recoil Calculation** - Free recoil energy, impulse, and velocity
- **185 Tests** - Thermodynamics, solver, structural, harmonics, schema validation, API integration

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, TanStack Query, Recharts |
| Backend | FastAPI, Python 3.12, SQLAlchemy 2.0 (async), Pydantic v2 |
| Database | PostgreSQL 16 |
| Solver | NumPy, SciPy (solve_ivp RK45) |
| Infrastructure | Docker Compose, Alembic migrations |

## Quick Start

```bash
# Clone and start
git clone https://github.com/avallavall/ballistic-reloading-simulator.git
cd ballistic-reloading-simulator
cp .env.example .env
docker-compose up --build
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/v1
- **API Docs**: http://localhost:8000/docs

To also start pgAdmin:
```bash
docker-compose --profile tools up
# pgAdmin: http://localhost:5050
```

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── core/                # Physics engine
│   │   │   ├── thermodynamics.py    # Noble-Abel, Vieille, form function
│   │   │   ├── internal_ballistics.py # Lagrange gradient, acceleration
│   │   │   ├── solver.py           # ODE integrator (4 state variables)
│   │   │   ├── structural.py       # Hoop stress, case expansion, erosion
│   │   │   ├── harmonics.py        # Barrel frequency, OBT
│   │   │   ├── heat_transfer.py    # Thornhill convective model
│   │   │   ├── grt_parser.py       # GRT .propellant XML parser
│   │   │   └── grt_converter.py    # GRT-to-Vieille parameter conversion
│   │   ├── models/              # SQLAlchemy ORM (6 tables)
│   │   ├── schemas/             # Pydantic v2 validation
│   │   ├── api/                 # REST endpoints
│   │   └── db/                  # Sessions + Alembic migrations
│   └── tests/                   # 185 tests
├── frontend/
│   └── src/
│       ├── app/                 # Next.js pages (dashboard, simulate, ladder, CRUD)
│       ├── components/          # UI, layout, forms, charts
│       ├── hooks/               # React Query hooks
│       └── lib/                 # API client, types, utilities
└── docker-compose.yml
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Health check (DB connectivity) |
| `CRUD` | `/api/v1/powders` | Powder management |
| `POST` | `/api/v1/powders/import-grt` | Import GRT .propellant/.zip |
| `CRUD` | `/api/v1/bullets` | Bullet management |
| `CRUD` | `/api/v1/cartridges` | Cartridge management |
| `CRUD` | `/api/v1/rifles` | Rifle management |
| `CRUD` | `/api/v1/loads` | Load recipe management |
| `POST` | `/api/v1/simulate/direct` | Run single simulation |
| `POST` | `/api/v1/simulate/ladder` | Ladder test (charge sweep) |
| `GET` | `/api/v1/simulate/export/{id}` | Export results as CSV |
| `POST` | `/api/v1/chrono/import` | Import chronograph CSV |

## Physics Model

The solver integrates four coupled ODEs:

1. **dZ/dt** - Burn fraction (Vieille's law: r = a*P^n)
2. **dx/dt** - Bullet position (= velocity)
3. **dv/dt** - Bullet velocity (Lagrange pressure gradient)
4. **dQ/dt** - Cumulative heat loss (Thornhill convection)

Gas pressure from Noble-Abel equation of state:

```
P = f * omega * Z * psi(Z) / (V_chamber + A_bore * x - omega/rho * (1-Z) - omega * Z * eta)
```

Where `f` = force constant, `omega` = charge mass, `Z` = burn fraction, `psi` = form function, `eta` = gas covolume, `rho` = solid density.

## Development

```bash
# Run backend tests (inside container)
docker exec balistica_backend python -m pytest tests/ -v

# Run locally (requires Python 3.12 + venv)
cd backend && pip install -r requirements.txt
python -m pytest tests/ -v

# Alembic migrations
docker exec balistica_backend alembic upgrade head
docker exec balistica_backend alembic revision --autogenerate -m "description"

# Frontend dev
cd frontend && npm install && npm run dev
```

## Seed Data

The database is pre-populated on first startup with:
- 22 powders (Hodgdon, Vihtavuori, Alliant, IMR, Accurate)
- Bullets, cartridges (.308 Win, 6.5 Creedmoor, .223 Rem, etc.)
- 5 rifles with different configurations

## Configuration

All settings via environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `balistica` | Database user |
| `POSTGRES_PASSWORD` | `balistica_dev_2024` | Database password |
| `POSTGRES_DB` | `balistica` | Database name |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |
| `ENVIRONMENT` | `development` | App environment |

## Security

- Rate limiting: 10 req/min on simulation, 5 req/min on ladder test
- Input validation with physical limits on all Pydantic schemas
- CORS restricted to configured origins
- Global error handler (JSON responses, no stack traces in production)
- Network isolation: DB not exposed to frontend container

## References

The physics implementation is documented in `docs/physics_core.md` (1097 lines, 20 academic references) covering:
- Interior ballistics thermodynamics (Corner, Carlucci & Jacobson)
- Noble-Abel equation of state
- Lagrange pressure distribution
- Vieille/Saint-Venant burn rate law
- Thornhill heat transfer model
- Lame thick-wall cylinder stress analysis
- Lawton barrel erosion model
- Cantilever beam vibration (barrel harmonics)

## License

Private repository. All rights reserved.
