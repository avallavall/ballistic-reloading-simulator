# Technology Stack

**Analysis Date:** 2025-02-20

## Languages

**Primary:**
- Python 3.12 - Backend logic, physics engine, API server
- TypeScript 5.6.3 - Frontend, React components, type safety
- JavaScript (ES2020+) - Build configuration, scripts

**Secondary:**
- SQL - Database queries (via SQLAlchemy ORM)
- YAML - Docker Compose configuration

## Runtime

**Environment:**
- Python 3.12-slim (Docker image: `python:3.12-slim`)
- Node.js 20-alpine (Docker image: `node:20-alpine`)
- PostgreSQL 16-alpine (Database container)

**Package Manager:**
- Python: pip (installed via requirements.txt)
- Node.js: npm (package-lock.json present)

## Frameworks

**Backend:**
- FastAPI 0.115.6 - REST API framework, async first, automatic OpenAPI docs
- Uvicorn 0.34.0 - ASGI web server
- SQLAlchemy 2.0.36 - Async ORM with asyncio support (sqlalchemy[asyncio])
- Alembic 1.14.1 - Database migration management (async mode)
- Pydantic 2.10.4 - Data validation and serialization
- Pydantic Settings 2.7.1 - Environment configuration management

**Frontend:**
- Next.js 14.2.15 - React framework with App Router, SSR/SSG support
- React 18.3.1 - UI library
- TanStack React Query 5.59.0 - Server state management, caching, async queries

**Styling:**
- Tailwind CSS 3.4.13 - Utility-first CSS framework
- PostCSS 8.4.47 - CSS transformation tool
- Autoprefixer 10.4.20 - Vendor prefix automation

## Key Dependencies

**Backend - Physics & Computation:**
- NumPy 2.2.1 - Numerical computing, array operations
- SciPy 1.15.0 - Scientific computing, ODE solver (solve_ivp for RK45)

**Backend - Database:**
- asyncpg 0.30.0 - Async PostgreSQL driver
- aiosqlite 0.20.0 - Async SQLite driver (for testing)

**Backend - API & Middleware:**
- slowapi 0.1.9 - Rate limiting library (async-compatible), keyed by IP
- python-multipart 0.0.20 - Form data and file upload handling
- python-dotenv 1.0.1 - Environment variable loading from .env files
- httpx 0.28.1 - Async HTTP client (for internal requests if needed)

**Frontend - UI Components:**
- Lucide React 0.447.0 - Icon library
- clsx 2.1.1 - Conditional className utility
- tailwind-merge 2.5.3 - Utility class merging for Tailwind

**Testing:**
- pytest 8.3.4 - Test runner (127 tests)
- pytest-asyncio 0.24.0 - Async test support
- httpx - Used via pytest for async HTTP assertions

**Build & Dev:**
- TypeScript 5.6.3 - Type checking
- Node.js 20 - Runtime for build tools

## Configuration

**Environment:**
Backend configuration via `app/config.py` (Pydantic Settings):
- `DATABASE_URL`: PostgreSQL connection string with asyncpg driver
- `ENVIRONMENT`: "development" or "production"
- Loaded from `.env` file (see `.env.example`)

Frontend environment:
- `NEXT_PUBLIC_API_URL`: Public API endpoint (visible to browser)
- Environment variables loaded by Next.js from `.env.local` or `.env` files

**Build:**
- Backend: `backend/Dockerfile` with Python 3.12-slim
- Frontend: `frontend/Dockerfile` with Node 20-alpine
- Docker Compose orchestrates both services with PostgreSQL

**Configuration Files:**
- `backend/alembic.ini` - Alembic migration settings, points to `app/db/migrations`
- `frontend/tsconfig.json` - TypeScript compiler options with path alias `@/*` -> `src/*`
- `frontend/tailwind.config.ts` - Tailwind CSS theme customization
- `frontend/next.config.js` - Next.js configuration with API rewrites
- `docker-compose.yml` - Multi-container orchestration (db, backend, frontend, pgadmin)

## Database

**Primary:**
- PostgreSQL 16-alpine - Relational database for all persistent data
- Connection: `postgresql+asyncpg://balistica:balistica_dev_2024@db:5432/balistica`
- Async driver: asyncpg 0.30.0
- Migration management: Alembic 1.14.1 (async mode)
- ORM: SQLAlchemy 2.0.36 with AsyncSession

**Testing:**
- SQLite (aiosqlite 0.20.0) - In-memory database for unit/integration tests

**Tables:**
- `powder` - Propellant data (burn rate, force constant)
- `bullet` - Projectile specifications (weight, diameter, ballistic coefficient)
- `cartridge` - Ammunition specifications (SAAMI pressure, case capacity)
- `rifle` - Firearm configurations (barrel length, twist rate)
- `load` - Ammunition loads (links powder, bullet, rifle, charge weight)
- `simulation` - Results cache (JSONB column for complex physics data)

All tables use UUID primary keys with created_at/updated_at timestamps.

## Platform Requirements

**Development:**
- Docker & Docker Compose (4 services: db, backend, frontend, pgadmin)
- Python 3.12 (for local backend development)
- Node.js 20 (for local frontend development)
- PostgreSQL client tools (optional, for direct DB access)

**Production:**
- Docker container runtime (Kubernetes, Docker Swarm, AWS ECS, etc.)
- PostgreSQL 16+ database (external or containerized)
- Reverse proxy (nginx/caddy) for HTTPS and routing
- Memory: ~2GB minimum (db: 512M, backend: 1GB, frontend: 1GB per docker-compose.yml limits)

## Port Configuration

**Development (Docker Compose):**
- Backend API: 8000 (`http://localhost:8000`)
- Frontend: 3000 (`http://localhost:3000`)
- PostgreSQL: 5432 (`localhost:5432`)
- pgAdmin (optional): 5050 (`http://localhost:5050`)

**Environment Variables:**
All ports configurable via `.env` file:
- `BACKEND_PORT` (default: 8000)
- `FRONTEND_PORT` (default: 3000)
- `DB_PORT` (default: 5432)
- `PGADMIN_PORT` (default: 5050)

---

*Stack analysis: 2025-02-20*
