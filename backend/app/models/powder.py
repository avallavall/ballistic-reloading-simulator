from sqlalchemy import JSON, Column, Float, Integer, String

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

    # GRT 3-curve burn model parameters (optional)
    ba = Column(Float, nullable=True)    # GRT vivacity coefficient
    bp = Column(Float, nullable=True)    # Progressivity factor
    br = Column(Float, nullable=True)    # Brisance factor
    brp = Column(Float, nullable=True)   # Combined factor
    z1 = Column(Float, nullable=True)    # Phase 1/2 transition
    z2 = Column(Float, nullable=True)    # Phase 2/3 transition
    a0 = Column(Float, nullable=True)    # Ba(phi) coefficient 0

    # Import pipeline fields
    alias_group = Column(String(100), nullable=True, index=True)

    # Data provenance and quality scoring
    data_source = Column(String(20), nullable=False, default="manual")
    quality_score = Column(Integer, nullable=False, default=0)
    web_thickness_mm = Column(Float, nullable=True)
