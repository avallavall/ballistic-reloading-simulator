"""Initial schema - all 6 tables

Revision ID: 001_initial
Revises: None
Create Date: 2026-02-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

# revision identifiers, used by Alembic.
revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- powders ---
    op.create_table(
        "powders",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("manufacturer", sa.String(100), nullable=False),
        sa.Column("burn_rate_relative", sa.Float, nullable=False),
        sa.Column("force_constant_j_kg", sa.Float, nullable=False),
        sa.Column("covolume_m3_kg", sa.Float, nullable=False),
        sa.Column("flame_temp_k", sa.Float, nullable=False),
        sa.Column("gamma", sa.Float, nullable=False),
        sa.Column("density_g_cm3", sa.Float, nullable=False),
        sa.Column("burn_rate_coeff", sa.Float, nullable=False),
        sa.Column("burn_rate_exp", sa.Float, nullable=False),
    )

    # --- bullets ---
    op.create_table(
        "bullets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("manufacturer", sa.String(100), nullable=False),
        sa.Column("weight_grains", sa.Float, nullable=False),
        sa.Column("diameter_mm", sa.Float, nullable=False),
        sa.Column("length_mm", sa.Float, nullable=False),
        sa.Column("bc_g1", sa.Float, nullable=False),
        sa.Column("bc_g7", sa.Float, nullable=True),
        sa.Column("sectional_density", sa.Float, nullable=False),
        sa.Column("material", sa.String(50), nullable=False, server_default="copper"),
    )

    # --- cartridges ---
    op.create_table(
        "cartridges",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("saami_max_pressure_psi", sa.Float, nullable=False),
        sa.Column("cip_max_pressure_mpa", sa.Float, nullable=True),
        sa.Column("case_capacity_grains_h2o", sa.Float, nullable=False),
        sa.Column("case_length_mm", sa.Float, nullable=False),
        sa.Column("overall_length_mm", sa.Float, nullable=False),
        sa.Column("bore_diameter_mm", sa.Float, nullable=False),
        sa.Column("groove_diameter_mm", sa.Float, nullable=False),
    )

    # --- rifles (FK to cartridges) ---
    op.create_table(
        "rifles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("barrel_length_mm", sa.Float, nullable=False),
        sa.Column("twist_rate_mm", sa.Float, nullable=False),
        sa.Column(
            "cartridge_id",
            UUID(as_uuid=True),
            sa.ForeignKey("cartridges.id"),
            nullable=False,
        ),
        sa.Column("chamber_volume_mm3", sa.Float, nullable=False),
        sa.Column("barrel_condition", sa.String(20), nullable=False, server_default="new"),
        sa.Column("round_count", sa.Integer, nullable=False, server_default="0"),
    )

    # --- loads (FK to powders, bullets, rifles) ---
    op.create_table(
        "loads",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column(
            "powder_id",
            UUID(as_uuid=True),
            sa.ForeignKey("powders.id"),
            nullable=False,
        ),
        sa.Column(
            "bullet_id",
            UUID(as_uuid=True),
            sa.ForeignKey("bullets.id"),
            nullable=False,
        ),
        sa.Column(
            "rifle_id",
            UUID(as_uuid=True),
            sa.ForeignKey("rifles.id"),
            nullable=False,
        ),
        sa.Column("powder_charge_grains", sa.Float, nullable=False),
        sa.Column("coal_mm", sa.Float, nullable=False),
        sa.Column("seating_depth_mm", sa.Float, nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
    )

    # --- simulation_results (FK to loads) ---
    op.create_table(
        "simulation_results",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "load_id",
            UUID(as_uuid=True),
            sa.ForeignKey("loads.id"),
            nullable=False,
        ),
        sa.Column("peak_pressure_psi", sa.Float, nullable=False),
        sa.Column("muzzle_velocity_fps", sa.Float, nullable=False),
        sa.Column("pressure_curve", JSON, nullable=False),
        sa.Column("velocity_curve", JSON, nullable=False),
        sa.Column("barrel_time_ms", sa.Float, nullable=False),
        sa.Column("is_safe", sa.Boolean, nullable=False),
        sa.Column("warnings", JSON, nullable=False, server_default="[]"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("simulation_results")
    op.drop_table("loads")
    op.drop_table("rifles")
    op.drop_table("cartridges")
    op.drop_table("bullets")
    op.drop_table("powders")
