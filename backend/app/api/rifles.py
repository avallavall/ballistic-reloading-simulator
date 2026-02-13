import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.rifle import Rifle
from app.schemas.rifle import RifleCreate, RifleResponse, RifleUpdate

router = APIRouter(prefix="/rifles", tags=["rifles"])


@router.get("", response_model=list[RifleResponse])
async def list_rifles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Rifle).order_by(Rifle.name))
    return result.scalars().all()


@router.post("", response_model=RifleResponse, status_code=201)
async def create_rifle(data: RifleCreate, db: AsyncSession = Depends(get_db)):
    rifle = Rifle(**data.model_dump())
    db.add(rifle)
    await db.commit()
    await db.refresh(rifle)
    return rifle


@router.get("/{rifle_id}", response_model=RifleResponse)
async def get_rifle(rifle_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    rifle = await db.get(Rifle, rifle_id)
    if not rifle:
        raise HTTPException(404, "Rifle not found")
    return rifle


@router.put("/{rifle_id}", response_model=RifleResponse)
async def update_rifle(rifle_id: uuid.UUID, data: RifleUpdate, db: AsyncSession = Depends(get_db)):
    rifle = await db.get(Rifle, rifle_id)
    if not rifle:
        raise HTTPException(404, "Rifle not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(rifle, key, value)
    await db.commit()
    await db.refresh(rifle)
    return rifle


@router.delete("/{rifle_id}", status_code=204)
async def delete_rifle(rifle_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    rifle = await db.get(Rifle, rifle_id)
    if not rifle:
        raise HTTPException(404, "Rifle not found")
    await db.delete(rifle)
    await db.commit()
