"""Add grt_params JSON column to powders

Revision ID: 003_grt_params
Revises: 002_add_columns
Create Date: 2026-02-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision: str = "003_grt_params"
down_revision: Union[str, None] = "002_add_columns"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("powders", sa.Column("grt_params", JSON, nullable=True))


def downgrade() -> None:
    op.drop_column("powders", "grt_params")
