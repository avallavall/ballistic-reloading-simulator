"""Tests for deterministic quality scoring algorithm."""

import pytest
from app.core.quality import (
    compute_quality_score,
    QualityBreakdown,
    CRITICAL_FIELDS,
    BONUS_FIELDS,
    SOURCE_SCORES,
)


class TestQualityScoring:
    """Tests for deterministic quality scoring algorithm."""

    def _full_powder_dict(self) -> dict:
        """Powder dict with all critical + bonus fields filled."""
        return {
            "burn_rate_coeff": 8.0e-8, "burn_rate_exp": 0.85,
            "force_constant_j_kg": 1_050_000, "covolume_m3_kg": 0.001,
            "flame_temp_k": 3100, "gamma": 1.24, "density_g_cm3": 1.6,
            "web_thickness_mm": 0.4, "ba": 0.7, "bp": 0.3,
            "br": 0.1, "brp": 0.05, "z1": 0.3, "z2": 0.7,
        }

    def test_manufacturer_full_data_scores_100(self):
        r = compute_quality_score(self._full_powder_dict(), "manufacturer")
        assert r.score == 100
        assert r.missing_fields == []
        assert r.filled_count == 14

    def test_estimated_full_data_below_40(self):
        r = compute_quality_score(self._full_powder_dict(), "estimated")
        assert r.score < 40  # 0.30*100 + 0.70*10 = 37

    def test_manufacturer_with_gaps_beats_estimated_full(self):
        """User decision: manufacturer with gaps > complete estimated."""
        partial = {"burn_rate_coeff": 1.0, "burn_rate_exp": 0.8}
        r_mfr = compute_quality_score(partial, "manufacturer")
        r_est = compute_quality_score(self._full_powder_dict(), "estimated")
        assert r_mfr.score > r_est.score

    def test_deterministic(self):
        """Same inputs always produce same output."""
        d = self._full_powder_dict()
        r1 = compute_quality_score(d, "grt_community")
        r2 = compute_quality_score(d, "grt_community")
        assert r1.score == r2.score
        assert r1.missing_fields == r2.missing_fields

    def test_source_tier_ordering(self):
        d = self._full_powder_dict()
        scores = {src: compute_quality_score(d, src).score for src in SOURCE_SCORES}
        assert scores["manufacturer"] > scores["grt_community"]
        assert scores["grt_community"] > scores["grt_modified"]
        assert scores["grt_modified"] > scores["manual"]
        assert scores["manual"] > scores["estimated"]

    def test_empty_dict_returns_zero_completeness(self):
        r = compute_quality_score({}, "manual")
        assert r.filled_count == 0
        assert r.completeness_score == 0
        assert len(r.missing_fields) == 14

    def test_critical_fields_weighted_double(self):
        """Filling one critical field should increase score more than one bonus field."""
        one_critical = {"burn_rate_coeff": 1.0}
        one_bonus = {"web_thickness_mm": 0.4}
        r_c = compute_quality_score(one_critical, "manual")
        r_b = compute_quality_score(one_bonus, "manual")
        assert r_c.completeness_score > r_b.completeness_score

    def test_unknown_source_defaults_to_10(self):
        r = compute_quality_score({}, "unknown_source")
        assert r.source_score == 10

    def test_score_range_0_to_100(self):
        for src in SOURCE_SCORES:
            r1 = compute_quality_score({}, src)
            r2 = compute_quality_score(self._full_powder_dict(), src)
            assert 0 <= r1.score <= 100
            assert 0 <= r2.score <= 100

    def test_breakdown_dataclass_fields(self):
        r = compute_quality_score(self._full_powder_dict(), "grt_community")
        assert isinstance(r, QualityBreakdown)
        assert isinstance(r.score, int)
        assert isinstance(r.missing_fields, list)
        assert isinstance(r.data_source, str)
        assert r.data_source == "grt_community"
