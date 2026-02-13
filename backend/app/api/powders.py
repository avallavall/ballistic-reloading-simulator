import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.powder import Powder
from app.schemas.powder import PowderCreate, PowderResponse, PowderUpdate

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
