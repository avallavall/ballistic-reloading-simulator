"""Tests for bullet seed data integrity, manufacturer coverage, and quality scores.

Validates:
- All 7 manufacturer JSON files exist and are well-formed
- Total bullet count >= 500
- All 7 manufacturers represented
- Sierra bullets have velocity-banded BCs
- Barnes bullets are solid copper
- Unique names across all files
- Sectional density accuracy
- Quality scores are computable
- Required fields present on all bullets
"""

import json
import math
from pathlib import Path

import pytest

from app.core.quality import compute_bullet_quality_score
from app.seed.initial_data import BULLET_MANUFACTURERS

FIXTURES_DIR = Path(__file__).parent.parent / "app" / "seed" / "fixtures" / "bullets"

REQUIRED_FIELDS = [
    "name", "manufacturer", "weight_grains", "diameter_mm",
    "bc_g1", "sectional_density", "material",
]


def _load_all_bullets() -> list[dict]:
    """Load all bullets from all manufacturer files."""
    all_bullets = []
    for mfg in BULLET_MANUFACTURERS:
        filepath = FIXTURES_DIR / f"{mfg}.json"
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
            all_bullets.extend(data)
    return all_bullets


class TestSeedDataFiles:
    """Test seed data file existence and structure."""

    def test_all_manufacturer_files_exist(self):
        """Verify 7 JSON files exist in fixtures/bullets/."""
        for mfg in BULLET_MANUFACTURERS:
            filepath = FIXTURES_DIR / f"{mfg}.json"
            assert filepath.exists(), f"Missing fixture file: {filepath}"

    def test_total_bullet_count(self):
        """Total bullets across all 7 files must be >= 500."""
        all_bullets = _load_all_bullets()
        assert len(all_bullets) >= 500, (
            f"Only {len(all_bullets)} bullets, need 500+"
        )

    def test_manufacturer_coverage(self):
        """All 7 manufacturers must be represented in the data."""
        all_bullets = _load_all_bullets()
        manufacturers = {b["manufacturer"] for b in all_bullets}
        expected = {"Sierra", "Hornady", "Berger", "Nosler", "Lapua", "Barnes", "Speer"}
        assert expected.issubset(manufacturers), (
            f"Missing manufacturers: {expected - manufacturers}"
        )


class TestSeedDataQuality:
    """Test data quality constraints."""

    def test_sierra_velocity_banded_bcs(self):
        """Every Sierra bullet must have all 5 velocity-banded BC fields (non-null)."""
        sierra_path = FIXTURES_DIR / "sierra.json"
        with open(sierra_path, encoding="utf-8") as f:
            sierra_bullets = json.load(f)

        bc_fields = [
            "bc_g1_high", "bc_g1_mid", "bc_g1_low",
            "bc_g1_high_vel", "bc_g1_mid_vel",
        ]
        for bullet in sierra_bullets:
            for field in bc_fields:
                assert field in bullet and bullet[field] is not None, (
                    f"Sierra bullet '{bullet['name']}' missing '{field}'"
                )

    def test_barnes_solid_copper(self):
        """All Barnes bullets must have material='solid_copper'."""
        barnes_path = FIXTURES_DIR / "barnes.json"
        with open(barnes_path, encoding="utf-8") as f:
            barnes_bullets = json.load(f)

        for bullet in barnes_bullets:
            assert bullet["material"] == "solid_copper", (
                f"Barnes bullet '{bullet['name']}' has material='{bullet['material']}', "
                f"expected 'solid_copper'"
            )

    def test_unique_bullet_names(self):
        """No duplicate names across all 7 files."""
        all_bullets = _load_all_bullets()
        names = [b["name"] for b in all_bullets]
        duplicates = {n for n in names if names.count(n) > 1}
        assert len(duplicates) == 0, (
            f"Duplicate bullet names found: {duplicates}"
        )

    def test_sectional_density_accuracy(self):
        """For a sample of bullets, verify SD = weight/(7000 * dia_inches^2) within 2%."""
        all_bullets = _load_all_bullets()
        # Sample: first bullet from each manufacturer file
        sample_indices = [0]
        for mfg in BULLET_MANUFACTURERS:
            filepath = FIXTURES_DIR / f"{mfg}.json"
            with open(filepath, encoding="utf-8") as f:
                data = json.load(f)
                if len(data) > 5:
                    sample_indices.append(5)

        sampled = []
        offset = 0
        for mfg in BULLET_MANUFACTURERS:
            filepath = FIXTURES_DIR / f"{mfg}.json"
            with open(filepath, encoding="utf-8") as f:
                data = json.load(f)
                # Take first and 5th bullet from each manufacturer
                for idx in [0, min(5, len(data) - 1)]:
                    sampled.append(data[idx])

        for bullet in sampled[:10]:  # Check up to 10 bullets
            weight_lb = bullet["weight_grains"] / 7000.0
            dia_inches = bullet["diameter_mm"] / 25.4
            expected_sd = weight_lb / (dia_inches ** 2)
            actual_sd = bullet["sectional_density"]
            pct_error = abs(actual_sd - expected_sd) / expected_sd * 100
            assert pct_error < 2.0, (
                f"Bullet '{bullet['name']}': SD {actual_sd} vs expected {expected_sd:.4f} "
                f"({pct_error:.1f}% error)"
            )

    def test_quality_scores_computed(self):
        """compute_bullet_quality_score returns score > 0 for every bullet."""
        all_bullets = _load_all_bullets()
        for bullet in all_bullets:
            data_source = bullet.get("data_source", "manufacturer")
            breakdown = compute_bullet_quality_score(bullet, data_source)
            assert breakdown.score > 0, (
                f"Bullet '{bullet['name']}' has quality score 0"
            )

    def test_required_fields_present(self):
        """All bullets must have the 7 required fields (non-null)."""
        all_bullets = _load_all_bullets()
        for bullet in all_bullets:
            for field in REQUIRED_FIELDS:
                assert field in bullet and bullet[field] is not None, (
                    f"Bullet '{bullet.get('name', '?')}' missing required field '{field}'"
                )
