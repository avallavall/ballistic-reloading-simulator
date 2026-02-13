import uuid

from pydantic import BaseModel, Field


class RifleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    barrel_length_mm: float = Field(gt=0, le=2000, description="Barrel length (mm), typical 400-700")
    twist_rate_mm: float = Field(gt=0, le=1000, description="Twist rate (mm per turn)")
    cartridge_id: uuid.UUID
    chamber_volume_mm3: float = Field(gt=0, le=50_000, description="Chamber volume (mm3)")
    weight_kg: float = Field(default=3.5, gt=0, le=30, description="Rifle weight (kg), typical 3-6")
    barrel_condition: str = Field(default="new", max_length=20)
    round_count: int = Field(default=0, ge=0, le=100_000)


class RifleUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    barrel_length_mm: float | None = Field(None, gt=0, le=2000)
    twist_rate_mm: float | None = Field(None, gt=0, le=1000)
    cartridge_id: uuid.UUID | None = None
    chamber_volume_mm3: float | None = Field(None, gt=0, le=50_000)
    weight_kg: float | None = Field(None, gt=0, le=30)
    barrel_condition: str | None = Field(None, max_length=20)
    round_count: int | None = Field(None, ge=0, le=100_000)


class RifleResponse(BaseModel):
    id: uuid.UUID
    name: str
    barrel_length_mm: float
    twist_rate_mm: float
    cartridge_id: uuid.UUID
    chamber_volume_mm3: float
    weight_kg: float
    barrel_condition: str
    round_count: int

    model_config = {"from_attributes": True}
