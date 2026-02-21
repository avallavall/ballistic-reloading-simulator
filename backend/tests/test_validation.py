"""Validation quality gate: verify solver accuracy against published reloading data.

This test suite runs all reference loads from the shared VALIDATION_LOADS fixture
and asserts that the solver meets accuracy targets:
  - Mean velocity error < 5%
  - Max velocity error < 8%
  - No systematic bias (mean signed error < 3%)
  - All loads produce valid results (no crashes)
  - At least 20 reference loads defined
"""

import pytest

from tests.fixtures.validation_loads import VALIDATION_LOADS, run_validation_load


def test_validation_load_count():
    """Must have at least 20 reference loads."""
    assert len(VALIDATION_LOADS) >= 20, f"Only {len(VALIDATION_LOADS)} loads, need 20+"


def test_validation_all_loads_produce_results():
    """Every reference load should produce a valid simulation (no crashes)."""
    for load in VALIDATION_LOADS:
        result = run_validation_load(load)
        assert result["predicted_velocity_fps"] > 0, f"Load {load['id']} failed"


def test_validation_mean_error_below_5_percent():
    """Mean velocity error across all loads must be below 5%."""
    errors = []
    for load in VALIDATION_LOADS:
        result = run_validation_load(load)
        errors.append(result["error_pct"])
    mean_error = sum(errors) / len(errors)
    assert mean_error < 5.0, (
        f"Mean error {mean_error:.2f}% exceeds 5% target. "
        f"Per-load errors: {[f'{e:.1f}%' for e in errors]}"
    )


def test_validation_max_error_below_8_percent():
    """No single load should have error above 8%."""
    for load in VALIDATION_LOADS:
        result = run_validation_load(load)
        assert result["error_pct"] < 8.0, (
            f"Load {load['id']} error {result['error_pct']:.2f}% exceeds 8%"
        )


def test_validation_no_systematic_bias():
    """Mean signed error should be near zero (no consistent over/under-prediction)."""
    signed_errors = []
    for load in VALIDATION_LOADS:
        result = run_validation_load(load)
        signed = (
            (result["predicted_velocity_fps"] - result["published_velocity_fps"])
            / result["published_velocity_fps"]
            * 100
        )
        signed_errors.append(signed)
    mean_signed = sum(signed_errors) / len(signed_errors)
    assert abs(mean_signed) < 3.0, f"Systematic bias: mean signed error {mean_signed:.2f}%"


def test_validation_all_calibers_represented():
    """At least 4 distinct calibers must be in the validation set."""
    calibers = set(load["caliber"] for load in VALIDATION_LOADS)
    assert len(calibers) >= 4, f"Only {len(calibers)} calibers: {calibers}"


def test_validation_per_caliber_accuracy():
    """Each caliber should independently meet the 5% mean error threshold."""
    caliber_errors: dict[str, list[float]] = {}
    for load in VALIDATION_LOADS:
        result = run_validation_load(load)
        cal = load["caliber"]
        caliber_errors.setdefault(cal, []).append(result["error_pct"])

    for cal, errors in caliber_errors.items():
        mean_err = sum(errors) / len(errors)
        assert mean_err < 5.0, (
            f"{cal}: mean error {mean_err:.2f}% exceeds 5%. "
            f"Errors: {[f'{e:.1f}%' for e in errors]}"
        )
