"""Deterministic quality scoring for powder, bullet, and cartridge records.

Computes a 0-100 quality score based on:
- 30% field completeness (critical fields weighted 2x)
- 70% data source reliability tier

These functions are pure (no DB access, no side effects) and deterministic:
same inputs always produce the same output.
"""

from dataclasses import dataclass, field

# Fields the solver requires for meaningful simulation
CRITICAL_FIELDS = [
    "burn_rate_coeff",
    "burn_rate_exp",
    "force_constant_j_kg",
    "covolume_m3_kg",
    "flame_temp_k",
    "gamma",
    "density_g_cm3",
]

# Fields that improve accuracy but have reasonable defaults/fallbacks
BONUS_FIELDS = [
    "web_thickness_mm",
    "ba",
    "bp",
    "br",
    "brp",
    "z1",
    "z2",
]

# Source reliability scores (0-100)
SOURCE_SCORES = {
    "manufacturer": 100,
    "grt_community": 75,
    "grt_modified": 55,
    "manual": 35,
    "estimated": 10,
}


@dataclass
class QualityBreakdown:
    score: int                          # 0-100 final composite score
    completeness_score: int             # 0-100 raw completeness percentage
    source_score: int                   # 0-100 raw source tier score
    filled_count: int                   # critical + bonus fields filled
    total_count: int                    # total possible fields (14)
    missing_fields: list[str] = field(default_factory=list)
    data_source: str = "manual"


def compute_quality_score(powder_dict: dict, data_source: str) -> QualityBreakdown:
    """Compute deterministic quality score for a powder record.

    Args:
        powder_dict: Dictionary of powder field values (from model_dump or ORM row).
        data_source: One of the SOURCE_SCORES keys (or unknown -> defaults to 10).

    Returns:
        QualityBreakdown with computed score and field-level details.
    """
    critical_filled = sum(1 for f in CRITICAL_FIELDS if powder_dict.get(f) is not None)
    bonus_filled = sum(1 for f in BONUS_FIELDS if powder_dict.get(f) is not None)

    total_fields = len(CRITICAL_FIELDS) + len(BONUS_FIELDS)
    filled = critical_filled + bonus_filled

    # Critical fields weighted 2x vs bonus fields for completeness
    max_weighted = len(CRITICAL_FIELDS) * 2 + len(BONUS_FIELDS)
    weighted_filled = critical_filled * 2 + bonus_filled
    completeness_pct = round(100 * weighted_filled / max_weighted)

    source_pct = SOURCE_SCORES.get(data_source, 10)

    score = round(0.30 * completeness_pct + 0.70 * source_pct)

    missing = [f for f in CRITICAL_FIELDS + BONUS_FIELDS if powder_dict.get(f) is None]

    return QualityBreakdown(
        score=score,
        completeness_score=completeness_pct,
        source_score=source_pct,
        filled_count=filled,
        total_count=total_fields,
        missing_fields=missing,
        data_source=data_source,
    )


# --- Bullet quality scoring ---

BULLET_CRITICAL_FIELDS = [
    "weight_grains",
    "diameter_mm",
    "bc_g1",
    "sectional_density",
]

BULLET_BONUS_FIELDS = [
    "bc_g7",
    "length_mm",
    "model_number",
    "bullet_type",
    "base_type",
    "bearing_surface_mm",
    "boat_tail_length_mm",
    "meplat_diameter_mm",
    "ogive_type",
    "bc_g1_high",
    "bc_g1_mid",
    "bc_g1_low",
    "bc_g1_high_vel",
    "bc_g1_mid_vel",
]


def compute_bullet_quality_score(bullet_dict: dict, data_source: str) -> QualityBreakdown:
    """Compute deterministic quality score for a bullet record.

    Args:
        bullet_dict: Dictionary of bullet field values (from model_dump or ORM row).
        data_source: One of the SOURCE_SCORES keys (or unknown -> defaults to 10).

    Returns:
        QualityBreakdown with computed score and field-level details.
    """
    critical_filled = sum(1 for f in BULLET_CRITICAL_FIELDS if bullet_dict.get(f) is not None)
    bonus_filled = sum(1 for f in BULLET_BONUS_FIELDS if bullet_dict.get(f) is not None)

    total_fields = len(BULLET_CRITICAL_FIELDS) + len(BULLET_BONUS_FIELDS)
    filled = critical_filled + bonus_filled

    max_weighted = len(BULLET_CRITICAL_FIELDS) * 2 + len(BULLET_BONUS_FIELDS)
    weighted_filled = critical_filled * 2 + bonus_filled
    completeness_pct = round(100 * weighted_filled / max_weighted)

    source_pct = SOURCE_SCORES.get(data_source, 10)
    score = round(0.30 * completeness_pct + 0.70 * source_pct)

    missing = [f for f in BULLET_CRITICAL_FIELDS + BULLET_BONUS_FIELDS if bullet_dict.get(f) is None]

    return QualityBreakdown(
        score=score,
        completeness_score=completeness_pct,
        source_score=source_pct,
        filled_count=filled,
        total_count=total_fields,
        missing_fields=missing,
        data_source=data_source,
    )


# --- Cartridge quality scoring ---

CARTRIDGE_CRITICAL_FIELDS = [
    "saami_max_pressure_psi",
    "case_capacity_grains_h2o",
    "bore_diameter_mm",
    "groove_diameter_mm",
]

CARTRIDGE_BONUS_FIELDS = [
    "cip_max_pressure_mpa",
    "case_length_mm",
    "overall_length_mm",
    "parent_cartridge_name",
    "shoulder_diameter_mm",
    "neck_diameter_mm",
    "base_diameter_mm",
    "rim_diameter_mm",
    "shoulder_angle_deg",
    "neck_length_mm",
    "body_length_mm",
    "rim_thickness_mm",
    "case_type",
]


def compute_cartridge_quality_score(cartridge_dict: dict, data_source: str) -> QualityBreakdown:
    """Compute deterministic quality score for a cartridge record.

    Args:
        cartridge_dict: Dictionary of cartridge field values (from model_dump or ORM row).
        data_source: One of the SOURCE_SCORES keys (or unknown -> defaults to 10).

    Returns:
        QualityBreakdown with computed score and field-level details.
    """
    critical_filled = sum(1 for f in CARTRIDGE_CRITICAL_FIELDS if cartridge_dict.get(f) is not None)
    bonus_filled = sum(1 for f in CARTRIDGE_BONUS_FIELDS if cartridge_dict.get(f) is not None)

    total_fields = len(CARTRIDGE_CRITICAL_FIELDS) + len(CARTRIDGE_BONUS_FIELDS)
    filled = critical_filled + bonus_filled

    max_weighted = len(CARTRIDGE_CRITICAL_FIELDS) * 2 + len(CARTRIDGE_BONUS_FIELDS)
    weighted_filled = critical_filled * 2 + bonus_filled
    completeness_pct = round(100 * weighted_filled / max_weighted)

    source_pct = SOURCE_SCORES.get(data_source, 10)
    score = round(0.30 * completeness_pct + 0.70 * source_pct)

    missing = [f for f in CARTRIDGE_CRITICAL_FIELDS + CARTRIDGE_BONUS_FIELDS if cartridge_dict.get(f) is None]

    return QualityBreakdown(
        score=score,
        completeness_score=completeness_pct,
        source_score=source_pct,
        filled_count=filled,
        total_count=total_fields,
        missing_fields=missing,
        data_source=data_source,
    )
