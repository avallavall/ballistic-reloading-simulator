import json
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.grt_converter import convert_grt_to_powder
from app.core.grt_parser import parse_propellant_file, parse_propellant_zip
from app.core.quality import compute_quality_score
from app.db.session import get_db
from app.models.powder import Powder
from app.schemas.powder import (
    GrtImportResult,
    ImportMode,
    PaginatedPowderResponse,
    PowderCreate,
    PowderResponse,
    PowderUpdate,
)
from app.services.pagination import paginate
from app.services.search import apply_fuzzy_search

logger = logging.getLogger(__name__)

# Module-level cache for alias map (loaded once, reused)
_alias_map_cache: dict[str, str] | None = None


def _load_alias_map() -> dict[str, str]:
    """Load powder alias mapping from powder_aliases.json.

    Returns a dict mapping lowercase powder name -> alias group name.
    The file is loaded once and cached at module level since it is static.
    If the file does not exist, returns an empty dict (graceful fallback).
    """
    global _alias_map_cache
    if _alias_map_cache is not None:
        return _alias_map_cache

    alias_file = Path(__file__).parent.parent / "seed" / "fixtures" / "powder_aliases.json"
    if not alias_file.exists():
        _alias_map_cache = {}
        return _alias_map_cache

    try:
        with open(alias_file, encoding="utf-8") as f:
            aliases_data = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("Failed to load powder_aliases.json: %s", e)
        _alias_map_cache = {}
        return _alias_map_cache

    # Invert: {group_name: [name1, name2]} -> {name.lower(): group_name}
    result: dict[str, str] = {}
    for group_name, names in aliases_data.items():
        for name in names:
            result[name.lower()] = group_name

    _alias_map_cache = result
    return _alias_map_cache

router = APIRouter(prefix="/powders", tags=["powders"])

# Allowed sort columns for powders
_POWDER_SORT_COLUMNS = {
    "name": Powder.name,
    "manufacturer": Powder.manufacturer,
    "quality_score": Powder.quality_score,
}

# Quality level -> (min_score, max_score) inclusive
_QUALITY_RANGES = {
    "success": (70, 100),
    "warning": (40, 69),
    "danger": (0, 39),
}


@router.get("", response_model=PaginatedPowderResponse)
async def list_powders(
    request: Request,
    db: AsyncSession = Depends(get_db),
    q: str | None = Query(None, min_length=3, description="Fuzzy search on name/manufacturer"),
    manufacturer: str | None = Query(None, description="Filter by exact manufacturer"),
    burn_rate_min: float | None = Query(None, ge=0, description="Min burn rate relative"),
    burn_rate_max: float | None = Query(None, le=500, description="Max burn rate relative"),
    quality_level: str | None = Query(None, description="Badge tier: success/warning/danger"),
    min_quality: int | None = Query(None, ge=0, le=100, description="Minimum quality score"),
    sort: str = Query("quality_score", description="Sort column: name, manufacturer, quality_score"),
    order: str = Query("desc", description="Sort order: asc, desc"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    size: int = Query(50, ge=1, le=200, description="Items per page (max 200)"),
):
    query = select(Powder)

    # Fuzzy search (pg_trgm with ILIKE fallback)
    if q:
        query = apply_fuzzy_search(query, Powder, q, has_trgm=getattr(request.app.state, "has_trgm", False))
    else:
        # Apply user sort when not searching (search has its own ordering)
        sort_col = _POWDER_SORT_COLUMNS.get(sort, Powder.quality_score)
        if order == "asc":
            query = query.order_by(sort_col.asc())
        else:
            query = query.order_by(sort_col.desc())

    # Exact manufacturer filter
    if manufacturer:
        query = query.where(Powder.manufacturer == manufacturer)

    # Burn rate range filters
    if burn_rate_min is not None:
        query = query.where(Powder.burn_rate_relative >= burn_rate_min)
    if burn_rate_max is not None:
        query = query.where(Powder.burn_rate_relative <= burn_rate_max)

    # Quality level badge filter
    if quality_level and quality_level in _QUALITY_RANGES:
        min_s, max_s = _QUALITY_RANGES[quality_level]
        query = query.where(Powder.quality_score >= min_s, Powder.quality_score <= max_s)

    # Minimum quality score filter
    if min_quality is not None:
        query = query.where(Powder.quality_score >= min_quality)

    return await paginate(db, query, page, size)


@router.get("/manufacturers", response_model=list[str])
async def list_powder_manufacturers(db: AsyncSession = Depends(get_db)):
    """Return distinct manufacturer names for powders."""
    result = await db.execute(
        select(Powder.manufacturer)
        .distinct()
        .where(Powder.manufacturer.isnot(None))
        .order_by(Powder.manufacturer)
    )
    return list(result.scalars().all())


@router.post("", response_model=PowderResponse, status_code=201)
async def create_powder(data: PowderCreate, db: AsyncSession = Depends(get_db)):
    powder = Powder(**data.model_dump())
    # Compute initial quality score
    powder_dict = data.model_dump()
    breakdown = compute_quality_score(powder_dict, powder.data_source)
    powder.quality_score = breakdown.score
    db.add(powder)
    await db.commit()
    await db.refresh(powder)
    return powder


@router.post("/import-grt", response_model=GrtImportResult)
async def import_grt(
    file: UploadFile,
    mode: ImportMode = Query(ImportMode.skip),
    db: AsyncSession = Depends(get_db),
):
    """Import powders from a GRT .propellant file or a .zip of .propellant files.

    Parses the file, converts GRT parameters to our internal format, and creates
    powder records. Collision handling is controlled by mode:
    - skip: existing powders are skipped (default)
    - overwrite: existing powders are fully updated (except user-created records)
    - merge: only NULL fields on existing records are filled

    User-created records (data_source='manual') are NEVER overwritten. Instead,
    the imported version is created as a new record with ' (GRT Import)' suffix.
    """
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    content = await file.read()
    if not content:
        raise HTTPException(400, "Empty file")

    # Size limit: 10 MB
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10 MB)")

    filename_lower = file.filename.lower()

    # Parse the file(s)
    grt_list: list[dict] = []
    parse_errors: list[str] = []

    if filename_lower.endswith(".zip"):
        try:
            grt_list = parse_propellant_zip(content)
        except ValueError as e:
            raise HTTPException(400, str(e))
    elif filename_lower.endswith(".propellant"):
        try:
            grt_list = [parse_propellant_file(content)]
        except ValueError as e:
            raise HTTPException(400, str(e))
    else:
        raise HTTPException(400, "Unsupported file type. Use .propellant or .zip")

    # Convert and insert
    created: list[Powder] = []
    updated: list[Powder] = []
    skipped: list[str] = []

    # Pre-fetch existing powders for duplicate detection
    existing_result = await db.execute(select(Powder))
    existing_powders = {p.name.lower(): p for p in existing_result.scalars().all()}

    for grt_params in grt_list:
        try:
            powder_data = convert_grt_to_powder(grt_params)
        except (KeyError, ValueError, TypeError) as e:
            parse_errors.append(f"{grt_params.get('pname', '?')}: conversion error - {e}")
            continue

        name = powder_data["name"]
        existing = existing_powders.get(name.lower())

        if existing:
            # User-created records are NEVER overwritten
            if existing.data_source == "manual":
                # Create a renamed copy instead
                new_name = f"{name} (GRT Import)"
                powder = Powder(**powder_data)
                powder.name = new_name
                powder.data_source = "grt_community"
                powder_dict = {c.key: getattr(powder, c.key) for c in Powder.__table__.columns}
                breakdown = compute_quality_score(powder_dict, powder.data_source)
                powder.quality_score = breakdown.score
                db.add(powder)
                existing_powders[new_name.lower()] = powder
                created.append(powder)
            elif mode == ImportMode.skip:
                skipped.append(name)
            elif mode == ImportMode.overwrite:
                # Update ALL fields on existing record
                for key, value in powder_data.items():
                    if hasattr(existing, key) and key not in ("name",):
                        setattr(existing, key, value)
                existing.data_source = "grt_community"
                powder_dict = {c.key: getattr(existing, c.key) for c in Powder.__table__.columns}
                breakdown = compute_quality_score(powder_dict, existing.data_source)
                existing.quality_score = breakdown.score
                updated.append(existing)
            elif mode == ImportMode.merge:
                # Only update fields that are currently NULL
                for key, value in powder_data.items():
                    if hasattr(existing, key) and getattr(existing, key) is None and value is not None:
                        setattr(existing, key, value)
                # Leave data_source unchanged for merge
                powder_dict = {c.key: getattr(existing, c.key) for c in Powder.__table__.columns}
                breakdown = compute_quality_score(powder_dict, existing.data_source)
                existing.quality_score = breakdown.score
                updated.append(existing)
        else:
            powder = Powder(**powder_data)
            powder.data_source = "grt_community"
            powder_dict = {c.key: getattr(powder, c.key) for c in Powder.__table__.columns}
            breakdown = compute_quality_score(powder_dict, powder.data_source)
            powder.quality_score = breakdown.score
            db.add(powder)
            existing_powders[name.lower()] = powder
            created.append(powder)

    # Apply alias groups from powder_aliases.json to created + updated powders
    alias_map = _load_alias_map()
    aliases_linked = 0
    for powder in created + updated:
        group = alias_map.get(powder.name.lower())
        if group:
            powder.alias_group = group
            aliases_linked += 1

    if created or updated:
        await db.commit()
        for p in created + updated:
            await db.refresh(p)

    logger.info("GRT import (mode=%s): %d created, %d updated, %d skipped, %d errors, %d aliases linked",
                mode.value, len(created), len(updated), len(skipped), len(parse_errors), aliases_linked)

    return GrtImportResult(
        created=[PowderResponse.model_validate(p) for p in created],
        updated=[PowderResponse.model_validate(p) for p in updated],
        skipped=skipped,
        errors=parse_errors,
        mode=mode.value,
        aliases_linked=aliases_linked,
    )


@router.get("/{powder_id}/aliases", response_model=list[PowderResponse])
async def get_powder_aliases(powder_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Return other powders in the same alias group as the given powder."""
    powder = await db.get(Powder, powder_id)
    if not powder:
        raise HTTPException(404, "Powder not found")
    if not powder.alias_group:
        return []
    result = await db.execute(
        select(Powder).where(Powder.alias_group == powder.alias_group, Powder.id != powder_id)
    )
    return list(result.scalars().all())


@router.get("/{powder_id}", response_model=PowderResponse)
async def get_powder(powder_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    powder = await db.get(Powder, powder_id)
    if not powder:
        raise HTTPException(404, "Powder not found")
    return powder


@router.put("/{powder_id}", response_model=PowderResponse)
async def update_powder(powder_id: uuid.UUID, data: PowderUpdate, db: AsyncSession = Depends(get_db)):
    powder = await db.get(Powder, powder_id)
    if not powder:
        raise HTTPException(404, "Powder not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(powder, key, value)

    # Track source modification: GRT -> grt_modified on edit
    if powder.data_source == "grt_community":
        powder.data_source = "grt_modified"

    # Recompute quality score
    powder_dict = {c.key: getattr(powder, c.key) for c in Powder.__table__.columns}
    breakdown = compute_quality_score(powder_dict, powder.data_source)
    powder.quality_score = breakdown.score

    await db.commit()
    await db.refresh(powder)
    return powder


@router.delete("/{powder_id}", status_code=204)
async def delete_powder(powder_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    powder = await db.get(Powder, powder_id)
    if not powder:
        raise HTTPException(404, "Powder not found")
    await db.delete(powder)
    await db.commit()
