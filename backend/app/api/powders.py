import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.grt_converter import convert_grt_to_powder
from app.core.grt_parser import parse_propellant_file, parse_propellant_zip
from app.db.session import get_db
from app.models.powder import Powder
from app.schemas.powder import GrtImportResult, PowderCreate, PowderResponse, PowderUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/powders", tags=["powders"])


@router.get("", response_model=list[PowderResponse])
async def list_powders(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Powder).order_by(Powder.name))
    return result.scalars().all()


@router.post("", response_model=PowderResponse, status_code=201)
async def create_powder(data: PowderCreate, db: AsyncSession = Depends(get_db)):
    powder = Powder(**data.model_dump())
    db.add(powder)
    await db.commit()
    await db.refresh(powder)
    return powder


@router.post("/import-grt", response_model=GrtImportResult)
async def import_grt(file: UploadFile, db: AsyncSession = Depends(get_db)):
    """Import powders from a GRT .propellant file or a .zip of .propellant files.

    Parses the file, converts GRT parameters to our internal format, and creates
    powder records. Powders whose names already exist in the DB are skipped.
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
    skipped: list[str] = []

    # Pre-fetch existing powder names for duplicate detection
    existing_result = await db.execute(select(Powder.name))
    existing_names = {row[0].lower() for row in existing_result.all()}

    for grt_params in grt_list:
        try:
            powder_data = convert_grt_to_powder(grt_params)
        except (KeyError, ValueError, TypeError) as e:
            parse_errors.append(f"{grt_params.get('pname', '?')}: conversion error - {e}")
            continue

        name = powder_data["name"]
        if name.lower() in existing_names:
            skipped.append(name)
            continue

        powder = Powder(**powder_data)
        db.add(powder)
        existing_names.add(name.lower())
        created.append(powder)

    if created:
        await db.commit()
        for p in created:
            await db.refresh(p)

    logger.info("GRT import: %d created, %d skipped, %d errors",
                len(created), len(skipped), len(parse_errors))

    return GrtImportResult(
        created=[PowderResponse.model_validate(p) for p in created],
        skipped=skipped,
        errors=parse_errors,
    )


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
