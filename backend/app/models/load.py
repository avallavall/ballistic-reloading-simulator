from sqlalchemy import Column, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin


class Load(UUIDMixin, Base):
    __tablename__ = "loads"

    name = Column(String(100), nullable=False)
    powder_id = Column(UUID(as_uuid=True), ForeignKey("powders.id"), nullable=False)
    bullet_id = Column(UUID(as_uuid=True), ForeignKey("bullets.id"), nullable=False)
    rifle_id = Column(UUID(as_uuid=True), ForeignKey("rifles.id"), nullable=False)
    powder_charge_grains = Column(Float, nullable=False)
    coal_mm = Column(Float, nullable=False)
    seating_depth_mm = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)

    powder = relationship("Powder", lazy="selectin")
    bullet = relationship("Bullet", lazy="selectin")
    rifle = relationship("Rifle", lazy="selectin")
