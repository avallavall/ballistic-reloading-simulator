"""Add drawing/rendering dimension fields to bullets and cartridges

Adds 9 new nullable columns to bullets table (4 rendering + 5 velocity-banded BC)
and 5 new nullable columns to cartridges table (drawing dimensions).

Revision ID: 009_schema_extensions
Revises: 008_fix_caliber_backfill
Create Date: 2026-02-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "009_schema_extensions"
down_revision: Union[str, None] = "008_fix_caliber_backfill"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Bullet rendering dimension fields ---
    op.add_column("bullets", sa.Column("bearing_surface_mm", sa.Float(), nullable=True))
    op.add_column("bullets", sa.Column("boat_tail_length_mm", sa.Float(), nullable=True))
    op.add_column("bullets", sa.Column("meplat_diameter_mm", sa.Float(), nullable=True))
    op.add_column("bullets", sa.Column("ogive_type", sa.String(20), nullable=True))

    # --- Bullet velocity-banded BC fields ---
    op.add_column("bullets", sa.Column("bc_g1_high", sa.Float(), nullable=True))
    op.add_column("bullets", sa.Column("bc_g1_mid", sa.Float(), nullable=True))
    op.add_column("bullets", sa.Column("bc_g1_low", sa.Float(), nullable=True))
    op.add_column("bullets", sa.Column("bc_g1_high_vel", sa.Float(), nullable=True))
    op.add_column("bullets", sa.Column("bc_g1_mid_vel", sa.Float(), nullable=True))

    # --- Cartridge drawing dimension fields ---
    op.add_column("cartridges", sa.Column("shoulder_angle_deg", sa.Float(), nullable=True))
    op.add_column("cartridges", sa.Column("neck_length_mm", sa.Float(), nullable=True))
    op.add_column("cartridges", sa.Column("body_length_mm", sa.Float(), nullable=True))
    op.add_column("cartridges", sa.Column("rim_thickness_mm", sa.Float(), nullable=True))
    op.add_column("cartridges", sa.Column("case_type", sa.String(20), nullable=True))


def downgrade() -> None:
    # --- Cartridge drawing dimension fields (reverse order) ---
    op.drop_column("cartridges", "case_type")
    op.drop_column("cartridges", "rim_thickness_mm")
    op.drop_column("cartridges", "body_length_mm")
    op.drop_column("cartridges", "neck_length_mm")
    op.drop_column("cartridges", "shoulder_angle_deg")

    # --- Bullet velocity-banded BC fields (reverse order) ---
    op.drop_column("bullets", "bc_g1_mid_vel")
    op.drop_column("bullets", "bc_g1_high_vel")
    op.drop_column("bullets", "bc_g1_low")
    op.drop_column("bullets", "bc_g1_mid")
    op.drop_column("bullets", "bc_g1_high")

    # --- Bullet rendering dimension fields (reverse order) ---
    op.drop_column("bullets", "ogive_type")
    op.drop_column("bullets", "meplat_diameter_mm")
    op.drop_column("bullets", "boat_tail_length_mm")
    op.drop_column("bullets", "bearing_surface_mm")
