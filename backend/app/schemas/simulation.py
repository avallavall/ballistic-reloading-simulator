import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class SimulationRequest(BaseModel):
    load_id: uuid.UUID


class LadderTestRequest(BaseModel):
    powder_id: uuid.UUID
    bullet_id: uuid.UUID
    rifle_id: uuid.UUID
    coal_mm: float = Field(gt=0, le=200)
    seating_depth_mm: float = Field(gt=0, le=50)
    charge_start_grains: float = Field(gt=0, le=200)
    charge_end_grains: float = Field(gt=0, le=200)
    charge_step_grains: float = Field(gt=0, le=2.0)


class SimulationResultResponse(BaseModel):
    id: uuid.UUID
    load_id: uuid.UUID
    peak_pressure_psi: float
    muzzle_velocity_fps: float
    pressure_curve: list[dict]
    velocity_curve: list[dict]
    barrel_time_ms: float
    is_safe: bool
    warnings: list[str]
    hoop_stress_mpa: float = 0.0
    case_expansion_mm: float = 0.0
    erosion_per_shot_mm: float = 0.0
    barrel_frequency_hz: float = 0.0
    optimal_barrel_times: list[float] | None = None
    obt_match: bool = False
    recoil_energy_ft_lbs: float = 0.0
    recoil_impulse_ns: float = 0.0
    recoil_velocity_fps: float = 0.0
    created_at: datetime

    model_config = {"from_attributes": True}


class DirectSimulationRequest(BaseModel):
    powder_id: uuid.UUID
    bullet_id: uuid.UUID
    rifle_id: uuid.UUID
    powder_charge_grains: float = Field(gt=0, le=200, description="Powder charge (grains)")
    coal_mm: float = Field(gt=0, le=200, description="Cartridge overall length (mm)")
    seating_depth_mm: float = Field(gt=0, le=50, description="Bullet seating depth (mm)")


class DirectSimulationResponse(BaseModel):
    peak_pressure_psi: float
    muzzle_velocity_fps: float
    pressure_curve: list[dict]
    velocity_curve: list[dict]
    barrel_time_ms: float
    is_safe: bool
    warnings: list[str]
    hoop_stress_mpa: float = 0.0
    case_expansion_mm: float = 0.0
    erosion_per_shot_mm: float = 0.0
    barrel_frequency_hz: float = 0.0
    optimal_barrel_times: list[float] | None = None
    obt_match: bool = False
    recoil_energy_ft_lbs: float = 0.0
    recoil_impulse_ns: float = 0.0
    recoil_velocity_fps: float = 0.0


class LadderTestResponse(BaseModel):
    results: list[DirectSimulationResponse]
    charge_weights: list[float]
