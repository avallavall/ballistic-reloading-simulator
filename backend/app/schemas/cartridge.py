import uuid

from pydantic import BaseModel, Field


class CartridgeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    saami_max_pressure_psi: float = Field(gt=0, le=200_000, description="SAAMI max avg pressure (psi), typically 50k-65k")
    cip_max_pressure_mpa: float | None = Field(None, gt=0, le=1400, description="CIP max pressure (MPa)")
    case_capacity_grains_h2o: float = Field(gt=0, le=500, description="Case water capacity (grains H2O)")
    case_length_mm: float = Field(gt=0, le=150, description="Case length (mm)")
    overall_length_mm: float = Field(gt=0, le=200, description="Cartridge overall length (mm)")
    bore_diameter_mm: float = Field(gt=0, le=20, description="Bore diameter (mm)")
    groove_diameter_mm: float = Field(gt=0, le=20, description="Groove diameter (mm)")


class CartridgeUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    saami_max_pressure_psi: float | None = Field(None, gt=0, le=200_000)
    cip_max_pressure_mpa: float | None = Field(None, gt=0, le=1400)
    case_capacity_grains_h2o: float | None = Field(None, gt=0, le=500)
    case_length_mm: float | None = Field(None, gt=0, le=150)
    overall_length_mm: float | None = Field(None, gt=0, le=200)
    bore_diameter_mm: float | None = Field(None, gt=0, le=20)
    groove_diameter_mm: float | None = Field(None, gt=0, le=20)


class CartridgeResponse(BaseModel):
    id: uuid.UUID
    name: str
    saami_max_pressure_psi: float
    cip_max_pressure_mpa: float | None
    case_capacity_grains_h2o: float
    case_length_mm: float
    overall_length_mm: float
    bore_diameter_mm: float
    groove_diameter_mm: float

    model_config = {"from_attributes": True}
