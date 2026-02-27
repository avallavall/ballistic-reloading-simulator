"""Fixture-based seed data loader for powders, bullets, and cartridges.

Loads data from JSON fixture files in backend/app/seed/fixtures/ on first boot.
Computes quality scores and applies alias groups during seeding.

Data sources:
- powders.json: 208 powders from 13 manufacturers
- bullets/{mfg}.json: 500+ bullets from 7 manufacturer files
- cartridges.json: 53 cartridges with SAAMI/CIP specs
- powder_aliases.json: 11 ADI/Hodgdon alias group mappings
"""

import json
import logging
from pathlib import Path

from sqlalchemy import delete, func, select
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

# Per-manufacturer bullet fixture files (loaded from fixtures/bullets/{mfg}.json)
BULLET_MANUFACTURERS = [
    "sierra", "hornady", "berger", "nosler", "lapua", "barnes", "speer"
]


def _load_fixture(filename: str) -> list | dict:
    """Load a JSON fixture file from the fixtures directory.

    Args:
        filename: Name of the JSON file (e.g. 'powders.json' or 'bullets/sierra.json').

    Returns:
        Parsed JSON content (list or dict), or empty list if file not found.
    """
    filepath = FIXTURES_DIR / filename
    if filepath.exists():
        with open(filepath, encoding="utf-8") as f:
            return json.load(f)
    logger.warning("Fixture file not found: %s", filepath)
    return []


async def _seed_bullets(db: AsyncSession) -> int:
    """Load bullets from per-manufacturer fixture files with count-based threshold.

    Threshold logic:
    - count <= 127: Old seed data, replace with expanded manufacturer files
    - 128 <= count <= 400: User has added custom bullets, preserve their data
    - count > 400: Already expanded (new seed loaded), skip

    Returns:
        Number of bullets seeded (0 if skipped).
    """
    result = await db.execute(select(func.count()).select_from(Bullet))
    bullet_count = result.scalar() or 0

    if bullet_count > 400:
        logger.info(
            "Bullet database already expanded (%d bullets), skipping seed",
            bullet_count,
        )
        return 0

    if 128 <= bullet_count <= 400:
        logger.info(
            "Custom bullet data detected (%d bullets), preserving user data",
            bullet_count,
        )
        return 0

    # Delete old seed data and replace
    if bullet_count > 0:
        await db.execute(delete(Bullet))
        logger.info(
            "Replacing old bullet seed (%d bullets) with expanded data",
            bullet_count,
        )

    # Load from per-manufacturer files, with fallback to legacy bullets.json
    bullets_dir = FIXTURES_DIR / "bullets"
    if bullets_dir.exists() and any(bullets_dir.glob("*.json")):
        all_bullets = []
        for mfg in BULLET_MANUFACTURERS:
            mfg_data = _load_fixture(f"bullets/{mfg}.json")
            all_bullets.extend(mfg_data)
            logger.info("Loaded %d bullets from %s.json", len(mfg_data), mfg)
    else:
        # Fallback to legacy single file
        all_bullets = _load_fixture("bullets.json")
        logger.info("Loaded %d bullets from legacy bullets.json", len(all_bullets))

    bullet_objects = []
    for data in all_bullets:
        bullet = Bullet(
            **{k: v for k, v in data.items() if hasattr(Bullet, k) and k != "id"}
        )
        if not bullet.data_source:
            bullet.data_source = "manufacturer"
        bullet.caliber_family = derive_caliber_family(bullet.diameter_mm)
        bullet_dict = {k: v for k, v in data.items()}
        breakdown = compute_bullet_quality_score(bullet_dict, bullet.data_source)
        bullet.quality_score = breakdown.score
        bullet_objects.append(bullet)

    db.add_all(bullet_objects)
    logger.info(
        "Seeded %d bullets from %d manufacturer files",
        len(bullet_objects),
        len(BULLET_MANUFACTURERS),
    )
    return len(bullet_objects)


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
    """Load fixture data on first boot if tables are empty.

    Powders and cartridges are seeded only when tables are empty.
    Bullets use a count-based threshold to support upgrading from old seed data.
    """
    # ---- Powders (seed only if empty) ----
    existing_powder = await db.execute(select(Powder).limit(1))
    if existing_powder.scalar():
        logger.info("Powder data already exists, skipping powder seed")
    else:
        logger.info("Seeding fixture data from JSON fixtures...")

        powders_data = _load_fixture("powders.json")
        powder_objects = []
        for data in powders_data:
            # Filter to only known Powder model columns
            powder = Powder(
                **{k: v for k, v in data.items() if hasattr(Powder, k) and k != "id"}
            )
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
                    result = await db.execute(
                        select(Powder).where(Powder.name == pname)
                    )
                    p = result.scalar_one_or_none()
                    if p:
                        p.alias_group = group_name

        logger.info("Seeded %d powders", len(powder_objects))

    # ---- Bullets (count-based threshold) ----
    bullet_count = await _seed_bullets(db)

    # ---- Cartridges (seed only if empty) ----
    existing_cart = await db.execute(select(Cartridge).limit(1))
    if existing_cart.scalar():
        logger.info("Cartridge data already exists, skipping cartridge seed")
    else:
        cartridges_data = _load_fixture("cartridges.json")
        cartridge_objects = []
        for data in cartridges_data:
            cart = Cartridge(
                **{k: v for k, v in data.items() if hasattr(Cartridge, k) and k != "id"}
            )
            if not cart.data_source:
                cart.data_source = "saami"
            cart.caliber_family = derive_caliber_family(cart.groove_diameter_mm)
            cart_dict = {k: v for k, v in data.items()}
            breakdown = compute_cartridge_quality_score(cart_dict, cart.data_source)
            cart.quality_score = breakdown.score
            cartridge_objects.append(cart)

        # Build cartridge map for rifle FK references
        cartridge_map = {
            c_data["name"]: cart
            for c_data, cart in zip(cartridges_data, cartridge_objects)
        }
        db.add_all(cartridge_objects)

        await db.flush()  # assign IDs to cartridges before creating rifles

        # ---- Rifles (inline, only 5) ----
        for data in RIFLES:
            cart = cartridge_map.get(data["cartridge_name"])
            if not cart:
                logger.warning(
                    "Cartridge '%s' not found for rifle '%s', skipping",
                    data["cartridge_name"],
                    data["name"],
                )
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

        logger.info(
            "Seeded %d cartridges and %d rifles",
            len(cartridge_objects),
            len(RIFLES),
        )

    await db.commit()
    logger.info("Seed data initialization complete")
