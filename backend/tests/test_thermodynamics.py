"""Unit tests for app.core.thermodynamics: Noble-Abel EOS, Vieille burn rate, form function."""

import math

import numpy as np
import pytest

from app.core.thermodynamics import (
    flame_temperature,
    form_function,
    form_function_3curve,
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


# ---------------------------------------------------------------------------
# form_function_3curve
# ---------------------------------------------------------------------------


class TestFormFunction3Curve:
    """Tests for form_function_3curve(z, z1, z2, bp, br, brp).

    The 3-curve model divides combustion into three phases:
      Phase 1 (0 <= z < z1): Initial ignition.
      Phase 2 (z1 <= z < z2): Main combustion.
      Phase 3 (z2 <= z <= 1): Tail-off.
    """

    # Default test parameters
    Z1 = 0.4
    Z2 = 0.8
    BP = 0.15
    BR = 0.10
    BRP = 0.12

    def test_form_function_3curve_boundary_values(self):
        """psi(0) must be 0.0 and psi(1) must be 1.0."""
        assert form_function_3curve(0.0, self.Z1, self.Z2, self.BP, self.BR, self.BRP) == 0.0
        assert form_function_3curve(1.0, self.Z1, self.Z2, self.BP, self.BR, self.BRP) == pytest.approx(1.0, abs=1e-12)

    def test_form_function_3curve_monotonic(self):
        """psi must be monotonically non-decreasing from z=0 to z=1."""
        z_values = [i / 10.0 for i in range(11)]  # [0.0, 0.1, ..., 1.0]
        vals = [form_function_3curve(z, self.Z1, self.Z2, self.BP, self.BR, self.BRP) for z in z_values]
        assert all(vals[i + 1] >= vals[i] for i in range(len(vals) - 1)), (
            f"Monotonicity violated: {vals}"
        )

    def test_form_function_3curve_continuity_at_z1(self):
        """psi must be C0-continuous at the z1 transition point (no jump)."""
        eps = 1e-10
        left = form_function_3curve(self.Z1 - eps, self.Z1, self.Z2, self.BP, self.BR, self.BRP)
        right = form_function_3curve(self.Z1 + eps, self.Z1, self.Z2, self.BP, self.BR, self.BRP)
        assert abs(left - right) < 1e-6, (
            f"Discontinuity at z1={self.Z1}: left={left}, right={right}, diff={abs(left-right)}"
        )

    def test_form_function_3curve_continuity_at_z2(self):
        """psi must be C0-continuous at the z2 transition point (no jump)."""
        eps = 1e-10
        left = form_function_3curve(self.Z2 - eps, self.Z1, self.Z2, self.BP, self.BR, self.BRP)
        right = form_function_3curve(self.Z2 + eps, self.Z1, self.Z2, self.BP, self.BR, self.BRP)
        assert abs(left - right) < 1e-6, (
            f"Discontinuity at z2={self.Z2}: left={left}, right={right}, diff={abs(left-right)}"
        )

    def test_form_function_3curve_clamping(self):
        """Negative z should return 0.0 and z > 1.0 should return 1.0."""
        assert form_function_3curve(-0.5, self.Z1, self.Z2, self.BP, self.BR, self.BRP) == 0.0
        assert form_function_3curve(1.5, self.Z1, self.Z2, self.BP, self.BR, self.BRP) == pytest.approx(1.0, abs=1e-12)

    @pytest.mark.parametrize("bp,br,brp,z1,z2,name", [
        (0.0936, 0.0794, 0.0868, 0.4804, 0.8363, "Hodgdon 50BMG"),
        (0.1717, 0.1259, 0.1506, 0.3391, 0.4215, "Hodgdon H380 #3"),
        (0.1238, 0.0892, 0.1079, 0.6264, 0.6890, "Alliant RL 25"),
        (0.1995, 0.1310, 0.1688, 0.4296, 0.8867, "Win StaBALL Match"),
    ])
    def test_form_function_3curve_multiple_powders(self, bp, br, brp, z1, z2, name):
        """For real GRT powder data: psi(0)=0, psi(1)=1, monotonic, continuous at z1/z2."""
        # Boundary values
        assert form_function_3curve(0.0, z1, z2, bp, br, brp) == 0.0, f"{name}: psi(0) != 0"
        assert form_function_3curve(1.0, z1, z2, bp, br, brp) == pytest.approx(1.0, abs=1e-10), (
            f"{name}: psi(1) != 1"
        )

        # Monotonicity
        z_values = [i / 100.0 for i in range(101)]
        vals = [form_function_3curve(z, z1, z2, bp, br, brp) for z in z_values]
        assert all(vals[i + 1] >= vals[i] for i in range(len(vals) - 1)), (
            f"{name}: monotonicity violated"
        )

        # Continuity at z1
        eps = 1e-10
        left_z1 = form_function_3curve(z1 - eps, z1, z2, bp, br, brp)
        right_z1 = form_function_3curve(z1 + eps, z1, z2, bp, br, brp)
        assert abs(left_z1 - right_z1) < 1e-6, (
            f"{name}: discontinuity at z1={z1}: diff={abs(left_z1 - right_z1)}"
        )

        # Continuity at z2
        left_z2 = form_function_3curve(z2 - eps, z1, z2, bp, br, brp)
        right_z2 = form_function_3curve(z2 + eps, z1, z2, bp, br, brp)
        assert abs(left_z2 - right_z2) < 1e-6, (
            f"{name}: discontinuity at z2={z2}: diff={abs(left_z2 - right_z2)}"
        )

    def test_form_function_3curve_midpoint_progressive(self):
        """For a progressive powder (Bp > 0, Br > 0), psi(0.5) should be between 0.3 and 0.7."""
        psi_mid = form_function_3curve(0.5, self.Z1, self.Z2, self.BP, self.BR, self.BRP)
        assert 0.3 <= psi_mid <= 0.7, (
            f"psi(0.5) = {psi_mid} outside expected range [0.3, 0.7]"
        )
