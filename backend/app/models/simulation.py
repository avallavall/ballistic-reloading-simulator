from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin


class SimulationResult(UUIDMixin, Base):
    __tablename__ = "simulation_results"

    load_id = Column(UUID(as_uuid=True), ForeignKey("loads.id"), nullable=False)
    peak_pressure_psi = Column(Float, nullable=False)
    muzzle_velocity_fps = Column(Float, nullable=False)
    pressure_curve = Column(JSON, nullable=False)
    velocity_curve = Column(JSON, nullable=False)
    barrel_time_ms = Column(Float, nullable=False)
    is_safe = Column(Boolean, nullable=False)
    warnings = Column(JSON, nullable=False, default=list)
    hoop_stress_mpa = Column(Float, nullable=False, default=0.0)
    case_expansion_mm = Column(Float, nullable=False, default=0.0)
    erosion_per_shot_mm = Column(Float, nullable=False, default=0.0)
    barrel_frequency_hz = Column(Float, nullable=False, default=0.0)
    optimal_barrel_times = Column(JSON, nullable=True)
    obt_match = Column(Boolean, nullable=False, default=False)
    recoil_energy_ft_lbs = Column(Float, nullable=False, default=0.0)
    recoil_impulse_ns = Column(Float, nullable=False, default=0.0)
    recoil_velocity_fps = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    load = relationship("Load", lazy="selectin")
