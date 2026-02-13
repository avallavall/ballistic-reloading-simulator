from fastapi import APIRouter

from app.api.bullets import router as bullets_router
from app.api.cartridges import router as cartridges_router
from app.api.chrono import router as chrono_router
from app.api.loads import router as loads_router
from app.api.powders import router as powders_router
from app.api.rifles import router as rifles_router
from app.api.simulate import router as simulate_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(powders_router)
api_router.include_router(bullets_router)
api_router.include_router(cartridges_router)
api_router.include_router(rifles_router)
api_router.include_router(loads_router)
api_router.include_router(simulate_router)
api_router.include_router(chrono_router)
