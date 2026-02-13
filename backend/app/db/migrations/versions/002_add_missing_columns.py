"""Add missing columns to rifles and simulation_results

Revision ID: 002_add_columns
Revises: 001_initial
Create Date: 2026-02-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision: str = "002_add_columns"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- rifles: add weight_kg ---
    op.add_column("rifles", sa.Column("weight_kg", sa.Float, nullable=False, server_default="3.5"))

    # --- simulation_results: add structural, harmonics, and recoil columns ---
    op.add_column("simulation_results", sa.Column("hoop_stress_mpa", sa.Float, nullable=False, server_default="0"))
    op.add_column("simulation_results", sa.Column("case_expansion_mm", sa.Float, nullable=False, server_default="0"))
    op.add_column("simulation_results", sa.Column("erosion_per_shot_mm", sa.Float, nullable=False, server_default="0"))
    op.add_column("simulation_results", sa.Column("barrel_frequency_hz", sa.Float, nullable=False, server_default="0"))
    op.add_column("simulation_results", sa.Column("optimal_barrel_times", JSON, nullable=True))
    op.add_column("simulation_results", sa.Column("obt_match", sa.Boolean, nullable=False, server_default="false"))
    op.add_column("simulation_results", sa.Column("recoil_energy_ft_lbs", sa.Float, nullable=False, server_default="0"))
    op.add_column("simulation_results", sa.Column("recoil_impulse_ns", sa.Float, nullable=False, server_default="0"))
    op.add_column("simulation_results", sa.Column("recoil_velocity_fps", sa.Float, nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("simulation_results", "recoil_velocity_fps")
    op.drop_column("simulation_results", "recoil_impulse_ns")
    op.drop_column("simulation_results", "recoil_energy_ft_lbs")
    op.drop_column("simulation_results", "obt_match")
    op.drop_column("simulation_results", "optimal_barrel_times")
    op.drop_column("simulation_results", "barrel_frequency_hz")
    op.drop_column("simulation_results", "erosion_per_shot_mm")
    op.drop_column("simulation_results", "case_expansion_mm")
    op.drop_column("simulation_results", "hoop_stress_mpa")
    op.drop_column("rifles", "weight_kg")
