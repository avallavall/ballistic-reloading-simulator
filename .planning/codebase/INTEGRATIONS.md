# External Integrations

**Analysis Date:** 2025-02-20

## APIs & External Services

**None detected** - This is a self-contained ballistics simulator with no third-party API integrations (no stripe, supabase, AWS SDK, etc.). All functionality is internal.

## Data Storage

**Databases:**
- PostgreSQL 16
  - Connection: `postgresql+asyncpg://balistica:balistica_dev_2024@db:5432/balistica`
  - Environment variable: `DATABASE_URL`
  - Client: SQLAlchemy 2.0.36 (async ORM with asyncpg driver)
  - Migrations: Alembic 1.14.1 (async mode, location: `backend/app/db/migrations/`)
  - Schema: 6 tables (powder, bullet, cartridge, rifle, load, simulation) with UUID PKs

**File Storage:**
- Local filesystem only
  - Chronograph CSV imports: Handled via file upload endpoint `POST /api/v1/chrono/import`
  - Supported formats: Labradar, MagnetoSpeed CSV or plain text
  - Files are parsed in-memory and not persisted to disk
  - GRT .propellant file import: `POST /api/v1/powders/import-grt` (parsed in-memory)

**Caching:**
- None - TanStack React Query provides client-side caching via HTTP cache headers
- No Redis or memcached in use

## Authentication & Identity

**Auth Provider:**
- None - Application is public/unauthenticated
- No OAuth, JWT, or session-based auth implemented
- CORS is configured to allow requests from specified origins (configurable via `CORS_ORIGINS` env var)
- Allowed origins in development: `http://localhost:3000`, `http://frontend:3000`
- Rate limiting per IP via slowapi (not per user)

**Authorization:**
- None - All endpoints are publicly accessible
- Rate limiting applied at IP level:
  - `/api/v1/simulate/*` endpoints: 10 requests per minute
  - `/api/v1/simulate/ladder`: 5 requests per minute
  - `/api/v1/simulate/parametric`: 3 requests per minute

## Monitoring & Observability

**Error Tracking:**
- None detected - No Sentry, DataDog, or similar

**Logs:**
- Standard Python logging (stderr via Uvicorn)
- Global exception handler in `backend/app/middleware.py` logs all unhandled exceptions
- Alembic logs migration operations to stderr
- No centralized log aggregation (ELK, Splunk, etc.)

**Metrics:**
- Request timing header: `X-Process-Time-Ms` added by middleware in `backend/app/middleware.py`
- Health check endpoint: `GET /api/v1/health` verifies database connectivity
- No Prometheus metrics, StatsD, or APM integration

## CI/CD & Deployment

**Hosting:**
- Docker Compose (development and single-host deployment)
- Container images:
  - Backend: `python:3.12-slim` with FastAPI/Uvicorn
  - Frontend: `node:20-alpine` with Next.js
  - Database: `postgres:16-alpine`
  - Admin UI: `dpage/pgadmin4:8.14` (optional, behind `--profile tools`)

**Continuous Integration:**
- None detected - No GitHub Actions, GitLab CI, Jenkins, or similar
- Tests run manually via `pytest` command

**Deployment:**
- Docker Compose for local/single-host deployment
- For production: Requires manual container orchestration (Kubernetes, Docker Swarm, ECS, etc.)
- No GitHub Actions workflow files detected
- No infrastructure-as-code (Terraform, CloudFormation) detected

## Environment Configuration

**Required env vars (Backend):**
- `DATABASE_URL` - PostgreSQL connection string with asyncpg driver
- `ENVIRONMENT` - "development" or "production"
- `CORS_ORIGINS` - Comma-separated list of allowed origins (default: `http://localhost:3000,http://frontend:3000`)

**Required env vars (Frontend):**
- `NEXT_PUBLIC_API_URL` - Backend API endpoint (default: `http://localhost:8000`)

**Optional env vars (Database):**
- `POSTGRES_USER` - DB username (default: `balistica`)
- `POSTGRES_PASSWORD` - DB password (default: `balistica_dev_2024`)
- `POSTGRES_DB` - Database name (default: `balistica`)
- `DB_PORT` - Port binding (default: 5432)

**Optional env vars (pgAdmin - requires `--profile tools`):**
- `PGADMIN_EMAIL` - Admin login email (default: `admin@balistica.dev`)
- `PGADMIN_PASSWORD` - Admin password (default: `admin`)
- `PGADMIN_PORT` - Port binding (default: 5050)

**Secrets location:**
- `.env` file in project root (must NOT be committed)
- Example template: `.env.example`
- Loaded by Python dotenv and Next.js framework

## Webhooks & Callbacks

**Incoming:**
- None detected - No external webhooks consumed

**Outgoing:**
- None detected - No outbound webhooks sent

## Network Configuration

**CORS (Cross-Origin Resource Sharing):**
- Configured via `CORSMiddleware` in `backend/app/main.py`
- Allowed origins: Configurable via `CORS_ORIGINS` environment variable
- Allowed methods: GET, POST, PUT, DELETE
- Allowed headers: Content-Type, Authorization
- Credentials: Enabled (allow_credentials=True)

**Health Checks:**
- Backend: `GET /api/v1/health`
  - Returns status, version, database connection status
  - Endpoint: `backend/app/main.py:health_check()`
  - Used by Docker Compose as service dependency check

**API Endpoints (All under `/api/v1` prefix):**
- CRUD endpoints: `/powders`, `/bullets`, `/cartridges`, `/rifles`, `/loads`
- Simulation: `/simulate/direct`, `/simulate/ladder`, `/simulate/parametric`
- Utilities: `/chrono/import`, `/powders/import-grt`, `/health`
- All endpoints return JSON responses
- Rate limiting applied via slowapi middleware

## Data Synchronization

**Frontend to Backend:**
- HTTP fetch API (native, no axios or similar)
- Async client function wrappers in `frontend/src/lib/api.ts`
- TanStack React Query for request deduplication and caching
- Form data POST requests (application/json)
- File uploads via multipart/form-data (`POST /chrono/import`, `POST /powders/import-grt`)

**Backend to Database:**
- SQLAlchemy async ORM with asyncpg driver
- AsyncSession factory in `backend/app/db/session.py`
- No cached data - queries hit database directly

---

*Integration audit: 2025-02-20*
