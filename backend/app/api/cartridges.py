import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.quality import compute_cartridge_quality_score
from app.db.session import get_db
from app.models.cartridge import Cartridge
from app.schemas.cartridge import (
    CartridgeCreate,
    CartridgeResponse,
    CartridgeUpdate,
    PaginatedCartridgeResponse,
)
from app.services.pagination import paginate
from app.services.search import apply_fuzzy_search, derive_caliber_family

router = APIRouter(prefix="/cartridges", tags=["cartridges"])

# Allowed sort columns for cartridges
_CARTRIDGE_SORT_COLUMNS = {
    "name": Cartridge.name,
    "quality_score": Cartridge.quality_score,
}

# Quality level -> (min_score, max_score) inclusive
_QUALITY_RANGES = {
    "success": (70, 100),
    "warning": (40, 69),
    "danger": (0, 39),
}


@router.get("", response_model=PaginatedCartridgeResponse)
async def list_cartridges(
    db: AsyncSession = Depends(get_db),
    q: str | None = Query(None, min_length=3, description="Fuzzy search on name"),
    caliber_family: str | None = Query(None, description="Filter by caliber family (e.g. .308)"),
    quality_level: str | None = Query(None, description="Badge tier: success/warning/danger"),
    min_quality: int | None = Query(None, ge=0, le=100, description="Minimum quality score"),
    sort: str = Query("quality_score", description="Sort column: name, quality_score"),
    order: str = Query("desc", description="Sort order: asc, desc"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    size: int = Query(50, ge=1, le=200, description="Items per page (max 200)"),
):
    query = select(Cartridge)

    # Fuzzy search on name only (cartridges have no manufacturer column)
    if q:
        query = apply_fuzzy_search(query, Cartridge, q, fields=["name"])
    else:
        # Apply user sort when not searching
        sort_col = _CARTRIDGE_SORT_COLUMNS.get(sort, Cartridge.quality_score)
        if order == "asc":
            query = query.order_by(sort_col.asc())
        else:
            query = query.order_by(sort_col.desc())

    # Caliber family filter
    if caliber_family:
        query = query.where(Cartridge.caliber_family == caliber_family)

    # Quality level badge filter
    if quality_level and quality_level in _QUALITY_RANGES:
        min_s, max_s = _QUALITY_RANGES[quality_level]
        query = query.where(Cartridge.quality_score >= min_s, Cartridge.quality_score <= max_s)

    # Minimum quality score filter
    if min_quality is not None:
        query = query.where(Cartridge.quality_score >= min_quality)

    return await paginate(db, query, page, size)


@router.get("/caliber-families", response_model=list[str])
async def list_cartridge_caliber_families(db: AsyncSession = Depends(get_db)):
    """Return distinct caliber family values for cartridges."""
    result = await db.execute(
        select(Cartridge.caliber_family)
        .distinct()
        .where(Cartridge.caliber_family.isnot(None))
        .order_by(Cartridge.caliber_family)
    )
    return list(result.scalars().all())


@router.post("", response_model=CartridgeResponse, status_code=201)
async def create_cartridge(data: CartridgeCreate, db: AsyncSession = Depends(get_db)):
    cartridge = Cartridge(**data.model_dump())

    # Auto-derive caliber family from bore diameter
    cartridge.caliber_family = derive_caliber_family(cartridge.bore_diameter_mm)

    # Compute initial quality score
    cartridge_dict = data.model_dump()
    breakdown = compute_cartridge_quality_score(cartridge_dict, cartridge.data_source)
    cartridge.quality_score = breakdown.score

    db.add(cartridge)
    await db.commit()
    await db.refresh(cartridge)
    return cartridge


@router.get("/{cartridge_id}", response_model=CartridgeResponse)
async def get_cartridge(cartridge_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    cartridge = await db.get(Cartridge, cartridge_id)
    if not cartridge:
        raise HTTPException(404, "Cartridge not found")
    return cartridge


@router.put("/{cartridge_id}", response_model=CartridgeResponse)
async def update_cartridge(cartridge_id: uuid.UUID, data: CartridgeUpdate, db: AsyncSession = Depends(get_db)):
    cartridge = await db.get(Cartridge, cartridge_id)
    if not cartridge:
        raise HTTPException(404, "Cartridge not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(cartridge, key, value)

    # Re-derive caliber family if bore diameter changed
    cartridge.caliber_family = derive_caliber_family(cartridge.bore_diameter_mm)

    # Recompute quality score
    cartridge_dict = {c.key: getattr(cartridge, c.key) for c in Cartridge.__table__.columns}
    breakdown = compute_cartridge_quality_score(cartridge_dict, cartridge.data_source)
    cartridge.quality_score = breakdown.score

    await db.commit()
    await db.refresh(cartridge)
    return cartridge


@router.delete("/{cartridge_id}", status_code=204)
async def delete_cartridge(cartridge_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    cartridge = await db.get(Cartridge, cartridge_id)
    if not cartridge:
        raise HTTPException(404, "Cartridge not found")
    await db.delete(cartridge)
    await db.commit()
