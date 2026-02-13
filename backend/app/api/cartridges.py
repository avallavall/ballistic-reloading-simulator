import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.cartridge import Cartridge
from app.schemas.cartridge import CartridgeCreate, CartridgeResponse, CartridgeUpdate

router = APIRouter(prefix="/cartridges", tags=["cartridges"])


@router.get("", response_model=list[CartridgeResponse])
async def list_cartridges(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Cartridge).order_by(Cartridge.name))
    return result.scalars().all()


@router.post("", response_model=CartridgeResponse, status_code=201)
async def create_cartridge(data: CartridgeCreate, db: AsyncSession = Depends(get_db)):
    cartridge = Cartridge(**data.model_dump())
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
