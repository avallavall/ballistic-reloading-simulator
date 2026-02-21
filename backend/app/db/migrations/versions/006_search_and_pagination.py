"""Enable pg_trgm, add GIN indexes, add quality/caliber columns to bullets and cartridges

Revision ID: 006_search_pagination
Revises: 005_quality_web_thickness
Create Date: 2026-02-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "006_search_pagination"
down_revision: Union[str, None] = "005_quality_web_thickness"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pg_trgm extension for fuzzy search
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # --- New columns on bullets ---
    op.add_column("bullets", sa.Column("data_source", sa.String(20), nullable=False, server_default="manual"))
    op.add_column("bullets", sa.Column("quality_score", sa.Integer, nullable=False, server_default="0"))
    op.add_column("bullets", sa.Column("caliber_family", sa.String(20), nullable=True))

    # --- New columns on cartridges ---
    op.add_column("cartridges", sa.Column("data_source", sa.String(20), nullable=False, server_default="manual"))
    op.add_column("cartridges", sa.Column("quality_score", sa.Integer, nullable=False, server_default="0"))
    op.add_column("cartridges", sa.Column("caliber_family", sa.String(20), nullable=True))

    # --- GIN indexes for pg_trgm fuzzy search ---
    op.execute(
        "CREATE INDEX ix_powders_name_trgm ON powders USING gin (name gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX ix_powders_mfg_trgm ON powders USING gin (manufacturer gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX ix_bullets_name_trgm ON bullets USING gin (name gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX ix_bullets_mfg_trgm ON bullets USING gin (manufacturer gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX ix_cartridges_name_trgm ON cartridges USING gin (name gin_trgm_ops)"
    )

    # --- B-tree indexes for filter queries ---
    op.create_index("ix_powders_quality", "powders", ["quality_score"])
    op.create_index("ix_bullets_quality", "bullets", ["quality_score"])
    op.create_index("ix_bullets_caliber", "bullets", ["caliber_family"])
    op.create_index("ix_cartridges_quality", "cartridges", ["quality_score"])

    # --- Backfill caliber_family for existing bullets based on diameter_mm ---
    op.execute("UPDATE bullets SET caliber_family = '.224' WHERE diameter_mm BETWEEN 5.5 AND 5.8")
    op.execute("UPDATE bullets SET caliber_family = '.243' WHERE diameter_mm BETWEEN 6.1 AND 6.3")
    op.execute("UPDATE bullets SET caliber_family = '.264' WHERE diameter_mm BETWEEN 6.5 AND 6.8")
    op.execute("UPDATE bullets SET caliber_family = '.284' WHERE diameter_mm BETWEEN 7.0 AND 7.3")
    op.execute("UPDATE bullets SET caliber_family = '.308' WHERE diameter_mm BETWEEN 7.7 AND 7.9")
    op.execute("UPDATE bullets SET caliber_family = '.338' WHERE diameter_mm BETWEEN 8.5 AND 8.7")

    # --- Backfill caliber_family for existing cartridges based on bore_diameter_mm ---
    op.execute("UPDATE cartridges SET caliber_family = '.224' WHERE bore_diameter_mm BETWEEN 5.5 AND 5.8")
    op.execute("UPDATE cartridges SET caliber_family = '.243' WHERE bore_diameter_mm BETWEEN 6.1 AND 6.3")
    op.execute("UPDATE cartridges SET caliber_family = '.264' WHERE bore_diameter_mm BETWEEN 6.5 AND 6.8")
    op.execute("UPDATE cartridges SET caliber_family = '.284' WHERE bore_diameter_mm BETWEEN 7.0 AND 7.3")
    op.execute("UPDATE cartridges SET caliber_family = '.308' WHERE bore_diameter_mm BETWEEN 7.7 AND 7.9")
    op.execute("UPDATE cartridges SET caliber_family = '.338' WHERE bore_diameter_mm BETWEEN 8.5 AND 8.7")


def downgrade() -> None:
    # Drop B-tree indexes
    op.drop_index("ix_cartridges_quality", table_name="cartridges")
    op.drop_index("ix_bullets_caliber", table_name="bullets")
    op.drop_index("ix_bullets_quality", table_name="bullets")
    op.drop_index("ix_powders_quality", table_name="powders")

    # Drop GIN indexes
    op.execute("DROP INDEX IF EXISTS ix_cartridges_name_trgm")
    op.execute("DROP INDEX IF EXISTS ix_bullets_mfg_trgm")
    op.execute("DROP INDEX IF EXISTS ix_bullets_name_trgm")
    op.execute("DROP INDEX IF EXISTS ix_powders_mfg_trgm")
    op.execute("DROP INDEX IF EXISTS ix_powders_name_trgm")

    # Drop columns from cartridges
    op.drop_column("cartridges", "caliber_family")
    op.drop_column("cartridges", "quality_score")
    op.drop_column("cartridges", "data_source")

    # Drop columns from bullets
    op.drop_column("bullets", "caliber_family")
    op.drop_column("bullets", "quality_score")
    op.drop_column("bullets", "data_source")

    # Drop extension
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
