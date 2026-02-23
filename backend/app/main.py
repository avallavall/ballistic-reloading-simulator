import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.router import api_router
from app.db.session import async_session_factory, engine
from app.middleware import setup_middleware
from app.models.base import Base

# Import all models so they register with Base.metadata
import app.models.powder  # noqa: F401
import app.models.bullet  # noqa: F401
import app.models.cartridge  # noqa: F401
import app.models.rifle  # noqa: F401
import app.models.load  # noqa: F401
import app.models.simulation  # noqa: F401

from app.seed.initial_data import seed_initial_data

logger = logging.getLogger(__name__)

# CORS: restrict origins; override via CORS_ORIGINS env var (comma-separated)
_default_origins = ["http://localhost:3000", "http://frontend:3000"]
CORS_ORIGINS = os.getenv("CORS_ORIGINS", ",".join(_default_origins)).split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # NOTE: For production, use Alembic migrations instead:
    #   cd backend && alembic upgrade head
    # create_all() is kept as a dev fallback for convenience.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created (create_all fallback)")

    # Create pg_trgm extension and GIN indexes for fuzzy search
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_powders_name_trgm ON powders USING gin (name gin_trgm_ops)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_powders_mfg_trgm ON powders USING gin (manufacturer gin_trgm_ops)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_bullets_name_trgm ON bullets USING gin (name gin_trgm_ops)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_bullets_mfg_trgm ON bullets USING gin (manufacturer gin_trgm_ops)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_cartridges_name_trgm ON cartridges USING gin (name gin_trgm_ops)"
            ))
        app.state.has_trgm = True
        logger.info("pg_trgm extension and GIN indexes ready")
    except Exception as e:
        app.state.has_trgm = False
        logger.warning("pg_trgm unavailable (%s) - fuzzy search will use ILIKE fallback", e)

    # Seed initial data
    async with async_session_factory() as session:
        await seed_initial_data(session)

    yield


app = FastAPI(
    title="Simulador de Balística de Precisión",
    description="API para simulación de balística interior enfocada en recarga de munición",
    version="0.1.0",
    lifespan=lifespan,
)

# Register rate limiting, global error handler, and timing middleware
setup_middleware(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(api_router)


@app.get("/api/v1/health")
async def health_check():
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {e}"
    return {"status": "ok", "version": "0.1.0", "database": db_status}
