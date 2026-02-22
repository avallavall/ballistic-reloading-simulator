"""Add import pipeline columns: powder alias_group, bullet extended fields, cartridge dimensions

Revision ID: 007_import_pipelines
Revises: 006_search_pagination
Create Date: 2026-02-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "007_import_pipelines"
down_revision: Union[str, None] = "006_search_pagination"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Powder: alias_group for linking equivalent powders across markets ---
    op.add_column("powders", sa.Column("alias_group", sa.String(100), nullable=True))
    op.create_index("ix_powders_alias_group", "powders", ["alias_group"])

    # --- Bullet: extended manufacturer fields + nullable length_mm ---
    op.add_column("bullets", sa.Column("model_number", sa.String(50), nullable=True))
    op.add_column("bullets", sa.Column("bullet_type", sa.String(30), nullable=True))
    op.add_column("bullets", sa.Column("base_type", sa.String(50), nullable=True))
    op.alter_column("bullets", "length_mm", existing_type=sa.Float, nullable=True)

    # --- Cartridge: parent lineage and extended dimension columns ---
    op.add_column("cartridges", sa.Column("parent_cartridge_name", sa.String(100), nullable=True))
    op.add_column("cartridges", sa.Column("shoulder_diameter_mm", sa.Float, nullable=True))
    op.add_column("cartridges", sa.Column("neck_diameter_mm", sa.Float, nullable=True))
    op.add_column("cartridges", sa.Column("base_diameter_mm", sa.Float, nullable=True))
    op.add_column("cartridges", sa.Column("rim_diameter_mm", sa.Float, nullable=True))


def downgrade() -> None:
    # --- Reverse cartridge columns ---
    op.drop_column("cartridges", "rim_diameter_mm")
    op.drop_column("cartridges", "base_diameter_mm")
    op.drop_column("cartridges", "neck_diameter_mm")
    op.drop_column("cartridges", "shoulder_diameter_mm")
    op.drop_column("cartridges", "parent_cartridge_name")

    # --- Reverse bullet columns ---
    op.alter_column("bullets", "length_mm", existing_type=sa.Float, nullable=False)
    op.drop_column("bullets", "base_type")
    op.drop_column("bullets", "bullet_type")
    op.drop_column("bullets", "model_number")

    # --- Reverse powder columns ---
    op.drop_index("ix_powders_alias_group", table_name="powders")
    op.drop_column("powders", "alias_group")
