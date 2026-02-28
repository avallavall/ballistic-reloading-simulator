"""Add chamber drawing fields to rifles table

Adds 3 nullable Float columns for chamber technical drawing dimensions:
freebore_mm, throat_angle_deg, headspace_mm.

Revision ID: 010_rifle_chamber_fields
Revises: 009_schema_extensions
Create Date: 2026-02-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "010_rifle_chamber_fields"
down_revision: Union[str, None] = "009_schema_extensions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("rifles", sa.Column("freebore_mm", sa.Float(), nullable=True))
    op.add_column("rifles", sa.Column("throat_angle_deg", sa.Float(), nullable=True))
    op.add_column("rifles", sa.Column("headspace_mm", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("rifles", "headspace_mm")
    op.drop_column("rifles", "throat_angle_deg")
    op.drop_column("rifles", "freebore_mm")
