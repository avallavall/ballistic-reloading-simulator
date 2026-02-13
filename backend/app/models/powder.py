from sqlalchemy import JSON, Column, Float, String

from app.models.base import Base, UUIDMixin


class Powder(UUIDMixin, Base):
    __tablename__ = "powders"

    name = Column(String(100), nullable=False, unique=True)
    manufacturer = Column(String(100), nullable=False)
    burn_rate_relative = Column(Float, nullable=False)
    force_constant_j_kg = Column(Float, nullable=False)
    covolume_m3_kg = Column(Float, nullable=False)
    flame_temp_k = Column(Float, nullable=False)
    gamma = Column(Float, nullable=False)
    density_g_cm3 = Column(Float, nullable=False)
    burn_rate_coeff = Column(Float, nullable=False)
    burn_rate_exp = Column(Float, nullable=False)
    grt_params = Column(JSON, nullable=True)
