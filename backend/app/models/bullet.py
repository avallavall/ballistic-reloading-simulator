from sqlalchemy import Column, Float, Integer, String

from app.models.base import Base, UUIDMixin


class Bullet(UUIDMixin, Base):
    __tablename__ = "bullets"

    name = Column(String(100), nullable=False, unique=True)
    manufacturer = Column(String(100), nullable=False)
    weight_grains = Column(Float, nullable=False)
    diameter_mm = Column(Float, nullable=False)
    length_mm = Column(Float, nullable=True)
    bc_g1 = Column(Float, nullable=False)
    bc_g7 = Column(Float, nullable=True)
    sectional_density = Column(Float, nullable=False)
    material = Column(String(50), nullable=False, default="copper")

    # Extended manufacturer fields (import pipeline)
    model_number = Column(String(50), nullable=True)
    bullet_type = Column(String(30), nullable=True)
    base_type = Column(String(50), nullable=True)

    # Rendering dimension fields (geometry engine / SVG / 3D)
    bearing_surface_mm = Column(Float, nullable=True)
    boat_tail_length_mm = Column(Float, nullable=True)
    meplat_diameter_mm = Column(Float, nullable=True)
    ogive_type = Column(String(20), nullable=True)  # tangent, secant, hybrid, flat_nose, round_nose, spitzer

    # Velocity-banded BC fields (Sierra-style)
    bc_g1_high = Column(Float, nullable=True)
    bc_g1_mid = Column(Float, nullable=True)
    bc_g1_low = Column(Float, nullable=True)
    bc_g1_high_vel = Column(Float, nullable=True)  # fps threshold for high BC
    bc_g1_mid_vel = Column(Float, nullable=True)   # fps threshold for mid BC

    # Data provenance and quality scoring
    data_source = Column(String(20), nullable=False, default="manual")
    quality_score = Column(Integer, nullable=False, default=0)
    caliber_family = Column(String(20), nullable=True)
