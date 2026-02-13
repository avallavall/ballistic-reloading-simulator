"""Unit tests for app.core.structural: Lame hoop stress, case expansion, Lawton erosion."""

import math

import numpy as np
import pytest

from app.core.structural import (
    lame_hoop_stress,
    case_expansion,
    lawton_erosion,
    R_UNIVERSAL,
)


# ---------------------------------------------------------------------------
# lame_hoop_stress
# ---------------------------------------------------------------------------


class TestLameHoopStress:
    """Tests for lame_hoop_stress(internal_pressure, inner_radius, outer_radius, eval_radius)."""

    def test_basic_positive_stress(self):
        """A positive internal pressure should produce a positive hoop stress.

        Using a simplified thick cylinder: r_i=5mm, r_o=7mm, P=300 MPa,
        evaluated at the inner surface (r=r_i).
        """
        stress = lame_hoop_stress(
            internal_pressure=300e6,
            inner_radius=0.005,
            outer_radius=0.007,
            eval_radius=0.005,
        )
        assert stress > 0.0

    def test_inner_stress_greater_than_outer(self):
        """Hoop stress at the inner surface must exceed stress at the outer surface.

        This is a fundamental result of Lame's theory: the inner wall always
        bears the highest circumferential stress.
        """
        P = 300e6
        ri = 0.005
        ro = 0.007

        stress_inner = lame_hoop_stress(P, ri, ro, eval_radius=ri)
        stress_outer = lame_hoop_stress(P, ri, ro, eval_radius=ro)

        assert stress_inner > stress_outer

    def test_zero_pressure_returns_zero(self):
        """With zero internal pressure, hoop stress must be zero everywhere."""
        stress = lame_hoop_stress(
            internal_pressure=0.0,
            inner_radius=0.005,
            outer_radius=0.007,
            eval_radius=0.006,
        )
        assert stress == 0.0

    def test_known_value_inner_surface(self):
        """Verify against hand calculation at the inner surface.

        sigma_theta(r_i) = P_i * r_i^2 / (r_o^2 - r_i^2) * (1 + r_o^2 / r_i^2)

        With r_i=5mm, r_o=7mm, P=300 MPa:
        r_i^2 = 25e-6, r_o^2 = 49e-6
        sigma = 300e6 * 25e-6 / (49e-6 - 25e-6) * (1 + 49e-6 / 25e-6)
              = 300e6 * 25e-6 / 24e-6 * (1 + 1.96)
              = 300e6 * 1.04167 * 2.96
              = 300e6 * 3.08333
              = 925_000_000 Pa
        """
        stress = lame_hoop_stress(
            internal_pressure=300e6,
            inner_radius=0.005,
            outer_radius=0.007,
            eval_radius=0.005,
        )
        ri2 = 0.005 ** 2
        ro2 = 0.007 ** 2
        expected = 300e6 * ri2 / (ro2 - ri2) * (1.0 + ro2 / ri2)
        assert stress == pytest.approx(expected, rel=1e-12)

    def test_known_value_outer_surface(self):
        """Verify against hand calculation at the outer surface.

        sigma_theta(r_o) = P_i * r_i^2 / (r_o^2 - r_i^2) * (1 + r_o^2 / r_o^2)
                         = P_i * r_i^2 / (r_o^2 - r_i^2) * 2
        """
        stress = lame_hoop_stress(
            internal_pressure=300e6,
            inner_radius=0.005,
            outer_radius=0.007,
            eval_radius=0.007,
        )
        ri2 = 0.005 ** 2
        ro2 = 0.007 ** 2
        expected = 300e6 * ri2 / (ro2 - ri2) * 2.0
        assert stress == pytest.approx(expected, rel=1e-12)

    def test_stress_proportional_to_pressure(self):
        """Doubling the pressure should double the hoop stress (linear relationship)."""
        ri, ro, r = 0.005, 0.007, 0.006
        stress_1 = lame_hoop_stress(100e6, ri, ro, r)
        stress_2 = lame_hoop_stress(200e6, ri, ro, r)
        assert stress_2 == pytest.approx(2.0 * stress_1, rel=1e-12)

    def test_thin_wall_approximation(self):
        """For a thin-walled cylinder (r_o ~ r_i), hoop stress approaches P*r/t.

        Use r_i=49.5mm, r_o=50.5mm (t=1mm), P=10 MPa, eval at midwall r=50mm.
        Thin-wall: sigma = P * r / t = 10e6 * 0.05 / 0.001 = 500 MPa.
        The Lame result should be close.
        """
        ri = 0.0495
        ro = 0.0505
        r_mid = 0.050
        P = 10e6

        stress = lame_hoop_stress(P, ri, ro, r_mid)
        thin_wall_approx = P * r_mid / (ro - ri)
        assert stress == pytest.approx(thin_wall_approx, rel=0.02)  # within 2%


# ---------------------------------------------------------------------------
# case_expansion
# ---------------------------------------------------------------------------


class TestCaseExpansion:
    """Tests for case_expansion(internal_pressure, inner_radius, outer_radius,
    youngs_modulus, poisson_ratio)."""

    def test_positive_expansion(self):
        """Positive internal pressure should produce positive radial expansion."""
        expansion = case_expansion(
            internal_pressure=300e6,
            inner_radius=0.005,
            outer_radius=0.007,
            youngs_modulus=110e9,
            poisson_ratio=0.31,
        )
        assert expansion > 0.0

    def test_known_value_brass_c26000(self):
        """Verify against hand calculation for brass C26000 cartridge case.

        Brass C26000: E=110 GPa, nu=0.31
        Case geometry: r_i=5mm, r_o=7mm
        Pressure: P=300 MPa

        u_r(r_o) = P * r_i^2 * r_o * 2 / (E * (r_o^2 - r_i^2))
                 = 300e6 * 25e-6 * 0.007 * 2 / (110e9 * (49e-6 - 25e-6))
                 = 300e6 * 25e-6 * 0.014 / (110e9 * 24e-6)
                 = 1.05e-1 / 2.64e3
                 = 3.977e-5 m (~0.04 mm)
        """
        expansion = case_expansion(
            internal_pressure=300e6,
            inner_radius=0.005,
            outer_radius=0.007,
            youngs_modulus=110e9,
            poisson_ratio=0.31,
        )
        ri2 = 0.005 ** 2
        ro2 = 0.007 ** 2
        expected = (300e6 * ri2 * 0.007 * 2.0) / (110e9 * (ro2 - ri2))
        assert expansion == pytest.approx(expected, rel=1e-12)

    def test_zero_pressure_returns_zero(self):
        """Zero pressure should yield zero expansion."""
        expansion = case_expansion(
            internal_pressure=0.0,
            inner_radius=0.005,
            outer_radius=0.007,
            youngs_modulus=110e9,
            poisson_ratio=0.31,
        )
        assert expansion == 0.0

    def test_expansion_proportional_to_pressure(self):
        """Expansion is linear with pressure."""
        kwargs = dict(
            inner_radius=0.005,
            outer_radius=0.007,
            youngs_modulus=110e9,
            poisson_ratio=0.31,
        )
        exp1 = case_expansion(internal_pressure=100e6, **kwargs)
        exp2 = case_expansion(internal_pressure=300e6, **kwargs)
        assert exp2 == pytest.approx(3.0 * exp1, rel=1e-12)

    def test_higher_modulus_less_expansion(self):
        """A stiffer material (higher E) should produce less expansion."""
        kwargs = dict(
            internal_pressure=300e6,
            inner_radius=0.005,
            outer_radius=0.007,
            poisson_ratio=0.31,
        )
        exp_brass = case_expansion(youngs_modulus=110e9, **kwargs)  # brass
        exp_steel = case_expansion(youngs_modulus=200e9, **kwargs)  # steel
        assert exp_steel < exp_brass


# ---------------------------------------------------------------------------
# lawton_erosion
# ---------------------------------------------------------------------------


class TestLawtonErosion:
    """Tests for lawton_erosion(erosivity, exposure_time, activation_energy, surface_temp)."""

    def test_typical_308_conditions(self):
        """Typical .308 Win barrel erosion per shot.

        Erosivity E_r ~ 1e-3 m/s^0.5 (order of magnitude estimate),
        exposure time t ~ 1.5 ms, activation energy ~ 150 kJ/mol,
        surface temp ~ 3500 K.

        Erosion should be a small positive number (micrometers per shot).
        """
        erosion = lawton_erosion(
            erosivity=1e-3,
            exposure_time=1.5e-3,
            activation_energy=150_000,
            surface_temp=3500.0,
        )
        assert erosion > 0.0
        # Should be in the micrometer range (1e-9 to 1e-3 m per shot)
        assert 1e-9 < erosion < 1e-3

    def test_zero_time_returns_zero(self):
        """Zero exposure time should yield zero erosion (sqrt(0) = 0)."""
        erosion = lawton_erosion(
            erosivity=1e-3,
            exposure_time=0.0,
            activation_energy=150_000,
            surface_temp=3500.0,
        )
        assert erosion == 0.0

    def test_zero_temperature_returns_zero(self):
        """Zero surface temperature should return 0 (guard clause)."""
        erosion = lawton_erosion(
            erosivity=1e-3,
            exposure_time=1.5e-3,
            activation_energy=150_000,
            surface_temp=0.0,
        )
        assert erosion == 0.0

    def test_negative_temperature_returns_zero(self):
        """Negative surface temperature should return 0 (guard clause)."""
        erosion = lawton_erosion(
            erosivity=1e-3,
            exposure_time=1.5e-3,
            activation_energy=150_000,
            surface_temp=-100.0,
        )
        assert erosion == 0.0

    def test_temperature_sensitivity(self):
        """Higher surface temperature should produce more erosion.

        The Arrhenius factor exp(-E_a / (R*T)) increases with temperature.
        """
        kwargs = dict(erosivity=1e-3, exposure_time=1.5e-3, activation_energy=150_000)
        erosion_low = lawton_erosion(surface_temp=3000.0, **kwargs)
        erosion_high = lawton_erosion(surface_temp=4000.0, **kwargs)
        assert erosion_high > erosion_low

    def test_known_value(self):
        """Verify against hand calculation.

        W = E_r * sqrt(t) * exp(-E_a / (R * T))
          = 1e-3 * sqrt(1.5e-3) * exp(-150000 / (8.314 * 3500))
          = 1e-3 * 0.03873 * exp(-5.1466)
          = 1e-3 * 0.03873 * 5.821e-3
          = 2.254e-7 m
        """
        erosion = lawton_erosion(
            erosivity=1e-3,
            exposure_time=1.5e-3,
            activation_energy=150_000,
            surface_temp=3500.0,
        )
        expected = 1e-3 * np.sqrt(1.5e-3) * np.exp(-150_000 / (R_UNIVERSAL * 3500.0))
        assert erosion == pytest.approx(expected, rel=1e-12)

    def test_erosion_increases_with_time(self):
        """Longer exposure time should produce more erosion (sqrt relationship)."""
        kwargs = dict(erosivity=1e-3, activation_energy=150_000, surface_temp=3500.0)
        erosion_short = lawton_erosion(exposure_time=1e-3, **kwargs)
        erosion_long = lawton_erosion(exposure_time=4e-3, **kwargs)
        # sqrt(4e-3) / sqrt(1e-3) = 2.0
        assert erosion_long == pytest.approx(2.0 * erosion_short, rel=1e-12)
