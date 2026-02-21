"""Add data_source, quality_score, web_thickness_mm to powders

Revision ID: 005_quality_web_thickness
Revises: 004_3curve_cols
Create Date: 2026-02-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "005_quality_web_thickness"
down_revision: Union[str, None] = "004_3curve_cols"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("powders", sa.Column("data_source", sa.String(20), nullable=False, server_default="manual"))
    op.add_column("powders", sa.Column("quality_score", sa.Integer, nullable=False, server_default="0"))
    op.add_column("powders", sa.Column("web_thickness_mm", sa.Float, nullable=True))


def downgrade() -> None:
    op.drop_column("powders", "web_thickness_mm")
    op.drop_column("powders", "quality_score")
    op.drop_column("powders", "data_source")
