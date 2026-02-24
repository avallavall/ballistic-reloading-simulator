"""Fix cartridge caliber_family backfill to use groove_diameter_mm

Migration 006 backfilled caliber_family using bore_diameter_mm, but the live
create/update endpoints derive caliber_family from groove_diameter_mm via
derive_caliber_family(). This corrective migration clears and re-derives all
cartridge caliber_family values using groove_diameter_mm with all 11 caliber
family ranges from services/search.py CALIBER_FAMILIES.

Revision ID: 008_fix_caliber_backfill
Revises: 007_import_pipelines
Create Date: 2026-02-24

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "008_fix_caliber_backfill"
down_revision: Union[str, None] = "007_import_pipelines"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Clear all existing caliber_family values (some derived from bore_diameter_mm)
    op.execute("UPDATE cartridges SET caliber_family = NULL")

    # Re-derive caliber_family from groove_diameter_mm using all 11 families
    # Ranges match CALIBER_FAMILIES in backend/app/services/search.py exactly
    op.execute(
        "UPDATE cartridges SET caliber_family = '.224' "
        "WHERE groove_diameter_mm BETWEEN 5.5 AND 5.8"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.243' "
        "WHERE groove_diameter_mm BETWEEN 6.1 AND 6.3"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.264' "
        "WHERE groove_diameter_mm BETWEEN 6.5 AND 6.8"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.284' "
        "WHERE groove_diameter_mm BETWEEN 7.0 AND 7.3"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.308' "
        "WHERE groove_diameter_mm BETWEEN 7.7 AND 7.9"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.338' "
        "WHERE groove_diameter_mm BETWEEN 8.5 AND 8.7"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.375' "
        "WHERE groove_diameter_mm BETWEEN 9.5 AND 9.6"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.408' "
        "WHERE groove_diameter_mm BETWEEN 10.3 AND 10.4"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.416' "
        "WHERE groove_diameter_mm BETWEEN 10.5 AND 10.7"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.458' "
        "WHERE groove_diameter_mm BETWEEN 11.5 AND 11.7"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.510' "
        "WHERE groove_diameter_mm BETWEEN 12.9 AND 13.1"
    )


def downgrade() -> None:
    # Revert to bore_diameter_mm-based backfill (original 006 behavior)
    op.execute("UPDATE cartridges SET caliber_family = NULL")

    # Re-derive from bore_diameter_mm (same ranges, different source column)
    op.execute(
        "UPDATE cartridges SET caliber_family = '.224' "
        "WHERE bore_diameter_mm BETWEEN 5.5 AND 5.8"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.243' "
        "WHERE bore_diameter_mm BETWEEN 6.1 AND 6.3"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.264' "
        "WHERE bore_diameter_mm BETWEEN 6.5 AND 6.8"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.284' "
        "WHERE bore_diameter_mm BETWEEN 7.0 AND 7.3"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.308' "
        "WHERE bore_diameter_mm BETWEEN 7.7 AND 7.9"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.338' "
        "WHERE bore_diameter_mm BETWEEN 8.5 AND 8.7"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.375' "
        "WHERE bore_diameter_mm BETWEEN 9.5 AND 9.6"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.408' "
        "WHERE bore_diameter_mm BETWEEN 10.3 AND 10.4"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.416' "
        "WHERE bore_diameter_mm BETWEEN 10.5 AND 10.7"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.458' "
        "WHERE bore_diameter_mm BETWEEN 11.5 AND 11.7"
    )
    op.execute(
        "UPDATE cartridges SET caliber_family = '.510' "
        "WHERE bore_diameter_mm BETWEEN 12.9 AND 13.1"
    )
