import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.bullet import Bullet
from app.schemas.bullet import BulletCreate, BulletResponse, BulletUpdate

router = APIRouter(prefix="/bullets", tags=["bullets"])


@router.get("", response_model=list[BulletResponse])
async def list_bullets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Bullet).order_by(Bullet.name))
    return result.scalars().all()


@router.post("", response_model=BulletResponse, status_code=201)
async def create_bullet(data: BulletCreate, db: AsyncSession = Depends(get_db)):
    bullet = Bullet(**data.model_dump())
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
