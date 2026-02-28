from sqlalchemy import Column, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin


class Rifle(UUIDMixin, Base):
    __tablename__ = "rifles"

    name = Column(String(100), nullable=False)
    barrel_length_mm = Column(Float, nullable=False)
    twist_rate_mm = Column(Float, nullable=False)
    cartridge_id = Column(UUID(as_uuid=True), ForeignKey("cartridges.id"), nullable=False)
    chamber_volume_mm3 = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=False, default=3.5)
    barrel_condition = Column(String(20), nullable=False, default="new")
    round_count = Column(Integer, nullable=False, default=0)

    # Chamber drawing fields (nullable - optional for technical drawings)
    freebore_mm = Column(Float, nullable=True)       # Unrifled lead before rifling
    throat_angle_deg = Column(Float, nullable=True)   # Angle of leade/throat
    headspace_mm = Column(Float, nullable=True)       # How much case floats in chamber

    # Rifling fields (nullable - optional)
    groove_count = Column(Integer, nullable=True)     # Number of rifling grooves (4, 5, 6)
    twist_direction = Column(String(10), nullable=True)  # "right" or "left"

    cartridge = relationship("Cartridge", lazy="selectin")
