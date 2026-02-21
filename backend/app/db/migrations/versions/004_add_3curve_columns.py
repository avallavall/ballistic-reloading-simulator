"""Add 3-curve GRT parameter columns to powders

Revision ID: 004_3curve_cols
Revises: 003_grt_params
Create Date: 2026-02-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "004_3curve_cols"
down_revision: Union[str, None] = "003_grt_params"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("powders", sa.Column("ba", sa.Float, nullable=True))
    op.add_column("powders", sa.Column("bp", sa.Float, nullable=True))
    op.add_column("powders", sa.Column("br", sa.Float, nullable=True))
    op.add_column("powders", sa.Column("brp", sa.Float, nullable=True))
    op.add_column("powders", sa.Column("z1", sa.Float, nullable=True))
    op.add_column("powders", sa.Column("z2", sa.Float, nullable=True))
    op.add_column("powders", sa.Column("a0", sa.Float, nullable=True))


def downgrade() -> None:
    op.drop_column("powders", "a0")
    op.drop_column("powders", "z2")
    op.drop_column("powders", "z1")
    op.drop_column("powders", "brp")
    op.drop_column("powders", "br")
    op.drop_column("powders", "bp")
    op.drop_column("powders", "ba")
