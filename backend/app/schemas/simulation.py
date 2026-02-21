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
    burn_curve: list[dict] = []
    energy_curve: list[dict] = []
    temperature_curve: list[dict] = []
    recoil_curve: list[dict] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class DirectSimulationRequest(BaseModel):
    powder_id: uuid.UUID
    bullet_id: uuid.UUID
    rifle_id: uuid.UUID
    powder_charge_grains: float = Field(gt=0, le=200, description="Powder charge (grains)")
    coal_mm: float = Field(gt=0, le=200, description="Cartridge overall length (mm)")
    seating_depth_mm: float = Field(gt=0, le=50, description="Bullet seating depth (mm)")
    barrel_length_mm_override: float | None = Field(default=None, gt=100, le=1500, description="Optional barrel length override (mm). If provided, overrides the rifle's barrel length for this simulation only.")


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
    burn_curve: list[dict] = []
    energy_curve: list[dict] = []
    temperature_curve: list[dict] = []
    recoil_curve: list[dict] = []


class SensitivityRequest(BaseModel):
    powder_id: uuid.UUID
    bullet_id: uuid.UUID
    rifle_id: uuid.UUID
    powder_charge_grains: float = Field(gt=0, le=200, description="Center charge weight (grains)")
    coal_mm: float = Field(gt=0, le=200, description="Cartridge overall length (mm)")
    seating_depth_mm: float = Field(gt=0, le=50, description="Bullet seating depth (mm)")
    charge_delta_grains: float = Field(default=0.3, gt=0, le=5.0, description="Charge variation +/- (grains)")
    barrel_length_mm_override: float | None = Field(default=None, gt=100, le=1500, description="Optional barrel length override (mm)")


class SensitivityResponse(BaseModel):
    center: DirectSimulationResponse
    upper: DirectSimulationResponse
    lower: DirectSimulationResponse
    charge_center_grains: float
    charge_upper_grains: float
    charge_lower_grains: float


class LadderTestResponse(BaseModel):
    results: list[DirectSimulationResponse]
    charge_weights: list[float]


class ParametricSearchRequest(BaseModel):
    rifle_id: uuid.UUID
    bullet_id: uuid.UUID
    cartridge_id: uuid.UUID
    coal_mm: float = Field(gt=0, le=200, description="Cartridge overall length (mm)")
    seating_depth_mm: float = Field(default=0.0, ge=0, le=50, description="Bullet seating depth (mm)")
    charge_percent_min: float = Field(default=0.70, gt=0, le=1.0, description="Min charge as fraction of estimated max")
    charge_percent_max: float = Field(default=1.0, gt=0, le=1.0, description="Max charge as fraction of estimated max")
    charge_steps: int = Field(default=5, ge=2, le=20, description="Number of charge steps per powder")


class PowderChargeResult(BaseModel):
    charge_grains: float
    peak_pressure_psi: float
    muzzle_velocity_fps: float
    is_safe: bool


class PowderSearchResult(BaseModel):
    powder_id: uuid.UUID
    powder_name: str
    manufacturer: str
    optimal_charge_grains: float | None = None
    peak_pressure_psi: float = 0.0
    muzzle_velocity_fps: float = 0.0
    pressure_percent: float = 0.0
    efficiency: float = 0.0
    barrel_time_ms: float = 0.0
    recoil_energy_ft_lbs: float = 0.0
    recoil_impulse_ns: float = 0.0
    is_viable: bool = False
    all_results: list[PowderChargeResult] = []
    error: str | None = None


class ParametricSearchResponse(BaseModel):
    results: list[PowderSearchResult]
    rifle_name: str
    bullet_name: str
    cartridge_name: str
    saami_max_psi: float
    total_powders_tested: int
    viable_powders: int
    total_time_ms: float


# ============================================================
# Validation
# ============================================================

class ValidationLoadResult(BaseModel):
    load_id: str
    caliber: str
    bullet_desc: str
    powder_name: str
    charge_gr: float
    barrel_length_mm: float
    published_velocity_fps: float
    predicted_velocity_fps: float
    error_pct: float
    is_pass: bool
    source: str


class ValidationResponse(BaseModel):
    results: list[ValidationLoadResult]
    total_loads: int
    passing_loads: int
    pass_rate_pct: float
    mean_error_pct: float
    max_error_pct: float
    worst_load_id: str
