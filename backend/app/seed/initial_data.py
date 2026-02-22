"""Fixture-based seed data loader for powders, bullets, and cartridges.

Loads data from JSON fixture files in backend/app/seed/fixtures/ on first boot.
Computes quality scores and applies alias groups during seeding.

Data sources:
- powders.json: 208 powders from 13 manufacturers
- bullets.json: 127 bullets from 5 manufacturers
- cartridges.json: 53 cartridges with SAAMI/CIP specs
- powder_aliases.json: 11 ADI/Hodgdon alias group mappings
"""

import json
import logging
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.quality import (
    compute_bullet_quality_score,
    compute_cartridge_quality_score,
    compute_quality_score,
)
from app.models.bullet import Bullet
from app.models.cartridge import Cartridge
from app.models.powder import Powder
from app.models.rifle import Rifle
from app.services.search import derive_caliber_family

logger = logging.getLogger(__name__)

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def _load_fixture(filename: str) -> list | dict:
    """Load a JSON fixture file from the fixtures directory.

    Args:
        filename: Name of the JSON file (e.g. 'powders.json').

    Returns:
        Parsed JSON content (list or dict), or empty list if file not found.
    """
    filepath = FIXTURES_DIR / filename
    if filepath.exists():
        with open(filepath, encoding="utf-8") as f:
            return json.load(f)
    logger.warning("Fixture file not found: %s", filepath)
    return []


# Rifles remain inline (only 5 records, tied to cartridge_name references)
RIFLES = [
    {
        "name": "Remington 700 SPS (.308 Win)",
        "cartridge_name": ".308 Winchester",
        "barrel_length_mm": 610.0,
        "twist_rate_mm": 305.0,
        "chamber_volume_mm3": 0.0,
        "weight_kg": 3.7,
    },
    {
        "name": "Tikka T3x (.308 Win)",
        "cartridge_name": ".308 Winchester",
        "barrel_length_mm": 610.0,
        "twist_rate_mm": 280.0,
        "chamber_volume_mm3": 0.0,
        "weight_kg": 3.2,
    },
    {
        "name": "Ruger Precision (6.5 CM)",
        "cartridge_name": "6.5 Creedmoor",
        "barrel_length_mm": 610.0,
        "twist_rate_mm": 203.0,
        "chamber_volume_mm3": 0.0,
        "weight_kg": 4.5,
    },
    {
        "name": "AR-15 (.223 Rem)",
        "cartridge_name": ".223 Remington",
        "barrel_length_mm": 508.0,
        "twist_rate_mm": 178.0,
        "chamber_volume_mm3": 0.0,
        "weight_kg": 3.0,
    },
    {
        "name": "Savage 110 (.338 Lapua)",
        "cartridge_name": ".338 Lapua Magnum",
        "barrel_length_mm": 686.0,
        "twist_rate_mm": 254.0,
        "chamber_volume_mm3": 0.0,
        "weight_kg": 5.4,
    },
]


async def seed_initial_data(db: AsyncSession):
    """Load fixture data on first boot if tables are empty."""
    existing = await db.execute(select(Powder).limit(1))
    if existing.scalar():
        logger.info("Seed data already exists, skipping")
        return

    logger.info("Seeding fixture data from JSON fixtures...")

    # ---- Powders ----
    powders_data = _load_fixture("powders.json")
    powder_objects = []
    for data in powders_data:
        # Filter to only known Powder model columns
        powder = Powder(**{k: v for k, v in data.items() if hasattr(Powder, k) and k != "id"})
        if not powder.data_source:
            powder.data_source = "estimated"
        # Compute quality score
        powder_dict = {k: v for k, v in data.items()}
        breakdown = compute_quality_score(powder_dict, powder.data_source)
        powder.quality_score = breakdown.score
        powder_objects.append(powder)
    db.add_all(powder_objects)

    # Apply alias groups from separate file
    aliases_data = _load_fixture("powder_aliases.json")
    if aliases_data and isinstance(aliases_data, dict):
        await db.flush()  # ensure powder names are in session
        for group_name, powder_names in aliases_data.items():
            for pname in powder_names:
                result = await db.execute(select(Powder).where(Powder.name == pname))
                p = result.scalar_one_or_none()
                if p:
                    p.alias_group = group_name

    # ---- Bullets ----
    bullets_data = _load_fixture("bullets.json")
    bullet_objects = []
    for data in bullets_data:
        bullet = Bullet(**{k: v for k, v in data.items() if hasattr(Bullet, k) and k != "id"})
        if not bullet.data_source:
            bullet.data_source = "manufacturer"
        bullet.caliber_family = derive_caliber_family(bullet.diameter_mm)
        bullet_dict = {k: v for k, v in data.items()}
        breakdown = compute_bullet_quality_score(bullet_dict, bullet.data_source)
        bullet.quality_score = breakdown.score
        bullet_objects.append(bullet)
    db.add_all(bullet_objects)

    # ---- Cartridges ----
    cartridges_data = _load_fixture("cartridges.json")
    cartridge_objects = []
    for data in cartridges_data:
        cart = Cartridge(**{k: v for k, v in data.items() if hasattr(Cartridge, k) and k != "id"})
        if not cart.data_source:
            cart.data_source = "saami"
        cart.caliber_family = derive_caliber_family(cart.groove_diameter_mm)
        cart_dict = {k: v for k, v in data.items()}
        breakdown = compute_cartridge_quality_score(cart_dict, cart.data_source)
        cart.quality_score = breakdown.score
        cartridge_objects.append(cart)

    # Build cartridge map for rifle FK references
    cartridge_map = {c_data["name"]: cart for c_data, cart in zip(cartridges_data, cartridge_objects)}
    db.add_all(cartridge_objects)

    await db.flush()  # assign IDs to cartridges before creating rifles

    # ---- Rifles (inline, only 5) ----
    for data in RIFLES:
        cart = cartridge_map.get(data["cartridge_name"])
        if not cart:
            logger.warning("Cartridge '%s' not found for rifle '%s', skipping",
                           data["cartridge_name"], data["name"])
            continue
        rifle = Rifle(
            name=data["name"],
            barrel_length_mm=data["barrel_length_mm"],
            twist_rate_mm=data["twist_rate_mm"],
            cartridge_id=cart.id,
            chamber_volume_mm3=data["chamber_volume_mm3"],
            weight_kg=data.get("weight_kg", 3.5),
        )
        db.add(rifle)

    await db.commit()
    logger.info("Fixture data seeded: %d powders, %d bullets, %d cartridges, %d rifles",
                len(powder_objects), len(bullet_objects), len(cartridge_objects), len(RIFLES))
