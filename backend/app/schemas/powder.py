import uuid
from typing import Any

from pydantic import BaseModel, Field, computed_field


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
    grt_params: dict[str, Any] | None = Field(None, description="Raw GRT parameters for reference")

    # 3-curve GRT parameters (optional)
    ba: float | None = Field(None, ge=0.01, le=10.0, description="GRT vivacity coefficient")
    bp: float | None = Field(None, ge=0.0, le=1.0, description="Progressivity factor")
    br: float | None = Field(None, ge=0.0, le=1.0, description="Brisance factor")
    brp: float | None = Field(None, ge=0.0, le=1.0, description="Combined Bp/Br factor")
    z1: float | None = Field(None, ge=0.01, le=0.99, description="Phase 1/2 burn-up limit")
    z2: float | None = Field(None, ge=0.02, le=0.99, description="Phase 2/3 burn-up limit")
    a0: float | None = Field(None, ge=0.0, le=20.0, description="Ba(phi) coefficient 0")

    # Data provenance
    data_source: str = Field(default="manual", description="Data source provenance")
    web_thickness_mm: float | None = Field(default=None, ge=0.1, le=2.0, description="Propellant grain web thickness (mm)")


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

    # 3-curve GRT parameters (optional)
    ba: float | None = Field(None, ge=0.01, le=10.0, description="GRT vivacity coefficient")
    bp: float | None = Field(None, ge=0.0, le=1.0, description="Progressivity factor")
    br: float | None = Field(None, ge=0.0, le=1.0, description="Brisance factor")
    brp: float | None = Field(None, ge=0.0, le=1.0, description="Combined Bp/Br factor")
    z1: float | None = Field(None, ge=0.01, le=0.99, description="Phase 1/2 burn-up limit")
    z2: float | None = Field(None, ge=0.02, le=0.99, description="Phase 2/3 burn-up limit")
    a0: float | None = Field(None, ge=0.0, le=20.0, description="Ba(phi) coefficient 0")

    # Data provenance (optional on update)
    data_source: str | None = None
    web_thickness_mm: float | None = Field(None, ge=0.1, le=2.0, description="Propellant grain web thickness (mm)")


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
    grt_params: dict[str, Any] | None = None

    # 3-curve GRT parameters (optional)
    ba: float | None = None
    bp: float | None = None
    br: float | None = None
    brp: float | None = None
    z1: float | None = None
    z2: float | None = None
    a0: float | None = None

    # Data provenance and quality
    data_source: str = "manual"
    quality_score: int = 0
    web_thickness_mm: float | None = None

    @computed_field
    @property
    def has_3curve(self) -> bool:
        """True if all 6 core 3-curve parameters are present."""
        return all(v is not None for v in [self.ba, self.bp, self.br, self.brp, self.z1, self.z2])

    @computed_field
    @property
    def quality_level(self) -> str:
        """Map score to badge color: green/yellow/red."""
        if self.quality_score >= 70:
            return "success"
        elif self.quality_score >= 40:
            return "warning"
        return "danger"

    @computed_field
    @property
    def quality_tooltip(self) -> str:
        """One-line summary for hover tooltip."""
        from app.core.quality import compute_quality_score, CRITICAL_FIELDS, BONUS_FIELDS

        # Build dict manually to avoid model_dump() recursion (computed fields call model_dump)
        powder_dict = {f: getattr(self, f) for f in CRITICAL_FIELDS + BONUS_FIELDS}
        breakdown = compute_quality_score(powder_dict, self.data_source)

        source_labels = {
            "manufacturer": "Fabricante",
            "grt_community": "GRT Community",
            "grt_modified": "GRT Modificado",
            "manual": "Manual",
            "estimated": "Estimado",
        }
        source_label = source_labels.get(self.data_source, self.data_source)

        missing_str = ", ".join(breakdown.missing_fields[:3])
        if len(breakdown.missing_fields) > 3:
            missing_str += f" (+{len(breakdown.missing_fields) - 3})"

        parts = [
            f"{breakdown.score}/100",
            source_label,
            f"{breakdown.filled_count}/{breakdown.total_count} campos",
        ]
        if breakdown.missing_fields:
            parts.append(f"faltan: {missing_str}")
        return " \u2014 ".join(parts)

    model_config = {"from_attributes": True}


class GrtImportResult(BaseModel):
    created: list[PowderResponse] = Field(default_factory=list)
    skipped: list[str] = Field(default_factory=list, description="Names skipped (already exist)")
    errors: list[str] = Field(default_factory=list, description="Parse/conversion errors")
