from sqlalchemy import Column, Float, String

from app.models.base import Base, UUIDMixin


class Cartridge(UUIDMixin, Base):
    __tablename__ = "cartridges"

    name = Column(String(100), nullable=False, unique=True)
    saami_max_pressure_psi = Column(Float, nullable=False)
    cip_max_pressure_mpa = Column(Float, nullable=True)
    case_capacity_grains_h2o = Column(Float, nullable=False)
    case_length_mm = Column(Float, nullable=False)
    overall_length_mm = Column(Float, nullable=False)
    bore_diameter_mm = Column(Float, nullable=False)
    groove_diameter_mm = Column(Float, nullable=False)
