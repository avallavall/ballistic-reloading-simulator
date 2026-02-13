"""Unit tests for app.core.thermodynamics: Noble-Abel EOS, Vieille burn rate, form function."""

import math

import numpy as np
import pytest

from app.core.thermodynamics import (
    flame_temperature,
    form_function,
    noble_abel_pressure,
    vieille_burn_rate,
    R_UNIVERSAL,
)


# ---------------------------------------------------------------------------
# noble_abel_pressure
# ---------------------------------------------------------------------------


class TestNobleAbelPressure:
    """Tests for noble_abel_pressure(mass_gas, volume, covolume, force, fraction_burned)."""

    def test_zero_burn_returns_zero(self):
        """When fraction_burned=0, no gas is produced so pressure must be zero."""
        result = noble_abel_pressure(
            mass_gas=0.003,
            volume=3e-5,
            covolume=0.001,
            force=950_000,
            fraction_burned=0.0,
        )
        assert result == 0.0

    def test_basic_known_values(self):
        """Verify pressure for a set of representative parameters.

        P = f * omega * psi / (V - omega * psi * eta)
          = 950000 * 0.003 * 0.5 / (3e-5 - 0.003 * 0.5 * 0.001)
          = 1425 / (3e-5 - 1.5e-6)
          = 1425 / 2.85e-5
          = 50_000_000 Pa  (50 MPa)
        """
        P = noble_abel_pressure(
            mass_gas=0.003,
            volume=3e-5,
            covolume=0.001,
            force=950_000,
            fraction_burned=0.5,
        )
        assert P == pytest.approx(50_000_000.0, rel=1e-9)

    def test_full_burn(self):
        """Full burn (psi=1.0) should give a higher pressure than partial burn."""
        P_partial = noble_abel_pressure(
            mass_gas=0.003,
            volume=3e-5,
            covolume=0.001,
            force=950_000,
            fraction_burned=0.5,
        )
        P_full = noble_abel_pressure(
            mass_gas=0.003,
            volume=3e-5,
            covolume=0.001,
            force=950_000,
            fraction_burned=1.0,
        )
        assert P_full > P_partial
        # Analytical: 950000*0.003*1.0 / (3e-5 - 0.003*1.0*0.001)
        #           = 2850 / (3e-5 - 3e-6)
        #           = 2850 / 2.7e-5 = 105_555_555.56 Pa
        assert P_full == pytest.approx(2850.0 / 2.7e-5, rel=1e-9)

    def test_denominator_zero_returns_inf(self):
        """When volume equals covolume*mass*psi, denominator is zero -> infinity."""
        # Set up so V = omega * psi * eta  =>  denominator = 0
        # omega=0.003, psi=1.0, eta chosen so 0.003 * 1.0 * eta = 3e-5
        # eta = 3e-5 / 0.003 = 0.01
        P = noble_abel_pressure(
            mass_gas=0.003,
            volume=3e-5,
            covolume=0.01,
            force=950_000,
            fraction_burned=1.0,
        )
        assert P == np.inf

    def test_negative_denominator_returns_inf(self):
        """When covolume is large enough that denominator goes negative -> infinity."""
        P = noble_abel_pressure(
            mass_gas=0.003,
            volume=3e-5,
            covolume=0.1,   # way too large -> denominator < 0
            force=950_000,
            fraction_burned=1.0,
        )
        assert P == np.inf

    def test_negative_fraction_returns_zero(self):
        """Negative fraction_burned should also return zero (guard)."""
        P = noble_abel_pressure(
            mass_gas=0.003,
            volume=3e-5,
            covolume=0.001,
            force=950_000,
            fraction_burned=-0.1,
        )
        assert P == 0.0


# ---------------------------------------------------------------------------
# vieille_burn_rate
# ---------------------------------------------------------------------------


class TestVieilleBurnRate:
    """Tests for vieille_burn_rate(pressure, coeff_a, exponent_n)."""

    def test_zero_pressure_returns_zero(self):
        """At zero pressure no combustion occurs."""
        rate = vieille_burn_rate(pressure=0.0, coeff_a=1.6e-8, exponent_n=0.86)
        assert rate == 0.0

    def test_negative_pressure_returns_zero(self):
        """Negative pressure should also return zero."""
        rate = vieille_burn_rate(pressure=-100.0, coeff_a=1.6e-8, exponent_n=0.86)
        assert rate == 0.0

    def test_basic_positive_and_reasonable(self):
        """At 300 MPa the burn rate should be positive and physically reasonable.

        r_b = 1.6e-8 * (300e6)^0.86
        Using Python: 300e6**0.86 ~ 4.24e7  =>  r_b ~ 0.679 m/s
        Physically, propellant burn rates at high pressures are ~0.1-2 m/s.
        """
        rate = vieille_burn_rate(pressure=300e6, coeff_a=1.6e-8, exponent_n=0.86)
        assert rate > 0.0
        # Verify magnitude: between 0.01 and 10 m/s
        assert 0.01 < rate < 10.0
        # Verify analytical value more precisely
        expected = 1.6e-8 * (300e6 ** 0.86)
        assert rate == pytest.approx(expected, rel=1e-12)

    def test_linear_coefficient(self):
        """When n=1.0, burn rate should be directly proportional to pressure."""
        rate1 = vieille_burn_rate(pressure=100e6, coeff_a=1e-9, exponent_n=1.0)
        rate2 = vieille_burn_rate(pressure=200e6, coeff_a=1e-9, exponent_n=1.0)
        assert rate2 == pytest.approx(2.0 * rate1, rel=1e-12)


# ---------------------------------------------------------------------------
# form_function
# ---------------------------------------------------------------------------


class TestFormFunction:
    """Tests for form_function(z, theta)."""

    def test_boundaries_z0_gives_psi0(self):
        """Z=0 (no burn) -> psi=0 regardless of theta."""
        for theta in [-0.5, -0.2, 0.0, 0.3, 0.5]:
            assert form_function(0.0, theta) == 0.0

    def test_boundaries_z1_gives_psi1(self):
        """Z=1 (complete burn) -> psi=1 regardless of theta.

        psi(1) = (theta+1)*1 - theta*1 = theta+1-theta = 1.
        """
        for theta in [-0.5, -0.2, 0.0, 0.3, 0.5]:
            assert form_function(1.0, theta) == pytest.approx(1.0, abs=1e-12)

    def test_neutral_grain_theta_zero(self):
        """With theta=0 (neutral grain), psi should equal Z linearly."""
        for z in [0.0, 0.25, 0.5, 0.75, 1.0]:
            assert form_function(z, 0.0) == pytest.approx(z, abs=1e-12)

    def test_progressive_grain(self):
        """Progressive grain (theta=-0.2), at Z=0.5:
        psi = (0.8)*0.5 - (-0.2)*0.25 = 0.4 + 0.05 = 0.45
        """
        psi = form_function(0.5, -0.2)
        assert psi == pytest.approx(0.45, abs=1e-12)

    def test_regressive_grain(self):
        """Regressive grain (theta=0.3), at Z=0.5:
        psi = (1.3)*0.5 - (0.3)*0.25 = 0.65 - 0.075 = 0.575
        """
        psi = form_function(0.5, 0.3)
        assert psi == pytest.approx(0.575, abs=1e-12)

    def test_progressive_below_neutral(self):
        """For progressive grain (theta<0) at midpoint, psi < Z (burns slower initially)."""
        psi = form_function(0.5, -0.2)
        assert psi < 0.5  # 0.45 < 0.5

    def test_regressive_above_neutral(self):
        """For regressive grain (theta>0) at midpoint, psi > Z."""
        psi = form_function(0.5, 0.3)
        assert psi > 0.5  # 0.575 > 0.5

    def test_clamping_below_zero(self):
        """Z < 0 should be clamped to 0 -> psi=0."""
        assert form_function(-0.5, -0.2) == 0.0

    def test_clamping_above_one(self):
        """Z > 1 should be clamped to 1 -> psi=1."""
        assert form_function(1.5, -0.2) == pytest.approx(1.0, abs=1e-12)


# ---------------------------------------------------------------------------
# flame_temperature
# ---------------------------------------------------------------------------


class TestFlameTemperature:
    """Tests for flame_temperature(force, molecular_weight)."""

    def test_basic_computation(self):
        """T_v = f * M_g / R_u.
        f=950000, M_g=0.025 kg/mol => T = 950000*0.025/8.314 ~ 2856.4 K
        """
        T = flame_temperature(force=950_000, molecular_weight=0.025)
        expected = 950_000 * 0.025 / R_UNIVERSAL
        assert T == pytest.approx(expected, rel=1e-12)

    def test_zero_force(self):
        """Zero force => zero temperature."""
        assert flame_temperature(0.0, 0.025) == 0.0
