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

    cartridge = relationship("Cartridge", lazy="selectin")
