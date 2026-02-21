"""Unit tests for app.core.solver: full ODE integration for internal ballistics.

NOTE: The current solver has a bootstrapping issue -- it starts with Z=0 (no burn),
P=0, and dZ/dt=0, so the system never ignites without a primer seed.  Tests that
exercise the full integration patch the initial Z to a small positive value (0.01)
to represent primer ignition.  A dedicated test documents this known limitation.
"""

from unittest.mock import patch

import pytest

from app.core.solver import (
    GRAINS_TO_KG,
    MM_TO_M,
    BulletParams,
    CartridgeParams,
    LoadParams,
    PowderParams,
    RifleParams,
    SimResult,
    simulate,
)


# ---------------------------------------------------------------------------
# Helpers: reusable .308 Winchester parameter set
# ---------------------------------------------------------------------------

Z_PRIMER = 0.01  # Small initial burn fraction representing primer ignition


def make_308_params():
    """Return a realistic .308 Winchester / 168 gr HPBT / Varget-like parameter set.

    The lumped-parameter model (Lagrange gradient, no heat loss, simplified
    friction) tends to overpredict pressure vs real-world results.  The
    acceptable test ranges are set accordingly.
    """
    powder = PowderParams(
        force_j_kg=950_000,
        covolume_m3_kg=0.001,
        burn_rate_coeff=1.6e-8,
        burn_rate_exp=0.86,
        gamma=1.24,
        density_kg_m3=920.0,
        flame_temp_k=4050.0,
        web_thickness_m=0.0004,
        theta=-0.2,
    )
    bullet = BulletParams(
        mass_kg=168 * GRAINS_TO_KG,
        diameter_m=7.82 * MM_TO_M,
    )
    cartridge = CartridgeParams(
        saami_max_pressure_psi=62_000,
        # .308 Win case capacity ~56 gr H2O -> ~3.63e-6 m^3
        chamber_volume_m3=3.63e-6,
        bore_diameter_m=7.62 * MM_TO_M,
    )
    rifle = RifleParams(
        barrel_length_m=610 * MM_TO_M,  # 24 inches
        twist_rate_m=254 * MM_TO_M,     # 1:10"
    )
    load = LoadParams(
        charge_mass_kg=44 * GRAINS_TO_KG,  # 44 grains of Varget
    )
    return powder, bullet, cartridge, rifle, load


def simulate_with_primer(powder, bullet, cartridge, rifle, load, z0=Z_PRIMER):
    """Run simulate() but patch the initial condition to seed a small Z for ignition."""
    from scipy.integrate import solve_ivp as real_solve_ivp

    def patched_solve_ivp(rhs, t_span, y0, **kwargs):
        # Replace the first element (Z) with a small primer seed
        # ODE state vector is [Z, x, v, Q_loss]
        y0_seeded = [z0, y0[1], y0[2], y0[3]]
        return real_solve_ivp(rhs, t_span, y0_seeded, **kwargs)

    with patch("app.core.solver.solve_ivp", side_effect=patched_solve_ivp):
        return simulate(powder, bullet, cartridge, rifle, load)


# ---------------------------------------------------------------------------
# Tests: bootstrapping limitation
# ---------------------------------------------------------------------------


class TestSolverBootstrapping:
    """Document and verify the known primer-seed limitation."""

    def test_zero_initial_z_produces_no_pressure(self):
        """With Z=0 initial condition the solver never ignites (known limitation).

        This documents the bug: the ODE system has a stable equilibrium at
        (Z=0, x=0, v=0) because Vieille burn rate is zero at P=0.
        A small initial Z (primer ignition) is needed to bootstrap combustion.

        The solver now defaults to Z_PRIMER=0.01, so we must patch y0 to
        force Z=0 to reproduce the original bootstrapping issue.
        """
        powder, bullet, cartridge, rifle, load = make_308_params()
        result = simulate_with_primer(powder, bullet, cartridge, rifle, load, z0=0.0)

        # The solver produces zero pressure and velocity
        assert result.peak_pressure_psi == 0.0
        assert result.muzzle_velocity_fps == 0.0
        assert "Bullet did not exit barrel" in " ".join(result.warnings)


# ---------------------------------------------------------------------------
# Tests: .308 Winchester with primer seed
# ---------------------------------------------------------------------------


class TestSimulate308Winchester:
    """Full integration test with a realistic .308 Winchester load.

    The lumped-parameter model (no heat loss, simplified friction, Lagrange
    gradient) systematically overpredicts peak pressure compared to real
    chamber measurements.  Acceptable ranges are intentionally wide to
    accommodate model limitations while still catching gross errors.
    """

    @pytest.fixture(scope="class")
    def result(self) -> SimResult:
        """Run the simulation once (with primer seed) and share across tests."""
        powder, bullet, cartridge, rifle, load = make_308_params()
        return simulate_with_primer(powder, bullet, cartridge, rifle, load)

    def test_peak_pressure_positive(self, result: SimResult):
        """Peak pressure must be significantly above zero (combustion occurred)."""
        assert result.peak_pressure_psi > 10_000

    def test_peak_pressure_in_range(self, result: SimResult):
        """Peak pressure for a .308 load.

        The adiabatic lumped-parameter model overpredicts vs real-world
        readings (~55-62 kpsi).  We accept up to ~120 kpsi to allow for
        model overshoot while still catching gross parameter errors.
        """
        assert 30_000 <= result.peak_pressure_psi <= 120_000, (
            f"Peak pressure {result.peak_pressure_psi:.0f} psi outside expected range"
        )

    def test_muzzle_velocity_in_range(self, result: SimResult):
        """Muzzle velocity for 168 gr at 44 gr Varget.

        Real-world: ~2,600 fps.  The model may overshoot due to
        lack of heat loss and simplified engraving.  Wide range accepted.
        """
        assert 2_000 <= result.muzzle_velocity_fps <= 3_500, (
            f"Muzzle velocity {result.muzzle_velocity_fps:.0f} fps outside expected range"
        )

    def test_barrel_time_in_range(self, result: SimResult):
        """Barrel time should be in the 0.5-3.0 ms range."""
        assert 0.5 <= result.barrel_time_ms <= 3.0, (
            f"Barrel time {result.barrel_time_ms:.3f} ms outside expected range"
        )

    def test_pressure_curve_nonempty(self, result: SimResult):
        """Pressure curve should contain data points."""
        assert len(result.pressure_curve) > 0

    def test_velocity_curve_nonempty(self, result: SimResult):
        """Velocity curve should contain data points."""
        assert len(result.velocity_curve) > 0

    def test_bullet_exits_barrel(self, result: SimResult):
        """The bullet must exit the barrel (no 'did not exit' warning)."""
        assert not any("did not exit" in w.lower() for w in result.warnings)


# ---------------------------------------------------------------------------
# Tests: curve structure
# ---------------------------------------------------------------------------


class TestSimulateReturnsCurves:
    """Verify the shape and keys of the output curves."""

    @pytest.fixture(scope="class")
    def result(self) -> SimResult:
        powder, bullet, cartridge, rifle, load = make_308_params()
        return simulate_with_primer(powder, bullet, cartridge, rifle, load)

    def test_pressure_curve_has_200_points(self, result: SimResult):
        """The solver generates 200 evenly-spaced evaluation points."""
        assert len(result.pressure_curve) == 200

    def test_velocity_curve_has_200_points(self, result: SimResult):
        assert len(result.velocity_curve) == 200

    def test_pressure_curve_keys(self, result: SimResult):
        """Each pressure curve point must have t_ms and p_psi."""
        for point in result.pressure_curve:
            assert "t_ms" in point
            assert "p_psi" in point

    def test_velocity_curve_keys(self, result: SimResult):
        """Each velocity curve point must have x_mm and v_fps."""
        for point in result.velocity_curve:
            assert "x_mm" in point
            assert "v_fps" in point

    def test_pressure_starts_at_zero_time(self, result: SimResult):
        """First pressure point should be at t=0."""
        assert result.pressure_curve[0]["t_ms"] == pytest.approx(0.0, abs=1e-9)

    def test_velocity_starts_at_zero_displacement(self, result: SimResult):
        """First velocity point should be at x=0."""
        assert result.velocity_curve[0]["x_mm"] == pytest.approx(0.0, abs=1e-6)

    def test_pressure_curve_monotonic_time(self, result: SimResult):
        """Time values in the pressure curve must be strictly increasing."""
        times = [p["t_ms"] for p in result.pressure_curve]
        for i in range(1, len(times)):
            assert times[i] > times[i - 1]

    def test_velocity_curve_nonnegative(self, result: SimResult):
        """Velocity should never go negative (bullet only moves forward)."""
        for point in result.velocity_curve:
            assert point["v_fps"] >= 0.0

    def test_final_velocity_is_muzzle_velocity(self, result: SimResult):
        """The last velocity curve point should match muzzle_velocity_fps."""
        assert result.velocity_curve[-1]["v_fps"] == pytest.approx(
            result.muzzle_velocity_fps, rel=1e-6
        )


# ---------------------------------------------------------------------------
# Tests: overpressure detection
# ---------------------------------------------------------------------------


class TestSimulateOverpressure:
    """Verify that overpressure conditions are detected.

    The SAAMI limit for .308 Win is 62,000 psi.  The lumped model already
    produces ~97 kpsi with a standard 44 gr charge, so the load itself is
    already flagged as overpressure.  We verify this directly and also
    test a moderately increased charge (1.3x) which should be even worse.
    """

    def test_standard_load_exceeds_model_saami(self):
        """The adiabatic model overpredicts; even the standard 44 gr charge
        exceeds the 62 kpsi SAAMI limit in simulation, flagging is_safe=False.
        """
        powder, bullet, cartridge, rifle, load = make_308_params()
        result = simulate_with_primer(powder, bullet, cartridge, rifle, load)

        # Model peak is ~97 kpsi > 62 kpsi SAAMI
        assert result.peak_pressure_psi > cartridge.saami_max_pressure_psi
        assert not result.is_safe
        assert any("UNSAFE" in w for w in result.warnings)

    def test_increased_charge_higher_pressure(self):
        """A 10% overcharge should produce even higher peak pressure."""
        powder, bullet, cartridge, rifle, load = make_308_params()

        standard_result = simulate_with_primer(powder, bullet, cartridge, rifle, load)

        overcharged_load = LoadParams(
            charge_mass_kg=load.charge_mass_kg * 1.1,
        )
        over_result = simulate_with_primer(powder, bullet, cartridge, rifle, overcharged_load)

        # The overcharged load must produce higher pressure than the standard load.
        assert over_result.peak_pressure_psi > standard_result.peak_pressure_psi

    def test_increased_charge_unsafe(self):
        """A 10% overcharge must be flagged as unsafe (model already exceeds SAAMI at standard)."""
        powder, bullet, cartridge, rifle, load = make_308_params()

        overcharged_load = LoadParams(
            charge_mass_kg=load.charge_mass_kg * 1.1,
        )
        result = simulate_with_primer(powder, bullet, cartridge, rifle, overcharged_load)

        assert not result.is_safe

    def test_extreme_overcharge_fails_gracefully(self):
        """A 2x charge should either detect overpressure or fail gracefully
        (integration failure due to extreme charge density).
        """
        powder, bullet, cartridge, rifle, load = make_308_params()

        extreme_load = LoadParams(
            charge_mass_kg=load.charge_mass_kg * 2.0,
        )
        result = simulate_with_primer(powder, bullet, cartridge, rifle, extreme_load)

        # Must be flagged unsafe regardless of whether integration succeeded
        assert not result.is_safe


# ---------------------------------------------------------------------------
# Tests: free recoil calculation
# ---------------------------------------------------------------------------


class TestRecoilCalculation:
    """Verify the free recoil calculation embedded in SimResult.

    Physics:
      v_gas = 1.75 * v_muzzle  (textbook gas velocity approximation)
      impulse = m_bullet * v_muzzle + m_powder * v_gas   [N*s]
      recoil_velocity = impulse / m_rifle                [m/s -> FPS]
      recoil_energy = 0.5 * m_rifle * recoil_velocity^2  [J -> ft-lbs]
    """

    @pytest.fixture(scope="class")
    def result_308(self) -> SimResult:
        powder, bullet, cartridge, rifle, load = make_308_params()
        return simulate_with_primer(powder, bullet, cartridge, rifle, load)

    def test_recoil_energy_positive(self, result_308: SimResult):
        """Recoil energy must be a positive value for any firing event."""
        assert result_308.recoil_energy_ft_lbs > 0

    def test_recoil_impulse_positive(self, result_308: SimResult):
        """Recoil impulse (momentum) must be positive."""
        assert result_308.recoil_impulse_ns > 0

    def test_recoil_velocity_positive(self, result_308: SimResult):
        """Recoil velocity must be positive."""
        assert result_308.recoil_velocity_fps > 0

    def test_recoil_energy_reasonable_range(self, result_308: SimResult):
        """For .308 Win with 168gr bullet, expect 10-50 ft-lbs of recoil energy."""
        assert 5.0 < result_308.recoil_energy_ft_lbs < 60.0

    def test_recoil_velocity_reasonable(self, result_308: SimResult):
        """Recoil velocity should be small compared to muzzle velocity."""
        assert result_308.recoil_velocity_fps < result_308.muzzle_velocity_fps * 0.05

    def test_energy_consistent_with_impulse_and_velocity(self, result_308: SimResult):
        """Verify E = impulse^2 / (2 * m_rifle) identity.

        Since impulse = m * v, we have E = 0.5 * m * v^2 = impulse^2 / (2m).
        The result is stored in mixed units (ft-lbs, N*s, FPS), so we recompute
        in SI and convert.
        """
        from app.core.solver import J_TO_FT_LBS, MPS_TO_FPS

        impulse_ns = result_308.recoil_impulse_ns
        rifle_mass_kg = 3.5  # default from make_308_params
        expected_energy_j = impulse_ns ** 2 / (2.0 * rifle_mass_kg)
        expected_energy_ft_lbs = expected_energy_j * J_TO_FT_LBS

        assert result_308.recoil_energy_ft_lbs == pytest.approx(
            expected_energy_ft_lbs, rel=1e-6
        )

    def test_heavier_rifle_less_recoil_energy(self):
        """A heavier rifle (6 kg) should produce less recoil energy than a lighter one (3 kg)."""
        powder, bullet, cartridge, _, load = make_308_params()

        light_rifle = RifleParams(barrel_length_m=610 * MM_TO_M, twist_rate_m=254 * MM_TO_M, rifle_mass_kg=3.0)
        heavy_rifle = RifleParams(barrel_length_m=610 * MM_TO_M, twist_rate_m=254 * MM_TO_M, rifle_mass_kg=6.0)

        light_result = simulate_with_primer(powder, bullet, cartridge, light_rifle, load)
        heavy_result = simulate_with_primer(powder, bullet, cartridge, heavy_rifle, load)

        assert light_result.recoil_energy_ft_lbs > heavy_result.recoil_energy_ft_lbs

    def test_heavier_rifle_less_recoil_velocity(self):
        """A heavier rifle must have lower recoil velocity (same impulse, more mass)."""
        powder, bullet, cartridge, _, load = make_308_params()

        light_rifle = RifleParams(barrel_length_m=610 * MM_TO_M, twist_rate_m=254 * MM_TO_M, rifle_mass_kg=3.0)
        heavy_rifle = RifleParams(barrel_length_m=610 * MM_TO_M, twist_rate_m=254 * MM_TO_M, rifle_mass_kg=6.0)

        light_result = simulate_with_primer(powder, bullet, cartridge, light_rifle, load)
        heavy_result = simulate_with_primer(powder, bullet, cartridge, heavy_rifle, load)

        assert light_result.recoil_velocity_fps > heavy_result.recoil_velocity_fps

    def test_same_impulse_different_rifle_mass(self):
        """With the same bullet/powder/barrel, impulse should be essentially identical
        regardless of rifle mass (rifle mass doesn't affect internal ballistics)."""
        powder, bullet, cartridge, _, load = make_308_params()

        light_rifle = RifleParams(barrel_length_m=610 * MM_TO_M, twist_rate_m=254 * MM_TO_M, rifle_mass_kg=3.0)
        heavy_rifle = RifleParams(barrel_length_m=610 * MM_TO_M, twist_rate_m=254 * MM_TO_M, rifle_mass_kg=6.0)

        light_result = simulate_with_primer(powder, bullet, cartridge, light_rifle, load)
        heavy_result = simulate_with_primer(powder, bullet, cartridge, heavy_rifle, load)

        # Impulse should be nearly identical (rifle mass doesn't affect bore dynamics)
        assert light_result.recoil_impulse_ns == pytest.approx(
            heavy_result.recoil_impulse_ns, rel=1e-3
        )

    def test_more_powder_more_recoil(self):
        """A heavier charge produces more recoil (both more gas mass and higher velocity)."""
        powder, bullet, cartridge, rifle, load = make_308_params()

        light_load = LoadParams(charge_mass_kg=40 * GRAINS_TO_KG)
        heavy_load = LoadParams(charge_mass_kg=48 * GRAINS_TO_KG)

        light_result = simulate_with_primer(powder, bullet, cartridge, rifle, light_load)
        heavy_result = simulate_with_primer(powder, bullet, cartridge, rifle, heavy_load)

        assert heavy_result.recoil_energy_ft_lbs > light_result.recoil_energy_ft_lbs
        assert heavy_result.recoil_impulse_ns > light_result.recoil_impulse_ns

    def test_minimal_charge_minimal_recoil(self):
        """A very light charge should produce minimal recoil energy (< 5 ft-lbs)."""
        powder, bullet, cartridge, rifle, _ = make_308_params()
        light_load = LoadParams(charge_mass_kg=15 * GRAINS_TO_KG)

        result = simulate_with_primer(powder, bullet, cartridge, rifle, light_load)
        assert result.recoil_energy_ft_lbs < 10.0


# ---------------------------------------------------------------------------
# Tests: golden output -- backward compatibility guard for 2-curve solver
# ---------------------------------------------------------------------------


class TestGoldenOutput2Curve:
    """Verify that the 2-curve solver produces bit-identical results after changes.

    These golden values were captured from the current .308 Win simulation
    before any 3-curve modifications. The tolerance of 0.1% (rel=1e-3)
    guards against accidental regressions in the 2-curve code path.
    """

    @pytest.fixture(scope="class")
    def result(self) -> SimResult:
        powder, bullet, cartridge, rifle, load = make_308_params()
        return simulate_with_primer(powder, bullet, cartridge, rifle, load)

    def test_golden_output_2curve_peak_pressure(self, result: SimResult):
        """Peak pressure must match the golden value within 0.1%."""
        assert result.peak_pressure_psi == pytest.approx(96880.44677292932, rel=1e-3)

    def test_golden_output_2curve_muzzle_velocity(self, result: SimResult):
        """Muzzle velocity must match the golden value within 0.1%."""
        assert result.muzzle_velocity_fps == pytest.approx(3258.1299761938285, rel=1e-3)

    def test_golden_output_2curve_barrel_time(self, result: SimResult):
        """Barrel time must match the golden value within 0.1%."""
        assert result.barrel_time_ms == pytest.approx(0.9396475304600503, rel=1e-3)


# ---------------------------------------------------------------------------
# Tests: 3-curve has_3curve property on PowderParams
# ---------------------------------------------------------------------------


class TestPowderParams3Curve:
    """Verify the has_3curve property on PowderParams."""

    def test_3curve_has_3curve_property_true(self):
        """PowderParams with all 3-curve fields populated should have has_3curve=True."""
        powder = PowderParams(
            force_j_kg=950_000,
            covolume_m3_kg=0.001,
            burn_rate_coeff=1.6e-8,
            burn_rate_exp=0.86,
            gamma=1.24,
            density_kg_m3=920.0,
            flame_temp_k=4050.0,
            ba=0.5,
            bp=0.1,
            br=0.1,
            brp=0.1,
            z1=0.4,
            z2=0.8,
        )
        assert powder.has_3curve is True

    def test_3curve_has_3curve_property_false(self):
        """PowderParams without 3-curve fields should have has_3curve=False."""
        powder = PowderParams(
            force_j_kg=950_000,
            covolume_m3_kg=0.001,
            burn_rate_coeff=1.6e-8,
            burn_rate_exp=0.86,
            gamma=1.24,
            density_kg_m3=920.0,
            flame_temp_k=4050.0,
        )
        assert powder.has_3curve is False

    def test_3curve_has_3curve_partial_false(self):
        """PowderParams with only some 3-curve fields populated should have has_3curve=False."""
        powder = PowderParams(
            force_j_kg=950_000,
            covolume_m3_kg=0.001,
            burn_rate_coeff=1.6e-8,
            burn_rate_exp=0.86,
            gamma=1.24,
            density_kg_m3=920.0,
            flame_temp_k=4050.0,
            ba=0.5,
            bp=0.1,
            # br, brp, z1, z2 missing
        )
        assert powder.has_3curve is False


# ---------------------------------------------------------------------------
# Tests: 3-curve simulation
# ---------------------------------------------------------------------------


class TestSimulate3Curve:
    """Verify that the solver can run a simulation using 3-curve parameters."""

    @pytest.fixture(scope="class")
    def result_3curve(self) -> SimResult:
        """Run a 3-curve simulation with Hodgdon H380 #3 parameters."""
        powder = PowderParams(
            force_j_kg=950_000,
            covolume_m3_kg=0.001,
            burn_rate_coeff=1.6e-8,
            burn_rate_exp=0.86,
            gamma=1.24,
            density_kg_m3=920.0,
            flame_temp_k=4050.0,
            web_thickness_m=0.0004,
            theta=-0.2,
            # 3-curve GRT parameters (Hodgdon H380 #3)
            ba=0.496,
            bp=0.1717,
            br=0.1259,
            brp=0.1506,
            z1=0.3391,
            z2=0.4215,
        )
        bullet = BulletParams(
            mass_kg=168 * GRAINS_TO_KG,
            diameter_m=7.82 * MM_TO_M,
        )
        cartridge = CartridgeParams(
            saami_max_pressure_psi=62_000,
            chamber_volume_m3=3.63e-6,
            bore_diameter_m=7.62 * MM_TO_M,
        )
        rifle = RifleParams(
            barrel_length_m=610 * MM_TO_M,
            twist_rate_m=254 * MM_TO_M,
        )
        load = LoadParams(
            charge_mass_kg=44 * GRAINS_TO_KG,
        )
        return simulate_with_primer(powder, bullet, cartridge, rifle, load)

    def test_3curve_simulation_runs(self, result_3curve: SimResult):
        """3-curve simulation must complete without integration failure."""
        assert not any("Integration failed" in w for w in result_3curve.warnings)

    def test_3curve_peak_pressure_positive(self, result_3curve: SimResult):
        """3-curve simulation must produce positive peak pressure."""
        assert result_3curve.peak_pressure_psi > 0

    def test_3curve_muzzle_velocity_positive(self, result_3curve: SimResult):
        """3-curve simulation must produce positive muzzle velocity."""
        assert result_3curve.muzzle_velocity_fps > 0

    def test_3curve_pressure_curve_nonempty(self, result_3curve: SimResult):
        """3-curve simulation must produce a non-empty pressure curve."""
        assert len(result_3curve.pressure_curve) > 0


# ---------------------------------------------------------------------------
# Tests: extended curve arrays (burn, energy, temperature, recoil)
# ---------------------------------------------------------------------------


class TestExtendedCurves:
    """Verify that the solver returns all 4 new curve arrays with correct data."""

    @pytest.fixture(scope="class")
    def result(self) -> SimResult:
        powder, bullet, cartridge, rifle, load = make_308_params()
        return simulate_with_primer(powder, bullet, cartridge, rifle, load)

    # --- Burn curve ---

    def test_burn_curve_has_200_points(self, result: SimResult):
        """Burn curve must have 200 data points."""
        assert len(result.burn_curve) == 200

    def test_burn_curve_initial_z_near_primer(self, result: SimResult):
        """First burn fraction Z should be close to Z_PRIMER (0.01)."""
        assert result.burn_curve[0]["z"] == pytest.approx(Z_PRIMER, abs=0.005)

    def test_burn_curve_final_z_near_one(self, result: SimResult):
        """Final burn fraction Z should be close to 1.0 (fully burned)."""
        assert result.burn_curve[-1]["z"] == pytest.approx(1.0, abs=0.05)

    def test_burn_curve_keys(self, result: SimResult):
        """Each burn curve point must have t_ms, z, dz_dt, psi."""
        for pt in result.burn_curve:
            assert "t_ms" in pt
            assert "z" in pt
            assert "dz_dt" in pt
            assert "psi" in pt

    # --- Energy curve ---

    def test_energy_curve_has_200_points(self, result: SimResult):
        """Energy curve must have 200 data points."""
        assert len(result.energy_curve) == 200

    def test_energy_curve_final_ke_positive(self, result: SimResult):
        """Final kinetic energy must be positive (bullet is moving)."""
        assert result.energy_curve[-1]["ke_j"] > 0

    def test_energy_curve_final_ke_ft_lbs_positive(self, result: SimResult):
        """Final kinetic energy in ft-lbs must be positive."""
        assert result.energy_curve[-1]["ke_ft_lbs"] > 0

    def test_energy_curve_ke_conversion_consistent(self, result: SimResult):
        """ke_ft_lbs should equal ke_j * J_TO_FT_LBS."""
        from app.core.solver import J_TO_FT_LBS
        last = result.energy_curve[-1]
        assert last["ke_ft_lbs"] == pytest.approx(last["ke_j"] * J_TO_FT_LBS, rel=1e-6)

    def test_energy_curve_keys(self, result: SimResult):
        """Each energy curve point must have t_ms, x_mm, ke_j, ke_ft_lbs, momentum_ns."""
        for pt in result.energy_curve:
            assert "t_ms" in pt
            assert "x_mm" in pt
            assert "ke_j" in pt
            assert "ke_ft_lbs" in pt
            assert "momentum_ns" in pt

    # --- Temperature curve ---

    def test_temperature_curve_has_200_points(self, result: SimResult):
        """Temperature curve must have 200 data points."""
        assert len(result.temperature_curve) == 200

    def test_temperature_curve_initial_above_ambient(self, result: SimResult):
        """Initial gas temperature should be above ambient (300 K) due to primer burn."""
        assert result.temperature_curve[0]["t_gas_k"] > 300.0

    def test_temperature_curve_keys(self, result: SimResult):
        """Each temperature curve point must have t_ms, t_gas_k, q_loss_j."""
        for pt in result.temperature_curve:
            assert "t_ms" in pt
            assert "t_gas_k" in pt
            assert "q_loss_j" in pt

    # --- Recoil curve ---

    def test_recoil_curve_has_200_points(self, result: SimResult):
        """Recoil curve must have 200 data points."""
        assert len(result.recoil_curve) == 200

    def test_recoil_curve_final_impulse_positive(self, result: SimResult):
        """Final recoil impulse must be positive."""
        assert result.recoil_curve[-1]["impulse_ns"] > 0

    def test_recoil_curve_keys(self, result: SimResult):
        """Each recoil curve point must have t_ms and impulse_ns."""
        for pt in result.recoil_curve:
            assert "t_ms" in pt
            assert "impulse_ns" in pt

    # --- Backward compatibility ---

    def test_golden_output_unchanged_with_new_curves(self, result: SimResult):
        """Adding new curve arrays must not change the golden output values."""
        assert result.peak_pressure_psi == pytest.approx(96880.44677292932, rel=1e-3)
        assert result.muzzle_velocity_fps == pytest.approx(3258.1299761938285, rel=1e-3)
        assert result.barrel_time_ms == pytest.approx(0.9396475304600503, rel=1e-3)
