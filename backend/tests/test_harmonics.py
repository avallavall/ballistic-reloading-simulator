"""Unit tests for app.core.harmonics: cantilever frequencies, muzzle deflection, OCW barrel times."""

import math

import numpy as np
import pytest

from app.core.harmonics import (
    cantilever_frequency,
    muzzle_deflection,
    ocw_barrel_times,
    CANTILEVER_EIGENVALUES,
)


# ---------------------------------------------------------------------------
# Helpers: typical rifle barrel parameters
# ---------------------------------------------------------------------------

# 4140 steel barrel (typical rifle barrel material)
STEEL_E = 200e9        # Young's modulus (Pa)
STEEL_RHO = 7850.0     # Density (kg/m^3)

# .308 Win barrel geometry: 610mm (24") free length
# OD ~25.4mm (1"), bore ~7.62mm
BARREL_LENGTH = 0.610                                         # m
BARREL_OD = 0.0254                                            # m (outer diameter)
BARREL_ID = 0.00762                                           # m (bore diameter)
BARREL_I = (math.pi / 64) * (BARREL_OD**4 - BARREL_ID**4)    # second moment of area (m^4)
BARREL_A = (math.pi / 4) * (BARREL_OD**2 - BARREL_ID**2)     # cross-section area (m^2)


# ---------------------------------------------------------------------------
# cantilever_frequency
# ---------------------------------------------------------------------------


class TestCantileverFrequency:
    """Tests for cantilever_frequency(mode, length, E, I, rho, A)."""

    def test_mode1_typical_rifle(self):
        """First mode frequency for a typical .308 rifle barrel should be 30-200 Hz.

        This is the dominant low-frequency vibration mode of a cantilever
        barrel clamped at the receiver. For a 24" barrel with 1" OD and
        7.62mm bore, the Euler-Bernoulli model gives ~50 Hz.
        """
        f1 = cantilever_frequency(
            mode=1,
            length=BARREL_LENGTH,
            E=STEEL_E,
            I=BARREL_I,
            rho=STEEL_RHO,
            A=BARREL_A,
        )
        assert 30 <= f1 <= 200, f"Mode 1 frequency {f1:.1f} Hz outside expected range"

    def test_higher_modes_increase(self):
        """Higher vibration modes must have higher frequencies.

        f_n is proportional to lambda_n^2, and lambda_n increases with mode number.
        """
        kwargs = dict(length=BARREL_LENGTH, E=STEEL_E, I=BARREL_I, rho=STEEL_RHO, A=BARREL_A)
        f1 = cantilever_frequency(mode=1, **kwargs)
        f2 = cantilever_frequency(mode=2, **kwargs)
        f3 = cantilever_frequency(mode=3, **kwargs)

        assert f2 > f1
        assert f3 > f2

    def test_known_value_mode1(self):
        """Verify mode 1 against hand calculation.

        f_1 = lambda_1^2 / (2*pi*L^2) * sqrt(E*I / (rho*A))
            = 1.8751^2 / (2*pi*0.610^2) * sqrt(200e9 * I / (7850 * A))
        """
        lam1 = CANTILEVER_EIGENVALUES[0]  # 1.8751
        expected = (lam1**2 / (2.0 * math.pi * BARREL_LENGTH**2)) * math.sqrt(
            STEEL_E * BARREL_I / (STEEL_RHO * BARREL_A)
        )
        f1 = cantilever_frequency(
            mode=1,
            length=BARREL_LENGTH,
            E=STEEL_E,
            I=BARREL_I,
            rho=STEEL_RHO,
            A=BARREL_A,
        )
        assert f1 == pytest.approx(expected, rel=1e-12)

    def test_shorter_barrel_higher_frequency(self):
        """A shorter barrel should vibrate at a higher frequency (f ~ 1/L^2)."""
        kwargs = dict(E=STEEL_E, I=BARREL_I, rho=STEEL_RHO, A=BARREL_A)
        f_long = cantilever_frequency(mode=1, length=0.610, **kwargs)   # 24"
        f_short = cantilever_frequency(mode=1, length=0.508, **kwargs)  # 20"
        assert f_short > f_long

    def test_frequency_inversely_proportional_to_L2(self):
        """Frequency should scale as 1/L^2.

        f(L1) / f(L2) = (L2/L1)^2
        """
        kwargs = dict(E=STEEL_E, I=BARREL_I, rho=STEEL_RHO, A=BARREL_A)
        L1, L2 = 0.5, 1.0
        f1 = cantilever_frequency(mode=1, length=L1, **kwargs)
        f2 = cantilever_frequency(mode=1, length=L2, **kwargs)
        ratio = f1 / f2
        expected_ratio = (L2 / L1) ** 2  # = 4.0
        assert ratio == pytest.approx(expected_ratio, rel=1e-12)

    def test_mode2_to_mode1_ratio(self):
        """The ratio of mode 2 to mode 1 frequencies should be (lambda_2/lambda_1)^2.

        lambda_2/lambda_1 = 4.6941/1.8751 = 2.5028
        (lambda_2/lambda_1)^2 = 6.264
        """
        kwargs = dict(length=BARREL_LENGTH, E=STEEL_E, I=BARREL_I, rho=STEEL_RHO, A=BARREL_A)
        f1 = cantilever_frequency(mode=1, **kwargs)
        f2 = cantilever_frequency(mode=2, **kwargs)
        expected_ratio = (CANTILEVER_EIGENVALUES[1] / CANTILEVER_EIGENVALUES[0]) ** 2
        assert (f2 / f1) == pytest.approx(expected_ratio, rel=1e-10)


# ---------------------------------------------------------------------------
# muzzle_deflection
# ---------------------------------------------------------------------------


class TestMuzzleDeflection:
    """Tests for muzzle_deflection(mode_amplitudes, frequencies, time, length)."""

    def test_basic_nonzero_deflection(self):
        """At a non-zero time with non-zero amplitudes, deflection should be non-zero.

        Single mode: A=0.001m, f=100Hz, t=0.001s (not at a zero-crossing).
        delta = 0.001 * sin(2*pi*100*0.001) = 0.001 * sin(0.6283) = 0.001 * 0.5878
        """
        d = muzzle_deflection(
            mode_amplitudes=[0.001],
            frequencies=[100.0],
            time=0.001,
            length=BARREL_LENGTH,
        )
        assert d != 0.0
        expected = 0.001 * math.sin(2.0 * math.pi * 100.0 * 0.001)
        assert d == pytest.approx(expected, rel=1e-12)

    def test_zero_at_t_zero(self):
        """At t=0, sin(0)=0 for all modes, so deflection must be zero."""
        d = muzzle_deflection(
            mode_amplitudes=[0.001, 0.0005],
            frequencies=[100.0, 250.0],
            time=0.0,
            length=BARREL_LENGTH,
        )
        assert d == pytest.approx(0.0, abs=1e-15)

    def test_superposition_of_modes(self):
        """Deflection should be the sum of individual mode contributions."""
        amps = [0.001, 0.0005, 0.0002]
        freqs = [100.0, 250.0, 500.0]
        t = 0.0015

        d_total = muzzle_deflection(amps, freqs, t, BARREL_LENGTH)
        d_sum = sum(a * math.sin(2 * math.pi * f * t) for a, f in zip(amps, freqs))
        assert d_total == pytest.approx(d_sum, rel=1e-12)

    def test_empty_modes_returns_zero(self):
        """With no modes, deflection should be zero."""
        d = muzzle_deflection(
            mode_amplitudes=[],
            frequencies=[],
            time=0.001,
            length=BARREL_LENGTH,
        )
        assert d == 0.0

    def test_node_time_zero_deflection(self):
        """At a node time (half period), sin returns to zero.

        For f=100 Hz, T=0.01s, at t=T/2=0.005s: sin(2*pi*100*0.005)=sin(pi)=0.
        """
        d = muzzle_deflection(
            mode_amplitudes=[0.001],
            frequencies=[100.0],
            time=0.005,
            length=BARREL_LENGTH,
        )
        assert d == pytest.approx(0.0, abs=1e-12)


# ---------------------------------------------------------------------------
# ocw_barrel_times
# ---------------------------------------------------------------------------


class TestOCWBarrelTimes:
    """Tests for ocw_barrel_times(dominant_frequency, n_nodes)."""

    def test_count_default(self):
        """Default n_nodes=6 should return 6 optimal barrel times."""
        times = ocw_barrel_times(dominant_frequency=100.0)
        assert len(times) == 6

    def test_count_custom(self):
        """Custom n_nodes should return exactly that many times."""
        times = ocw_barrel_times(dominant_frequency=100.0, n_nodes=10)
        assert len(times) == 10

    def test_all_positive(self):
        """All optimal barrel times must be positive."""
        times = ocw_barrel_times(dominant_frequency=100.0)
        for t in times:
            assert t > 0.0

    def test_monotonically_increasing(self):
        """Barrel times must be strictly increasing."""
        times = ocw_barrel_times(dominant_frequency=100.0)
        for i in range(1, len(times)):
            assert times[i] > times[i - 1]

    def test_known_values(self):
        """Verify against hand calculation.

        t_OBT_k = (2k - 1) / (4 * f)
        For f=100 Hz:
          k=1: 1/(400) = 0.0025 s = 2.5 ms
          k=2: 3/(400) = 0.0075 s = 7.5 ms
          k=3: 5/(400) = 0.0125 s = 12.5 ms
        """
        times = ocw_barrel_times(dominant_frequency=100.0, n_nodes=3)
        assert times[0] == pytest.approx(0.0025, rel=1e-12)
        assert times[1] == pytest.approx(0.0075, rel=1e-12)
        assert times[2] == pytest.approx(0.0125, rel=1e-12)

    def test_uniform_spacing(self):
        """Consecutive OBT values should be uniformly spaced by 1/(2*f).

        t_{k+1} - t_k = (2(k+1)-1)/(4f) - (2k-1)/(4f) = 2/(4f) = 1/(2f)
        """
        f = 150.0
        times = ocw_barrel_times(dominant_frequency=f, n_nodes=6)
        expected_spacing = 1.0 / (2.0 * f)
        for i in range(1, len(times)):
            spacing = times[i] - times[i - 1]
            assert spacing == pytest.approx(expected_spacing, rel=1e-12)

    def test_barrel_time_range_realistic(self):
        """For typical mode 2 frequency (~600 Hz), first OBT should be sub-millisecond.

        t_1 = 1 / (4 * 600) = 0.000417 s = 0.417 ms
        Typical barrel times are 0.5-2.0 ms, so this is in the right ballpark.
        """
        times = ocw_barrel_times(dominant_frequency=600.0, n_nodes=6)
        assert times[0] == pytest.approx(1.0 / 2400.0, rel=1e-12)
        # First few OBTs should be in the 0.1 - 5 ms range
        for t in times[:3]:
            assert 1e-4 < t < 5e-3
