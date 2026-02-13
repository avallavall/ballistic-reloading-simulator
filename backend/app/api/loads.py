import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.load import Load
from app.schemas.load import LoadCreate, LoadResponse, LoadUpdate

router = APIRouter(prefix="/loads", tags=["loads"])


@router.get("", response_model=list[LoadResponse])
async def list_loads(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Load).order_by(Load.name))
    return result.scalars().all()


@router.post("", response_model=LoadResponse, status_code=201)
async def create_load(data: LoadCreate, db: AsyncSession = Depends(get_db)):
    load = Load(**data.model_dump())
    db.add(load)
    await db.commit()
    await db.refresh(load)
    return load


@router.get("/{load_id}", response_model=LoadResponse)
async def get_load(load_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    load = await db.get(Load, load_id)
    if not load:
        raise HTTPException(404, "Load not found")
    return load


@router.put("/{load_id}", response_model=LoadResponse)
async def update_load(load_id: uuid.UUID, data: LoadUpdate, db: AsyncSession = Depends(get_db)):
    load = await db.get(Load, load_id)
    if not load:
        raise HTTPException(404, "Load not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(load, key, value)
    await db.commit()
    await db.refresh(load)
    return load


@router.delete("/{load_id}", status_code=204)
async def delete_load(load_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    load = await db.get(Load, load_id)
    if not load:
        raise HTTPException(404, "Load not found")
    await db.delete(load)
    await db.commit()
