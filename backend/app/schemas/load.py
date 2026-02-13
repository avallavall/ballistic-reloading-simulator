import uuid

from pydantic import BaseModel, Field


class LoadCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    powder_id: uuid.UUID
    bullet_id: uuid.UUID
    rifle_id: uuid.UUID
    powder_charge_grains: float = Field(gt=0, le=200, description="Powder charge (grains), typical 20-80")
    coal_mm: float = Field(gt=0, le=200, description="Cartridge overall length (mm)")
    seating_depth_mm: float = Field(gt=0, le=50, description="Bullet seating depth (mm)")
    notes: str | None = Field(None, max_length=1000)


class LoadUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    powder_id: uuid.UUID | None = None
    bullet_id: uuid.UUID | None = None
    rifle_id: uuid.UUID | None = None
    powder_charge_grains: float | None = Field(None, gt=0, le=200)
    coal_mm: float | None = Field(None, gt=0, le=200)
    seating_depth_mm: float | None = Field(None, gt=0, le=50)
    notes: str | None = Field(None, max_length=1000)


class LoadResponse(BaseModel):
    id: uuid.UUID
    name: str
    powder_id: uuid.UUID
    bullet_id: uuid.UUID
    rifle_id: uuid.UUID
    powder_charge_grains: float
    coal_mm: float
    seating_depth_mm: float
    notes: str | None

    model_config = {"from_attributes": True}
