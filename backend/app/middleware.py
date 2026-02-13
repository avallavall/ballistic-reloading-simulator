"""Global exception handler and rate limiting middleware."""

import logging
import os
import time

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)

# Rate limiter: keyed by client IP
limiter = Limiter(key_func=get_remote_address)

# Allowed CORS origins (mirrors main.py default; kept in sync via env var)
_default_origins = ["http://localhost:3000", "http://frontend:3000"]
_cors_origins = os.getenv("CORS_ORIGINS", ",".join(_default_origins)).split(",")


def _add_cors_headers(response: JSONResponse, origin: str | None) -> JSONResponse:
    """Add CORS headers to an error response if the origin is allowed."""
    if origin and origin in _cors_origins:
        response.headers["access-control-allow-origin"] = origin
        response.headers["access-control-allow-credentials"] = "true"
        response.headers["vary"] = "Origin"
    return response


def setup_middleware(app: FastAPI) -> None:
    """Register all middleware and exception handlers on the app."""

    # -- SlowAPI rate limiting --
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # -- Global exception handler --
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
        response = JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"},
        )
        return _add_cors_headers(response, request.headers.get("origin"))

    # -- Request timing header --
    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.1f}"
        return response
