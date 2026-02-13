import uuid

from pydantic import BaseModel, Field


class PowderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    manufacturer: str = Field(min_length=1, max_length=100)
    burn_rate_relative: float = Field(ge=0, le=500)
    force_constant_j_kg: float = Field(gt=0, le=2_000_000, description="Force constant (J/kg), typically 800k-1.2M")
    covolume_m3_kg: float = Field(gt=0, le=0.01, description="Covolume (m3/kg), typically ~0.001")
    flame_temp_k: float = Field(gt=0, le=6000, description="Adiabatic flame temperature (K)")
    gamma: float = Field(gt=1.0, le=2.0, description="Ratio of specific heats, typically 1.2-1.3")
    density_g_cm3: float = Field(gt=0, le=3.0, description="Solid grain density (g/cm3), typically 1.55-1.65 for NC-based propellants. NOT bulk/loading density.")
    burn_rate_coeff: float = Field(gt=0, le=1.0, description="Vieille burn rate coefficient a")
    burn_rate_exp: float = Field(gt=0, le=2.0, description="Vieille burn rate exponent n, typically 0.6-1.0")


class PowderUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    manufacturer: str | None = Field(None, min_length=1, max_length=100)
    burn_rate_relative: float | None = Field(None, ge=0, le=500)
    force_constant_j_kg: float | None = Field(None, gt=0, le=2_000_000)
    covolume_m3_kg: float | None = Field(None, gt=0, le=0.01)
    flame_temp_k: float | None = Field(None, gt=0, le=6000)
    gamma: float | None = Field(None, gt=1.0, le=2.0)
    density_g_cm3: float | None = Field(None, gt=0, le=3.0)
    burn_rate_coeff: float | None = Field(None, gt=0, le=1.0)
    burn_rate_exp: float | None = Field(None, gt=0, le=2.0)


class PowderResponse(BaseModel):
    id: uuid.UUID
    name: str
    manufacturer: str
    burn_rate_relative: float
    force_constant_j_kg: float
    covolume_m3_kg: float
    flame_temp_k: float
    gamma: float
    density_g_cm3: float
    burn_rate_coeff: float
    burn_rate_exp: float

    model_config = {"from_attributes": True}
