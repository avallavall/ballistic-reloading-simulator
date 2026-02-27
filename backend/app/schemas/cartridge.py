import uuid

from pydantic import BaseModel, Field, computed_field


class CartridgeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    saami_max_pressure_psi: float = Field(gt=0, le=200_000, description="SAAMI max avg pressure (psi), typically 50k-65k")
    cip_max_pressure_mpa: float | None = Field(None, gt=0, le=1400, description="CIP max pressure (MPa)")
    case_capacity_grains_h2o: float = Field(gt=0, le=500, description="Case water capacity (grains H2O)")
    case_length_mm: float = Field(gt=0, le=150, description="Case length (mm)")
    overall_length_mm: float = Field(gt=0, le=200, description="Cartridge overall length (mm)")
    bore_diameter_mm: float = Field(gt=0, le=20, description="Bore diameter (mm)")
    groove_diameter_mm: float = Field(gt=0, le=20, description="Groove diameter (mm)")

    # Extended dimension and lineage fields (import pipeline)
    parent_cartridge_name: str | None = Field(None, max_length=100, description="Parent cartridge name for lineage")
    shoulder_diameter_mm: float | None = Field(None, gt=0, le=20)
    neck_diameter_mm: float | None = Field(None, gt=0, le=20)
    base_diameter_mm: float | None = Field(None, gt=0, le=20)
    rim_diameter_mm: float | None = Field(None, gt=0, le=20)

    # Drawing dimension fields
    shoulder_angle_deg: float | None = Field(None, gt=0, le=90, description="Shoulder angle (degrees)")
    neck_length_mm: float | None = Field(None, gt=0, le=50, description="Neck length (mm)")
    body_length_mm: float | None = Field(None, gt=0, le=100, description="Body length (mm)")
    rim_thickness_mm: float | None = Field(None, gt=0, le=5, description="Rim thickness (mm)")
    case_type: str | None = Field(None, max_length=20, description="Case type: rimless, belted, rimmed, rebated, semi_rimmed, straight_wall")

    # Data provenance
    data_source: str = Field(default="manual", description="Data source provenance")


class CartridgeUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    saami_max_pressure_psi: float | None = Field(None, gt=0, le=200_000)
    cip_max_pressure_mpa: float | None = Field(None, gt=0, le=1400)
    case_capacity_grains_h2o: float | None = Field(None, gt=0, le=500)
    case_length_mm: float | None = Field(None, gt=0, le=150)
    overall_length_mm: float | None = Field(None, gt=0, le=200)
    bore_diameter_mm: float | None = Field(None, gt=0, le=20)
    groove_diameter_mm: float | None = Field(None, gt=0, le=20)

    # Extended dimension and lineage fields (import pipeline)
    parent_cartridge_name: str | None = Field(None, max_length=100, description="Parent cartridge name for lineage")
    shoulder_diameter_mm: float | None = Field(None, gt=0, le=20)
    neck_diameter_mm: float | None = Field(None, gt=0, le=20)
    base_diameter_mm: float | None = Field(None, gt=0, le=20)
    rim_diameter_mm: float | None = Field(None, gt=0, le=20)

    # Drawing dimension fields
    shoulder_angle_deg: float | None = Field(None, gt=0, le=90, description="Shoulder angle (degrees)")
    neck_length_mm: float | None = Field(None, gt=0, le=50, description="Neck length (mm)")
    body_length_mm: float | None = Field(None, gt=0, le=100, description="Body length (mm)")
    rim_thickness_mm: float | None = Field(None, gt=0, le=5, description="Rim thickness (mm)")
    case_type: str | None = Field(None, max_length=20, description="Case type: rimless, belted, rimmed, rebated, semi_rimmed, straight_wall")

    # Data provenance (optional on update)
    data_source: str | None = None


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

    # Extended dimension and lineage fields
    parent_cartridge_name: str | None = None
    shoulder_diameter_mm: float | None = None
    neck_diameter_mm: float | None = None
    base_diameter_mm: float | None = None
    rim_diameter_mm: float | None = None

    # Drawing dimension fields
    shoulder_angle_deg: float | None = None
    neck_length_mm: float | None = None
    body_length_mm: float | None = None
    rim_thickness_mm: float | None = None
    case_type: str | None = None

    # Data provenance and quality
    data_source: str = "manual"
    quality_score: int = 0
    caliber_family: str | None = None

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
        from app.core.quality import (
            compute_cartridge_quality_score,
            CARTRIDGE_CRITICAL_FIELDS,
            CARTRIDGE_BONUS_FIELDS,
        )

        # Build dict manually to avoid model_dump() recursion (computed fields call model_dump)
        cartridge_dict = {f: getattr(self, f, None) for f in CARTRIDGE_CRITICAL_FIELDS + CARTRIDGE_BONUS_FIELDS}
        breakdown = compute_cartridge_quality_score(cartridge_dict, self.data_source)

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


class PaginatedCartridgeResponse(BaseModel):
    items: list[CartridgeResponse]
    total: int
    page: int
    size: int


class CartridgeImportRequest(BaseModel):
    """Batch import request for cartridges."""
    cartridges: list[CartridgeCreate]
