from sqlalchemy import Column, Float, String

from app.models.base import Base, UUIDMixin


class Bullet(UUIDMixin, Base):
    __tablename__ = "bullets"

    name = Column(String(100), nullable=False, unique=True)
    manufacturer = Column(String(100), nullable=False)
    weight_grains = Column(Float, nullable=False)
    diameter_mm = Column(Float, nullable=False)
    length_mm = Column(Float, nullable=False)
    bc_g1 = Column(Float, nullable=False)
    bc_g7 = Column(Float, nullable=True)
    sectional_density = Column(Float, nullable=False)
    material = Column(String(50), nullable=False, default="copper")
