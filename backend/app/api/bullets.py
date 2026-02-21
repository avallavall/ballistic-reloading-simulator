import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.quality import compute_bullet_quality_score
from app.db.session import get_db
from app.models.bullet import Bullet
from app.schemas.bullet import (
    BulletCreate,
    BulletResponse,
    BulletUpdate,
    PaginatedBulletResponse,
)
from app.services.pagination import paginate
from app.services.search import apply_fuzzy_search, derive_caliber_family

router = APIRouter(prefix="/bullets", tags=["bullets"])

# Allowed sort columns for bullets
_BULLET_SORT_COLUMNS = {
    "name": Bullet.name,
    "manufacturer": Bullet.manufacturer,
    "quality_score": Bullet.quality_score,
}

# Quality level -> (min_score, max_score) inclusive
_QUALITY_RANGES = {
    "success": (70, 100),
    "warning": (40, 69),
    "danger": (0, 39),
}


@router.get("", response_model=PaginatedBulletResponse)
async def list_bullets(
    db: AsyncSession = Depends(get_db),
    q: str | None = Query(None, min_length=3, description="Fuzzy search on name/manufacturer"),
    manufacturer: str | None = Query(None, description="Filter by exact manufacturer"),
    caliber_family: str | None = Query(None, description="Filter by caliber family (e.g. .308)"),
    quality_level: str | None = Query(None, description="Badge tier: success/warning/danger"),
    min_quality: int | None = Query(None, ge=0, le=100, description="Minimum quality score"),
    sort: str = Query("quality_score", description="Sort column: name, manufacturer, quality_score"),
    order: str = Query("desc", description="Sort order: asc, desc"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    size: int = Query(50, ge=1, le=200, description="Items per page (max 200)"),
):
    query = select(Bullet)

    # Fuzzy search (requires PostgreSQL pg_trgm)
    if q:
        query = apply_fuzzy_search(query, Bullet, q)
    else:
        # Apply user sort when not searching
        sort_col = _BULLET_SORT_COLUMNS.get(sort, Bullet.quality_score)
        if order == "asc":
            query = query.order_by(sort_col.asc())
        else:
            query = query.order_by(sort_col.desc())

    # Exact manufacturer filter
    if manufacturer:
        query = query.where(Bullet.manufacturer == manufacturer)

    # Caliber family filter
    if caliber_family:
        query = query.where(Bullet.caliber_family == caliber_family)

    # Quality level badge filter
    if quality_level and quality_level in _QUALITY_RANGES:
        min_s, max_s = _QUALITY_RANGES[quality_level]
        query = query.where(Bullet.quality_score >= min_s, Bullet.quality_score <= max_s)

    # Minimum quality score filter
    if min_quality is not None:
        query = query.where(Bullet.quality_score >= min_quality)

    return await paginate(db, query, page, size)


@router.get("/manufacturers", response_model=list[str])
async def list_bullet_manufacturers(db: AsyncSession = Depends(get_db)):
    """Return distinct manufacturer names for bullets."""
    result = await db.execute(
        select(Bullet.manufacturer)
        .distinct()
        .where(Bullet.manufacturer.isnot(None))
        .order_by(Bullet.manufacturer)
    )
    return list(result.scalars().all())


@router.get("/caliber-families", response_model=list[str])
async def list_bullet_caliber_families(db: AsyncSession = Depends(get_db)):
    """Return distinct caliber family values for bullets."""
    result = await db.execute(
        select(Bullet.caliber_family)
        .distinct()
        .where(Bullet.caliber_family.isnot(None))
        .order_by(Bullet.caliber_family)
    )
    return list(result.scalars().all())


@router.post("", response_model=BulletResponse, status_code=201)
async def create_bullet(data: BulletCreate, db: AsyncSession = Depends(get_db)):
    bullet = Bullet(**data.model_dump())

    # Auto-derive caliber family from diameter
    bullet.caliber_family = derive_caliber_family(bullet.diameter_mm)

    # Compute initial quality score
    bullet_dict = data.model_dump()
    breakdown = compute_bullet_quality_score(bullet_dict, bullet.data_source)
    bullet.quality_score = breakdown.score

    db.add(bullet)
    await db.commit()
    await db.refresh(bullet)
    return bullet


@router.get("/{bullet_id}", response_model=BulletResponse)
async def get_bullet(bullet_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    bullet = await db.get(Bullet, bullet_id)
    if not bullet:
        raise HTTPException(404, "Bullet not found")
    return bullet


@router.put("/{bullet_id}", response_model=BulletResponse)
async def update_bullet(bullet_id: uuid.UUID, data: BulletUpdate, db: AsyncSession = Depends(get_db)):
    bullet = await db.get(Bullet, bullet_id)
    if not bullet:
        raise HTTPException(404, "Bullet not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(bullet, key, value)

    # Re-derive caliber family if diameter changed
    bullet.caliber_family = derive_caliber_family(bullet.diameter_mm)

    # Recompute quality score
    bullet_dict = {c.key: getattr(bullet, c.key) for c in Bullet.__table__.columns}
    breakdown = compute_bullet_quality_score(bullet_dict, bullet.data_source)
    bullet.quality_score = breakdown.score

    await db.commit()
    await db.refresh(bullet)
    return bullet


@router.delete("/{bullet_id}", status_code=204)
async def delete_bullet(bullet_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    bullet = await db.get(Bullet, bullet_id)
    if not bullet:
        raise HTTPException(404, "Bullet not found")
    await db.delete(bullet)
    await db.commit()
