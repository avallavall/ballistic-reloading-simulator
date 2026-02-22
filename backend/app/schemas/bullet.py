import uuid

from pydantic import BaseModel, Field, computed_field


class BulletCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    manufacturer: str = Field(min_length=1, max_length=100)
    weight_grains: float = Field(gt=0, le=1000, description="Bullet weight (grains), typical 40-300")
    diameter_mm: float = Field(gt=0, le=20, description="Bullet diameter (mm), typical 5.56-12.7")
    length_mm: float | None = Field(None, gt=0, le=100, description="Bullet length (mm), nullable for incomplete data")
    bc_g1: float = Field(gt=0, le=2.0, description="Ballistic coefficient G1 model")
    bc_g7: float | None = Field(None, gt=0, le=2.0, description="Ballistic coefficient G7 model")
    sectional_density: float = Field(gt=0, le=1.0, description="Sectional density (lb/in2)")
    material: str = Field(default="copper", max_length=50)

    # Extended manufacturer fields (import pipeline)
    model_number: str | None = Field(None, max_length=50, description="Manufacturer part number")
    bullet_type: str | None = Field(None, max_length=30, description="Type: match, hunting, target")
    base_type: str | None = Field(None, max_length=50, description="Base type: hollow_point_boat_tail, polymer_tip, flat_base, etc.")

    # Data provenance
    data_source: str = Field(default="manual", description="Data source provenance")


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

    # Extended manufacturer fields (import pipeline)
    model_number: str | None = Field(None, max_length=50, description="Manufacturer part number")
    bullet_type: str | None = Field(None, max_length=30, description="Type: match, hunting, target")
    base_type: str | None = Field(None, max_length=50, description="Base type: hollow_point_boat_tail, polymer_tip, flat_base, etc.")

    # Data provenance (optional on update)
    data_source: str | None = None


class BulletResponse(BaseModel):
    id: uuid.UUID
    name: str
    manufacturer: str
    weight_grains: float
    diameter_mm: float
    length_mm: float | None
    bc_g1: float
    bc_g7: float | None
    sectional_density: float
    material: str

    # Extended manufacturer fields
    model_number: str | None = None
    bullet_type: str | None = None
    base_type: str | None = None

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
            compute_bullet_quality_score,
            BULLET_CRITICAL_FIELDS,
            BULLET_BONUS_FIELDS,
        )

        # Build dict manually to avoid model_dump() recursion (computed fields call model_dump)
        bullet_dict = {f: getattr(self, f, None) for f in BULLET_CRITICAL_FIELDS + BULLET_BONUS_FIELDS}
        breakdown = compute_bullet_quality_score(bullet_dict, self.data_source)

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


class PaginatedBulletResponse(BaseModel):
    items: list[BulletResponse]
    total: int
    page: int
    size: int


class BulletImportRequest(BaseModel):
    """Batch import request for bullets."""
    bullets: list[BulletCreate]
