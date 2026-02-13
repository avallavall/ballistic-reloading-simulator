"""Initial seed data for powders, bullets, and cartridges.

Data sourced from materials_database.md.
Burn rate coefficients (a1) are calibrated estimates for simulation use.

IMPORTANT: density_g_cm3 is the SOLID grain density (~1.60 g/cm3 for NC-based),
NOT the bulk/loading density (0.82-0.96 g/cm3). The solver's free_volume()
calculation divides omega/rho_p to get solid propellant volume and requires
the material density of the propellant grains themselves.
"""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bullet import Bullet
from app.models.cartridge import Cartridge
from app.models.powder import Powder
from app.models.rifle import Rifle

logger = logging.getLogger(__name__)

POWDERS = [
    {
        "name": "IMR 4198",
        "manufacturer": "IMR/Hodgdon",
        "burn_rate_relative": 52,
        "force_constant_j_kg": 950000,
        "covolume_m3_kg": 0.001,
        "flame_temp_k": 3860,
        "gamma": 1.24,
        "density_g_cm3": 1.60,  # Solid grain density (NC single-base)
        "burn_rate_coeff": 2.0e-8,
        "burn_rate_exp": 0.85,
    },
    {
        "name": "Hodgdon H322",
        "manufacturer": "Hodgdon",
        "burn_rate_relative": 60,
        "force_constant_j_kg": 950000,
        "covolume_m3_kg": 0.001,
        "flame_temp_k": 3850,
        "gamma": 1.24,
        "density_g_cm3": 1.60,
        "burn_rate_coeff": 1.8e-8,
        "burn_rate_exp": 0.85,
    },
    {
        "name": "Vihtavuori N133",
        "manufacturer": "Vihtavuori",
        "burn_rate_relative": 62,
        "force_constant_j_kg": 950000,
        "covolume_m3_kg": 0.001,
        "flame_temp_k": 3630,
        "gamma": 1.24,
        "density_g_cm3": 1.60,
        "burn_rate_coeff": 1.7e-8,
        "burn_rate_exp": 0.85,
    },
    {
        "name": "Hodgdon H335",
        "manufacturer": "Hodgdon",
        "burn_rate_relative": 68,
        "force_constant_j_kg": 950000,
        "covolume_m3_kg": 0.001,
        "flame_temp_k": 3980,
        "gamma": 1.24,
        "density_g_cm3": 1.60,
        "burn_rate_coeff": 1.6e-8,
        "burn_rate_exp": 0.85,
    },
    {
        "name": "Vihtavuori N135",
        "manufacturer": "Vihtavuori",
        "burn_rate_relative": 70,
        "force_constant_j_kg": 950000,
        "covolume_m3_kg": 0.001,
        "flame_temp_k": 3590,
        "gamma": 1.24,
        "density_g_cm3": 1.60,
        "burn_rate_coeff": 1.6e-8,
        "burn_rate_exp": 0.85,
    },
    {
        "name": "IMR 4064",
        "manufacturer": "IMR/Hodgdon",
        "burn_rate_relative": 80,
        "force_constant_j_kg": 950000,
        "covolume_m3_kg": 0.001,
        "flame_temp_k": 3880,
        "gamma": 1.24,
        "density_g_cm3": 1.60,
        "burn_rate_coeff": 1.5e-8,
        "burn_rate_exp": 0.85,
    },
    {
        "name": "Hodgdon Varget",
        "manufacturer": "Hodgdon/ADI",
        "burn_rate_relative": 82,
        "force_constant_j_kg": 950000,
        "covolume_m3_kg": 0.001,
        "flame_temp_k": 4050,
        "gamma": 1.24,
        "density_g_cm3": 1.60,
        "burn_rate_coeff": 1.6e-8,
        "burn_rate_exp": 0.86,
    },
    {
        "name": "Vihtavuori N140",
        "manufacturer": "Vihtavuori",
        "burn_rate_relative": 85,
        "force_constant_j_kg": 950000,
        "covolume_m3_kg": 0.001,
        "flame_temp_k": 3720,
        "gamma": 1.24,
        "density_g_cm3": 1.60,
        "burn_rate_coeff": 1.5e-8,
        "burn_rate_exp": 0.85,
    },
    {
        "name": "Hodgdon H4350",
        "manufacturer": "Hodgdon/ADI",
        "burn_rate_relative": 96,
        "force_constant_j_kg": 950000,
        "covolume_m3_kg": 0.001,
        "flame_temp_k": 3760,
        "gamma": 1.24,
        "density_g_cm3": 1.60,
        "burn_rate_coeff": 1.4e-8,
        "burn_rate_exp": 0.86,
    },
    {
        "name": "Hodgdon Retumbo",
        "manufacturer": "Hodgdon/ADI",
        "burn_rate_relative": 120,
        "force_constant_j_kg": 950000,
        "covolume_m3_kg": 0.001,
        "flame_temp_k": 3710,
        "gamma": 1.24,
        "density_g_cm3": 1.60,
        "burn_rate_coeff": 8.0e-9,
        "burn_rate_exp": 0.88,
    },
]

BULLETS = [
    {
        "name": "Sierra 69gr HPBT MK .224",
        "manufacturer": "Sierra",
        "weight_grains": 69,
        "diameter_mm": 5.70,
        "length_mm": 22.0,
        "bc_g1": 0.301,
        "bc_g7": 0.153,
        "sectional_density": 0.197,
        "material": "copper",
    },
    {
        "name": "Sierra 77gr HPBT MK .224",
        "manufacturer": "Sierra",
        "weight_grains": 77,
        "diameter_mm": 5.70,
        "length_mm": 24.0,
        "bc_g1": 0.340,
        "bc_g7": 0.175,
        "sectional_density": 0.219,
        "material": "copper",
    },
    {
        "name": "Sierra 140gr HPBT MK .264",
        "manufacturer": "Sierra",
        "weight_grains": 140,
        "diameter_mm": 6.72,
        "length_mm": 32.5,
        "bc_g1": 0.585,
        "bc_g7": 0.295,
        "sectional_density": 0.287,
        "material": "copper",
    },
    {
        "name": "Hornady 140gr ELD Match .264",
        "manufacturer": "Hornady",
        "weight_grains": 140,
        "diameter_mm": 6.72,
        "length_mm": 32.5,
        "bc_g1": 0.646,
        "bc_g7": 0.326,
        "sectional_density": 0.287,
        "material": "copper",
    },
    {
        "name": "Sierra 155gr HPBT Palma .308",
        "manufacturer": "Sierra",
        "weight_grains": 155,
        "diameter_mm": 7.82,
        "length_mm": 30.0,
        "bc_g1": 0.450,
        "bc_g7": 0.212,
        "sectional_density": 0.233,
        "material": "copper",
    },
    {
        "name": "Sierra 168gr HPBT MK .308",
        "manufacturer": "Sierra",
        "weight_grains": 168,
        "diameter_mm": 7.82,
        "length_mm": 31.2,
        "bc_g1": 0.462,
        "bc_g7": 0.218,
        "sectional_density": 0.253,
        "material": "copper",
    },
    {
        "name": "Sierra 175gr HPBT MK .308",
        "manufacturer": "Sierra",
        "weight_grains": 175,
        "diameter_mm": 7.82,
        "length_mm": 32.0,
        "bc_g1": 0.505,
        "bc_g7": 0.243,
        "sectional_density": 0.264,
        "material": "copper",
    },
    {
        "name": "Hornady 168gr ELD Match .308",
        "manufacturer": "Hornady",
        "weight_grains": 168,
        "diameter_mm": 7.82,
        "length_mm": 31.5,
        "bc_g1": 0.523,
        "bc_g7": 0.264,
        "sectional_density": 0.253,
        "material": "copper",
    },
    {
        "name": "Berger 185gr Hybrid Target .308",
        "manufacturer": "Berger",
        "weight_grains": 185,
        "diameter_mm": 7.82,
        "length_mm": 34.0,
        "bc_g1": 0.569,
        "bc_g7": 0.295,
        "sectional_density": 0.279,
        "material": "copper",
    },
    {
        "name": "Hornady 285gr ELD Match .338",
        "manufacturer": "Hornady",
        "weight_grains": 285,
        "diameter_mm": 8.61,
        "length_mm": 42.0,
        "bc_g1": 0.789,
        "bc_g7": 0.398,
        "sectional_density": 0.356,
        "material": "copper",
    },
]

CARTRIDGES = [
    {
        "name": ".223 Remington",
        "saami_max_pressure_psi": 55000,
        "cip_max_pressure_mpa": 430.0,
        "case_capacity_grains_h2o": 28.8,
        "case_length_mm": 44.70,
        "overall_length_mm": 57.40,
        "bore_diameter_mm": 5.56,
        "groove_diameter_mm": 5.70,
    },
    {
        "name": "6.5 Creedmoor",
        "saami_max_pressure_psi": 62000,
        "cip_max_pressure_mpa": 420.0,
        "case_capacity_grains_h2o": 52.5,
        "case_length_mm": 48.77,
        "overall_length_mm": 72.39,
        "bore_diameter_mm": 6.50,
        "groove_diameter_mm": 6.72,
    },
    {
        "name": ".308 Winchester",
        "saami_max_pressure_psi": 62000,
        "cip_max_pressure_mpa": 415.0,
        "case_capacity_grains_h2o": 54.0,
        "case_length_mm": 51.18,
        "overall_length_mm": 71.12,
        "bore_diameter_mm": 7.62,
        "groove_diameter_mm": 7.82,
    },
    {
        "name": ".30-06 Springfield",
        "saami_max_pressure_psi": 60000,
        "cip_max_pressure_mpa": 405.0,
        "case_capacity_grains_h2o": 68.0,
        "case_length_mm": 63.35,
        "overall_length_mm": 84.84,
        "bore_diameter_mm": 7.62,
        "groove_diameter_mm": 7.82,
    },
    {
        "name": ".338 Lapua Magnum",
        "saami_max_pressure_psi": 65000,
        "cip_max_pressure_mpa": 420.0,
        "case_capacity_grains_h2o": 91.5,
        "case_length_mm": 69.20,
        "overall_length_mm": 93.50,
        "bore_diameter_mm": 8.38,
        "groove_diameter_mm": 8.61,
    },
]


# Rifles: (name, cartridge_name, barrel_length_mm, twist_rate_mm, chamber_volume_mm3, weight_kg)
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
    """Insert initial seed data if tables are empty."""
    existing = await db.execute(select(Powder).limit(1))
    if existing.scalar():
        logger.info("Seed data already exists, skipping")
        return

    logger.info("Seeding initial data...")

    for data in POWDERS:
        db.add(Powder(**data))
    for data in BULLETS:
        db.add(Bullet(**data))

    # Seed cartridges and collect them for rifle FK references
    cartridge_map: dict[str, Cartridge] = {}
    for data in CARTRIDGES:
        cart = Cartridge(**data)
        db.add(cart)
        cartridge_map[data["name"]] = cart

    await db.flush()  # assign IDs to cartridges before creating rifles

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
    logger.info("Seed data inserted: %d powders, %d bullets, %d cartridges, %d rifles",
                len(POWDERS), len(BULLETS), len(CARTRIDGES), len(RIFLES))
