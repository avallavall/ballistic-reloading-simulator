"""Add groove_count and twist_direction columns to rifles table

Revision ID: 011_rifle_groove_twist
Revises: 010_rifle_chamber_fields
Create Date: 2026-02-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "011_rifle_groove_twist"
down_revision: Union[str, None] = "010_rifle_chamber_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("rifles", sa.Column("groove_count", sa.Integer(), nullable=True))
    op.add_column("rifles", sa.Column("twist_direction", sa.String(10), nullable=True))


def downgrade() -> None:
    op.drop_column("rifles", "twist_direction")
    op.drop_column("rifles", "groove_count")
