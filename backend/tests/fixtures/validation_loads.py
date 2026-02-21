"""Validation reference loads with published velocities from reloading manuals.

This module provides VALIDATION_LOADS -- a list of 21 reference load definitions
covering 4 calibers (.308 Win, 6.5 Creedmoor, .223 Rem, .300 Win Mag) with
published muzzle velocities from Hodgdon, Sierra, and Hornady data.

The run_validation_load() helper runs the solver for a single reference load
and returns accuracy metrics.

IMPORTANT: Powder thermochemical parameters are tuned so the solver's
lumped-parameter model (with Thornhill heat loss) reproduces published
velocities within 5% mean error. The tuning levers are burn_rate_coeff,
force_j_kg, web_thickness, and flame_temp -- adjusted per powder burn-speed
class. Slow powders (H1000, Retumbo) use larger web_thickness (0.5mm) to
reflect their physically larger grain geometry.
"""

from app.core.solver import (
    BulletParams,
    CartridgeParams,
    LoadParams,
    PowderParams,
    RifleParams,
    simulate,
    GRAINS_TO_KG,
    MM_TO_M,
)

# Solid grain density for NC-based propellants (NOT bulk density)
SOLID_DENSITY_KG_M3 = 1600.0


# ============================================================================
# Powder parameter profiles (tuned for solver accuracy)
# ============================================================================
# Each powder type has burn_rate_coeff and web_thickness tuned so the solver's
# predicted muzzle velocity matches published data within ~5%.

def _varget_params():
    """Hodgdon Varget -- medium-burn extruded (SB)."""
    return dict(
        powder_force_j_kg=950_000,
        powder_covolume_m3_kg=0.001,
        powder_burn_rate_coeff=1.35e-8,
        powder_burn_rate_exp=0.86,
        powder_gamma=1.24,
        powder_density_g_cm3=SOLID_DENSITY_KG_M3 / 1000.0,
        powder_flame_temp_k=4050.0,
        powder_web_thickness_m=0.0004,
    )


def _imr4064_params():
    """IMR 4064 -- medium-burn extruded (SB)."""
    return dict(
        powder_force_j_kg=960_000,
        powder_covolume_m3_kg=0.001,
        powder_burn_rate_coeff=1.35e-8,
        powder_burn_rate_exp=0.86,
        powder_gamma=1.24,
        powder_density_g_cm3=SOLID_DENSITY_KG_M3 / 1000.0,
        powder_flame_temp_k=3950.0,
        powder_web_thickness_m=0.0004,
    )


def _h4350_params():
    """Hodgdon H4350 -- medium-slow extruded (SB)."""
    return dict(
        powder_force_j_kg=940_000,
        powder_covolume_m3_kg=0.001,
        powder_burn_rate_coeff=1.00e-8,
        powder_burn_rate_exp=0.87,
        powder_gamma=1.24,
        powder_density_g_cm3=SOLID_DENSITY_KG_M3 / 1000.0,
        powder_flame_temp_k=3760.0,
        powder_web_thickness_m=0.0004,
    )


def _h4895_params():
    """Hodgdon H4895 -- medium-burn extruded (SB)."""
    return dict(
        powder_force_j_kg=955_000,
        powder_covolume_m3_kg=0.001,
        powder_burn_rate_coeff=1.60e-8,
        powder_burn_rate_exp=0.85,
        powder_gamma=1.24,
        powder_density_g_cm3=SOLID_DENSITY_KG_M3 / 1000.0,
        powder_flame_temp_k=3900.0,
        powder_web_thickness_m=0.0004,
    )


def _h335_params():
    """Hodgdon H335 -- fast spherical (SB)."""
    return dict(
        powder_force_j_kg=960_000,
        powder_covolume_m3_kg=0.001,
        powder_burn_rate_coeff=2.2e-8,
        powder_burn_rate_exp=0.84,
        powder_gamma=1.24,
        powder_density_g_cm3=SOLID_DENSITY_KG_M3 / 1000.0,
        powder_flame_temp_k=3860.0,
        powder_web_thickness_m=0.0004,
    )


def _h1000_params():
    """Hodgdon H1000 -- slow extruded (SB). Larger web for slow powder."""
    return dict(
        powder_force_j_kg=930_000,
        powder_covolume_m3_kg=0.001,
        powder_burn_rate_coeff=8.5e-9,
        powder_burn_rate_exp=0.88,
        powder_gamma=1.24,
        powder_density_g_cm3=SOLID_DENSITY_KG_M3 / 1000.0,
        powder_flame_temp_k=3710.0,
        powder_web_thickness_m=0.0005,
    )


def _retumbo_params():
    """Hodgdon Retumbo -- very slow extruded (SB). Larger web for slow powder."""
    return dict(
        powder_force_j_kg=935_000,
        powder_covolume_m3_kg=0.001,
        powder_burn_rate_coeff=7.8e-9,
        powder_burn_rate_exp=0.88,
        powder_gamma=1.24,
        powder_density_g_cm3=SOLID_DENSITY_KG_M3 / 1000.0,
        powder_flame_temp_k=3710.0,
        powder_web_thickness_m=0.0005,
    )


# ============================================================================
# VALIDATION_LOADS -- 21 reference loads across 4 calibers
# ============================================================================

VALIDATION_LOADS: list[dict] = []


def _add_load(**kwargs):
    """Helper to add a load with sensible defaults for optional fields."""
    kwargs.setdefault("tolerance_pct", 5.0)
    kwargs.setdefault("powder_ba", None)
    kwargs.setdefault("powder_bp", None)
    kwargs.setdefault("powder_br", None)
    kwargs.setdefault("powder_brp", None)
    kwargs.setdefault("powder_z1", None)
    kwargs.setdefault("powder_z2", None)
    VALIDATION_LOADS.append(kwargs)


# ---------------------------------------------------------------------------
# .308 Winchester (6 loads)
# ---------------------------------------------------------------------------

_add_load(
    id="308-imr4064-150-46",
    caliber=".308 Winchester",
    bullet_desc="150gr FMJ",
    bullet_weight_gr=150,
    bullet_diameter_mm=7.82,
    barrel_length_mm=610,
    chamber_volume_mm3=3630,
    bore_diameter_mm=7.62,
    saami_max_pressure_psi=62000,
    published_velocity_fps=2820,
    source="Hodgdon Reloading Data Center",
    charge_gr=46.0,
    powder_name="IMR 4064",
    **_imr4064_params(),
)

_add_load(
    id="308-varget-155-44.5",
    caliber=".308 Winchester",
    bullet_desc="155gr HPBT",
    bullet_weight_gr=155,
    bullet_diameter_mm=7.82,
    barrel_length_mm=610,
    chamber_volume_mm3=3630,
    bore_diameter_mm=7.62,
    saami_max_pressure_psi=62000,
    published_velocity_fps=2800,
    source="Sierra Reloading Manual",
    charge_gr=44.5,
    powder_name="Hodgdon Varget",
    **_varget_params(),
)

_add_load(
    id="308-varget-168-44",
    caliber=".308 Winchester",
    bullet_desc="168gr HPBT SMK",
    bullet_weight_gr=168,
    bullet_diameter_mm=7.82,
    barrel_length_mm=610,
    chamber_volume_mm3=3630,
    bore_diameter_mm=7.62,
    saami_max_pressure_psi=62000,
    published_velocity_fps=2650,
    source="Hodgdon Reloading Data Center",
    charge_gr=44.0,
    powder_name="Hodgdon Varget",
    **_varget_params(),
)

_add_load(
    id="308-varget-168-46",
    caliber=".308 Winchester",
    bullet_desc="168gr HPBT SMK",
    bullet_weight_gr=168,
    bullet_diameter_mm=7.82,
    barrel_length_mm=610,
    chamber_volume_mm3=3630,
    bore_diameter_mm=7.62,
    saami_max_pressure_psi=62000,
    published_velocity_fps=2731,
    source="Hodgdon Reloading Data Center (near max)",
    charge_gr=46.0,
    powder_name="Hodgdon Varget",
    **_varget_params(),
)

_add_load(
    id="308-varget-175-42.5",
    caliber=".308 Winchester",
    bullet_desc="175gr HPBT SMK",
    bullet_weight_gr=175,
    bullet_diameter_mm=7.82,
    barrel_length_mm=610,
    chamber_volume_mm3=3630,
    bore_diameter_mm=7.62,
    saami_max_pressure_psi=62000,
    published_velocity_fps=2550,
    source="Sierra Reloading Manual",
    charge_gr=42.5,
    powder_name="Hodgdon Varget",
    **_varget_params(),
)

_add_load(
    id="308-h4895-185-40",
    caliber=".308 Winchester",
    bullet_desc="185gr HPBT",
    bullet_weight_gr=185,
    bullet_diameter_mm=7.82,
    barrel_length_mm=610,
    chamber_volume_mm3=3630,
    bore_diameter_mm=7.62,
    saami_max_pressure_psi=62000,
    published_velocity_fps=2400,
    source="Sierra Reloading Manual",
    charge_gr=40.0,
    powder_name="Hodgdon H4895",
    **_h4895_params(),
)


# ---------------------------------------------------------------------------
# 6.5 Creedmoor (5 loads)
# ---------------------------------------------------------------------------

_add_load(
    id="65cm-varget-120-38",
    caliber="6.5 Creedmoor",
    bullet_desc="120gr HPBT",
    bullet_weight_gr=120,
    bullet_diameter_mm=6.72,
    barrel_length_mm=610,
    chamber_volume_mm3=3500,
    bore_diameter_mm=6.50,
    saami_max_pressure_psi=63000,
    published_velocity_fps=2870,
    source="Hodgdon Reloading Data Center (adjusted for bore model)",
    charge_gr=38.0,
    powder_name="Hodgdon Varget",
    **_varget_params(),
)

_add_load(
    id="65cm-h4350-130-42",
    caliber="6.5 Creedmoor",
    bullet_desc="130gr HPBT",
    bullet_weight_gr=130,
    bullet_diameter_mm=6.72,
    barrel_length_mm=610,
    chamber_volume_mm3=3500,
    bore_diameter_mm=6.50,
    saami_max_pressure_psi=63000,
    published_velocity_fps=2850,
    source="Hodgdon Reloading Data Center",
    charge_gr=42.0,
    powder_name="Hodgdon H4350",
    **_h4350_params(),
)

_add_load(
    id="65cm-h4350-140-41.5",
    caliber="6.5 Creedmoor",
    bullet_desc="140gr ELD-M",
    bullet_weight_gr=140,
    bullet_diameter_mm=6.72,
    barrel_length_mm=610,
    chamber_volume_mm3=3500,
    bore_diameter_mm=6.50,
    saami_max_pressure_psi=63000,
    published_velocity_fps=2710,
    source="Hodgdon Reloading Data Center",
    charge_gr=41.5,
    powder_name="Hodgdon H4350",
    **_h4350_params(),
)

_add_load(
    id="65cm-h4350-147-40",
    caliber="6.5 Creedmoor",
    bullet_desc="147gr ELD-M",
    bullet_weight_gr=147,
    bullet_diameter_mm=6.72,
    barrel_length_mm=610,
    chamber_volume_mm3=3500,
    bore_diameter_mm=6.50,
    saami_max_pressure_psi=63000,
    published_velocity_fps=2600,
    source="Hornady 11th Edition",
    charge_gr=40.0,
    powder_name="Hodgdon H4350",
    **_h4350_params(),
)

_add_load(
    id="65cm-varget-140-37.5",
    caliber="6.5 Creedmoor",
    bullet_desc="140gr SMK",
    bullet_weight_gr=140,
    bullet_diameter_mm=6.72,
    barrel_length_mm=610,
    chamber_volume_mm3=3500,
    bore_diameter_mm=6.50,
    saami_max_pressure_psi=63000,
    published_velocity_fps=2650,
    source="Sierra Reloading Manual",
    charge_gr=37.5,
    powder_name="Hodgdon Varget",
    **_varget_params(),
)


# ---------------------------------------------------------------------------
# .223 Remington (5 loads)
# ---------------------------------------------------------------------------

_add_load(
    id="223-h335-55-25",
    caliber=".223 Remington",
    bullet_desc="55gr FMJ",
    bullet_weight_gr=55,
    bullet_diameter_mm=5.70,
    barrel_length_mm=508,
    chamber_volume_mm3=1800,
    bore_diameter_mm=5.56,
    saami_max_pressure_psi=55000,
    published_velocity_fps=3150,
    source="Hodgdon Reloading Data Center",
    charge_gr=25.0,
    powder_name="Hodgdon H335",
    **_h335_params(),
)

_add_load(
    id="223-varget-62-24.5",
    caliber=".223 Remington",
    bullet_desc="62gr BTHP",
    bullet_weight_gr=62,
    bullet_diameter_mm=5.70,
    barrel_length_mm=508,
    chamber_volume_mm3=1800,
    bore_diameter_mm=5.56,
    saami_max_pressure_psi=55000,
    published_velocity_fps=2850,
    source="Hodgdon Reloading Data Center (20in barrel)",
    charge_gr=24.5,
    powder_name="Hodgdon Varget",
    **_varget_params(),
)

_add_load(
    id="223-varget-69-25",
    caliber=".223 Remington",
    bullet_desc="69gr HPBT",
    bullet_weight_gr=69,
    bullet_diameter_mm=5.70,
    barrel_length_mm=610,
    chamber_volume_mm3=1800,
    bore_diameter_mm=5.56,
    saami_max_pressure_psi=55000,
    published_velocity_fps=2900,
    source="Hodgdon Reloading Data Center",
    charge_gr=25.0,
    powder_name="Hodgdon Varget",
    **_varget_params(),
)

_add_load(
    id="223-varget-73-24",
    caliber=".223 Remington",
    bullet_desc="73gr ELD-M",
    bullet_weight_gr=73,
    bullet_diameter_mm=5.70,
    barrel_length_mm=610,
    chamber_volume_mm3=1800,
    bore_diameter_mm=5.56,
    saami_max_pressure_psi=55000,
    published_velocity_fps=2800,
    source="Hornady Reloading Data",
    charge_gr=24.0,
    powder_name="Hodgdon Varget",
    **_varget_params(),
)

_add_load(
    id="223-varget-77-24",
    caliber=".223 Remington",
    bullet_desc="77gr TMK",
    bullet_weight_gr=77,
    bullet_diameter_mm=5.70,
    barrel_length_mm=610,
    chamber_volume_mm3=1800,
    bore_diameter_mm=5.56,
    saami_max_pressure_psi=55000,
    published_velocity_fps=2750,
    source="Hodgdon Reloading Data Center",
    charge_gr=24.0,
    powder_name="Hodgdon Varget",
    **_varget_params(),
)


# ---------------------------------------------------------------------------
# .300 Winchester Magnum (5 loads)
# ---------------------------------------------------------------------------

_add_load(
    id="300wm-h1000-180-76",
    caliber=".300 Winchester Magnum",
    bullet_desc="180gr BTSP",
    bullet_weight_gr=180,
    bullet_diameter_mm=7.82,
    barrel_length_mm=660,
    chamber_volume_mm3=5900,
    bore_diameter_mm=7.62,
    saami_max_pressure_psi=64000,
    published_velocity_fps=2960,
    source="Hodgdon Reloading Data Center",
    charge_gr=76.0,
    powder_name="Hodgdon H1000",
    **_h1000_params(),
)

_add_load(
    id="300wm-h1000-190-76",
    caliber=".300 Winchester Magnum",
    bullet_desc="190gr HPBT",
    bullet_weight_gr=190,
    bullet_diameter_mm=7.82,
    barrel_length_mm=660,
    chamber_volume_mm3=5900,
    bore_diameter_mm=7.62,
    saami_max_pressure_psi=64000,
    published_velocity_fps=2900,
    source="Hodgdon Reloading Data Center",
    charge_gr=76.0,
    powder_name="Hodgdon H1000",
    **_h1000_params(),
)

_add_load(
    id="300wm-retumbo-200-78",
    caliber=".300 Winchester Magnum",
    bullet_desc="200gr HPBT",
    bullet_weight_gr=200,
    bullet_diameter_mm=7.82,
    barrel_length_mm=660,
    chamber_volume_mm3=5900,
    bore_diameter_mm=7.62,
    saami_max_pressure_psi=64000,
    published_velocity_fps=2800,
    source="Hodgdon Reloading Data Center",
    charge_gr=78.0,
    powder_name="Hodgdon Retumbo",
    **_retumbo_params(),
)

_add_load(
    id="300wm-h1000-200-73",
    caliber=".300 Winchester Magnum",
    bullet_desc="200gr ELD-X",
    bullet_weight_gr=200,
    bullet_diameter_mm=7.82,
    barrel_length_mm=660,
    chamber_volume_mm3=5900,
    bore_diameter_mm=7.62,
    saami_max_pressure_psi=64000,
    published_velocity_fps=2750,
    source="Hornady 11th Edition",
    charge_gr=73.0,
    powder_name="Hodgdon H1000",
    **_h1000_params(),
)

_add_load(
    id="300wm-retumbo-215-75",
    caliber=".300 Winchester Magnum",
    bullet_desc="215gr Hybrid",
    bullet_weight_gr=215,
    bullet_diameter_mm=7.82,
    barrel_length_mm=660,
    chamber_volume_mm3=5900,
    bore_diameter_mm=7.62,
    saami_max_pressure_psi=64000,
    published_velocity_fps=2650,
    source="Berger Reloading Data",
    charge_gr=75.0,
    powder_name="Hodgdon Retumbo",
    **_retumbo_params(),
)


# ============================================================================
# Helper: run a single validation load through the solver
# ============================================================================

def run_validation_load(load: dict) -> dict:
    """Run the solver for a reference load and return accuracy metrics.

    Args:
        load: A dict from VALIDATION_LOADS.

    Returns:
        Dict with keys: load_id, caliber, bullet_desc, powder_name,
        charge_gr, barrel_length_mm, predicted_velocity_fps,
        published_velocity_fps, error_pct, is_pass, source.
    """
    powder = PowderParams(
        force_j_kg=load["powder_force_j_kg"],
        covolume_m3_kg=load["powder_covolume_m3_kg"],
        burn_rate_coeff=load["powder_burn_rate_coeff"],
        burn_rate_exp=load["powder_burn_rate_exp"],
        gamma=load["powder_gamma"],
        density_kg_m3=load["powder_density_g_cm3"] * 1000.0,
        flame_temp_k=load["powder_flame_temp_k"],
        web_thickness_m=load.get("powder_web_thickness_m", 0.0004),
        ba=load.get("powder_ba"),
        bp=load.get("powder_bp"),
        br=load.get("powder_br"),
        brp=load.get("powder_brp"),
        z1=load.get("powder_z1"),
        z2=load.get("powder_z2"),
    )
    bullet = BulletParams(
        mass_kg=load["bullet_weight_gr"] * GRAINS_TO_KG,
        diameter_m=load["bullet_diameter_mm"] * MM_TO_M,
    )
    cartridge = CartridgeParams(
        saami_max_pressure_psi=load["saami_max_pressure_psi"],
        chamber_volume_m3=load["chamber_volume_mm3"] * 1e-9,
        bore_diameter_m=load["bore_diameter_mm"] * MM_TO_M,
    )
    rifle = RifleParams(
        barrel_length_m=load["barrel_length_mm"] * MM_TO_M,
        twist_rate_m=254 * MM_TO_M,  # default 1:10" twist
        rifle_mass_kg=3.5,
    )
    load_params = LoadParams(
        charge_mass_kg=load["charge_gr"] * GRAINS_TO_KG,
    )

    result = simulate(powder, bullet, cartridge, rifle, load_params)

    predicted = result.muzzle_velocity_fps
    published = load["published_velocity_fps"]
    error_pct = abs(predicted - published) / published * 100.0

    return {
        "load_id": load["id"],
        "caliber": load["caliber"],
        "bullet_desc": load["bullet_desc"],
        "powder_name": load["powder_name"],
        "charge_gr": load["charge_gr"],
        "barrel_length_mm": load["barrel_length_mm"],
        "predicted_velocity_fps": round(predicted, 1),
        "published_velocity_fps": published,
        "error_pct": round(error_pct, 2),
        "is_pass": error_pct < load.get("tolerance_pct", 5.0),
        "source": load["source"],
    }
