import uuid

from pydantic import BaseModel, Field


class BulletCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    manufacturer: str = Field(min_length=1, max_length=100)
    weight_grains: float = Field(gt=0, le=1000, description="Bullet weight (grains), typical 40-300")
    diameter_mm: float = Field(gt=0, le=20, description="Bullet diameter (mm), typical 5.56-12.7")
    length_mm: float = Field(gt=0, le=100, description="Bullet length (mm)")
    bc_g1: float = Field(gt=0, le=2.0, description="Ballistic coefficient G1 model")
    bc_g7: float | None = Field(None, gt=0, le=2.0, description="Ballistic coefficient G7 model")
    sectional_density: float = Field(gt=0, le=1.0, description="Sectional density (lb/in2)")
    material: str = Field(default="copper", max_length=50)


class BulletUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    manufacturer: str | None = Field(None, min_length=1, max_length=100)
    weight_grains: float | None = Field(None, gt=0, le=1000)
    diameter_mm: float | None = Field(None, gt=0, le=20)
    length_mm: float | None = Field(None, gt=0, le=100)
    bc_g1: float | None = Field(None, gt=0, le=2.0)
    bc_g7: float | None = Field(None, gt=0, le=2.0)
    sectional_density: float | None = Field(None, gt=0, le=1.0)
    material: str | None = Field(None, max_length=50)


class BulletResponse(BaseModel):
    id: uuid.UUID
    name: str
    manufacturer: str
    weight_grains: float
    diameter_mm: float
    length_mm: float
    bc_g1: float
    bc_g7: float | None
    sectional_density: float
    material: str

    model_config = {"from_attributes": True}
