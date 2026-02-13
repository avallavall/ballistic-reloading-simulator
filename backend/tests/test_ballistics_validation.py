"""Ballistics validation tests: verify simulation outputs against known real-world load data.

Tests multiple cartridge/bullet/powder combinations against published reloading data
(Lyman, Hornady, Sierra manuals and chrono data from competition shooters).

The lumped-parameter model with Thornhill heat loss is expected to show systematic
deviations from real-world data:
- Pressure overprediction: ~30-80% above real-world (adiabatic core + simplified geometry)
- Velocity: may be within 10-20% or overpredict due to excess pressure driving bullet faster
- Barrel time: should be in physically reasonable range (0.5-3.0 ms)

Each test documents:
- Real-world reference values (from reloading manuals / published chrono data)
- Simulated values with acceptance tolerances
- Analysis of discrepancy and root cause
"""

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
# Unit conversions used in parameter setup
# ---------------------------------------------------------------------------
GR_H2O_TO_M3 = GRAINS_TO_KG / 1000.0  # grains H2O -> m3 (1 gr H2O = 1 gr water volume)

# IMPORTANT: The solver's free_volume calculation uses density to compute solid
# propellant volume (omega/rho_p). This requires SOLID grain density (~1600 kg/m3),
# NOT bulk/loading density (820-960 kg/m3 which includes air gaps between grains).
# See docs/physics_core.md: rho_p = 1550-1650 kg/m3 for all NC-based propellants.
SOLID_DENSITY_SB = 1600.0   # Single-base (NC) solid grain density, kg/m3
SOLID_DENSITY_DB = 1600.0   # Double-base (NC+NG) solid grain density, kg/m3


# ---------------------------------------------------------------------------
# Parameter builders for each cartridge/load combination
# ---------------------------------------------------------------------------

def make_308_win_168smk_varget():
    """
    .308 Winchester + 168gr Sierra MatchKing HPBT + 42gr Hodgdon Varget

    Real-world reference (Lyman 51st, Hornady 11th):
      - Velocity: ~2600 fps (24" barrel)
      - Pressure: ~52,000-55,000 PSI
      - Barrel time: ~1.2-1.5 ms

    Competition standard load, extremely well-documented.
    """
    powder = PowderParams(
        force_j_kg=950_000,        # Single-base, typical
        covolume_m3_kg=0.001,
        burn_rate_coeff=1.6e-8,    # Varget
        burn_rate_exp=0.86,
        gamma=1.24,
        density_kg_m3=SOLID_DENSITY_SB,  # Solid grain density, NOT bulk
        flame_temp_k=4050.0,       # Varget is hot-burning
        web_thickness_m=0.0004,    # 0.4 mm extruded grain
        theta=-0.2,                # slightly progressive
    )
    bullet = BulletParams(
        mass_kg=168 * GRAINS_TO_KG,
        diameter_m=7.82 * MM_TO_M,  # .308 groove diameter
    )
    cartridge = CartridgeParams(
        saami_max_pressure_psi=62_000,
        chamber_volume_m3=3.60e-6,  # ~3.60 cm3 (case cap 54gr + freebore)
        bore_diameter_m=7.62 * MM_TO_M,
    )
    rifle = RifleParams(
        barrel_length_m=610 * MM_TO_M,  # 24"
        twist_rate_m=305 * MM_TO_M,     # 1:12"
        rifle_mass_kg=3.7,
    )
    load = LoadParams(
        charge_mass_kg=42 * GRAINS_TO_KG,  # 42 grains (moderate load)
    )
    return powder, bullet, cartridge, rifle, load


def make_223_rem_77smk_varget():
    """
    .223 Remington + 77gr Sierra MatchKing HPBT + 24gr Hodgdon Varget

    Real-world reference (Sierra manual, AR15.com chrono data):
      - Velocity: ~2650-2750 fps (20" barrel)
      - Pressure: ~50,000-55,000 PSI
      - Barrel time: ~0.8-1.2 ms

    Popular long-range .223 load (Service Rifle / High Power competition).
    """
    powder = PowderParams(
        force_j_kg=950_000,
        covolume_m3_kg=0.001,
        burn_rate_coeff=1.6e-8,    # Varget
        burn_rate_exp=0.86,
        gamma=1.24,
        density_kg_m3=SOLID_DENSITY_SB,  # Solid grain density
        flame_temp_k=4050.0,
        web_thickness_m=0.0004,    # 0.4 mm standard extruded grain
        theta=-0.2,
    )
    bullet = BulletParams(
        mass_kg=77 * GRAINS_TO_KG,
        diameter_m=5.70 * MM_TO_M,  # .224 groove diameter
    )
    cartridge = CartridgeParams(
        saami_max_pressure_psi=55_000,
        chamber_volume_m3=1.95e-6,  # ~1.95 cm3 (case cap 28.8gr + freebore)
        bore_diameter_m=5.56 * MM_TO_M,
    )
    rifle = RifleParams(
        barrel_length_m=508 * MM_TO_M,  # 20" (Service Rifle standard)
        twist_rate_m=178 * MM_TO_M,     # 1:7" for heavy bullets
        rifle_mass_kg=3.0,
    )
    load = LoadParams(
        charge_mass_kg=24 * GRAINS_TO_KG,
    )
    return powder, bullet, cartridge, rifle, load


def make_65cm_140eldm_h4350():
    """
    6.5 Creedmoor + 140gr Hornady ELD Match + 41gr Hodgdon H4350

    Real-world reference (Hornady 11th, 6.5 Creedmoor community data):
      - Velocity: ~2650-2750 fps (24" barrel)
      - Pressure: ~56,000-60,000 PSI
      - Barrel time: ~1.1-1.4 ms

    THE standard precision rifle load. Very well-characterized.
    """
    powder = PowderParams(
        force_j_kg=950_000,
        covolume_m3_kg=0.001,
        burn_rate_coeff=1.4e-8,    # H4350 - calibrated for solid density
        burn_rate_exp=0.86,
        gamma=1.24,
        density_kg_m3=SOLID_DENSITY_SB,  # Solid grain density
        flame_temp_k=3760.0,
        web_thickness_m=0.00045,   # Medium-slow powder grain
        theta=-0.2,
    )
    bullet = BulletParams(
        mass_kg=140 * GRAINS_TO_KG,
        diameter_m=6.72 * MM_TO_M,  # .264 groove diameter
    )
    cartridge = CartridgeParams(
        saami_max_pressure_psi=62_000,
        chamber_volume_m3=3.50e-6,  # ~3.50 cm3 (case cap 52.5gr + freebore)
        bore_diameter_m=6.50 * MM_TO_M,
    )
    rifle = RifleParams(
        barrel_length_m=610 * MM_TO_M,  # 24"
        twist_rate_m=203 * MM_TO_M,     # 1:8"
        rifle_mass_kg=4.5,
    )
    load = LoadParams(
        charge_mass_kg=41 * GRAINS_TO_KG,
    )
    return powder, bullet, cartridge, rifle, load


def make_338lm_285eldm_retumbo():
    """
    .338 Lapua Magnum + 285gr Hornady ELD Match + 89gr Hodgdon Retumbo

    Real-world reference (Hornady 11th, Lapua reloading guide):
      - Velocity: ~2650-2750 fps (27" barrel)
      - Pressure: ~56,000-60,000 PSI
      - Barrel time: ~1.3-1.7 ms

    Long-range magnum load. Large case volume, slow powder.
    """
    powder = PowderParams(
        force_j_kg=950_000,
        covolume_m3_kg=0.001,
        burn_rate_coeff=8.0e-9,    # Retumbo - calibrated for solid density
        burn_rate_exp=0.88,
        gamma=1.24,
        density_kg_m3=SOLID_DENSITY_SB,  # Solid grain density
        flame_temp_k=3710.0,
        web_thickness_m=0.0005,    # Slow powder, medium-large grain
        theta=-0.2,
    )
    bullet = BulletParams(
        mass_kg=285 * GRAINS_TO_KG,
        diameter_m=8.61 * MM_TO_M,  # .338 groove diameter
    )
    cartridge = CartridgeParams(
        saami_max_pressure_psi=65_000,
        chamber_volume_m3=6.50e-6,  # ~6.50 cm3 (case cap 91.5gr + long freebore)
        bore_diameter_m=8.38 * MM_TO_M,
    )
    rifle = RifleParams(
        barrel_length_m=686 * MM_TO_M,  # 27"
        twist_rate_m=254 * MM_TO_M,     # 1:10"
        rifle_mass_kg=5.4,
    )
    load = LoadParams(
        charge_mass_kg=89 * GRAINS_TO_KG,
    )
    return powder, bullet, cartridge, rifle, load


def make_308_win_175smk_varget():
    """
    .308 Winchester + 175gr Sierra MatchKing HPBT + 41.5gr Hodgdon Varget

    Real-world reference (Federal Gold Medal Match M118LR specs, Sierra manual):
      - Velocity: ~2550-2600 fps (24" barrel)
      - Pressure: ~55,000-60,000 PSI
      - Barrel time: ~1.2-1.5 ms

    M118LR equivalent; the standard military long-range load.
    """
    powder = PowderParams(
        force_j_kg=950_000,
        covolume_m3_kg=0.001,
        burn_rate_coeff=1.6e-8,
        burn_rate_exp=0.86,
        gamma=1.24,
        density_kg_m3=SOLID_DENSITY_SB,  # Solid grain density
        flame_temp_k=4050.0,
        web_thickness_m=0.0004,
        theta=-0.2,
    )
    bullet = BulletParams(
        mass_kg=175 * GRAINS_TO_KG,
        diameter_m=7.82 * MM_TO_M,
    )
    cartridge = CartridgeParams(
        saami_max_pressure_psi=62_000,
        chamber_volume_m3=3.60e-6,  # ~3.60 cm3
        bore_diameter_m=7.62 * MM_TO_M,
    )
    rifle = RifleParams(
        barrel_length_m=610 * MM_TO_M,
        twist_rate_m=254 * MM_TO_M,  # 1:10"
        rifle_mass_kg=3.7,
    )
    load = LoadParams(
        charge_mass_kg=41.5 * GRAINS_TO_KG,
    )
    return powder, bullet, cartridge, rifle, load


# ---------------------------------------------------------------------------
# Reference data structure
# ---------------------------------------------------------------------------

class ReferenceData:
    """Known real-world values for a given load."""
    def __init__(
        self,
        name: str,
        expected_velocity_fps: float,
        expected_pressure_psi: float,
        barrel_time_min_ms: float = 0.5,
        barrel_time_max_ms: float = 3.0,
        source: str = "",
    ):
        self.name = name
        self.expected_velocity_fps = expected_velocity_fps
        self.expected_pressure_psi = expected_pressure_psi
        self.barrel_time_min_ms = barrel_time_min_ms
        self.barrel_time_max_ms = barrel_time_max_ms
        self.source = source


# ---------------------------------------------------------------------------
# Test class: .308 Win / 168 SMK / 42gr Varget
# ---------------------------------------------------------------------------

class TestValidation308Win168SMK:
    """Validate .308 Win + 168gr SMK + 42gr Varget against published data."""

    REF = ReferenceData(
        name=".308 Win / 168 SMK / 42gr Varget",
        expected_velocity_fps=2600.0,
        expected_pressure_psi=53_000.0,
        barrel_time_min_ms=0.8,
        barrel_time_max_ms=2.0,
        source="Lyman 51st Ed., Hornady 11th Ed., competition chrono data",
    )

    @pytest.fixture(scope="class")
    def result(self) -> SimResult:
        powder, bullet, cartridge, rifle, load = make_308_win_168smk_varget()
        return simulate(powder, bullet, cartridge, rifle, load)

    def test_combustion_occurs(self, result: SimResult):
        """Solver must ignite and produce meaningful output."""
        assert result.peak_pressure_psi > 10_000, "No combustion detected"
        assert result.muzzle_velocity_fps > 500, "Bullet barely moved"

    def test_bullet_exits_barrel(self, result: SimResult):
        """Bullet must exit the barrel within integration time."""
        assert not any("did not exit" in w.lower() for w in result.warnings)

    def test_muzzle_velocity_direction(self, result: SimResult):
        """Simulated velocity should be in the same ballpark as real-world.

        Real-world: ~2600 fps. Model may overpredict due to excess pressure.
        Accept 1800-3600 fps (wide band for lumped-parameter model).
        """
        assert 1800 <= result.muzzle_velocity_fps <= 3600, (
            f"Velocity {result.muzzle_velocity_fps:.0f} fps wildly off from "
            f"expected ~{self.REF.expected_velocity_fps:.0f} fps"
        )

    def test_muzzle_velocity_overprediction_bounded(self, result: SimResult):
        """Document velocity accuracy. Overprediction should not exceed 40%."""
        ratio = result.muzzle_velocity_fps / self.REF.expected_velocity_fps
        assert ratio < 1.40, (
            f"Velocity overprediction {(ratio-1)*100:.1f}% exceeds 40% threshold"
        )

    def test_peak_pressure_physically_reasonable(self, result: SimResult):
        """Pressure must be in a physically meaningful range for this cartridge.

        Real-world: ~53,000 PSI. Model overpredicts: accept 40,000-120,000 PSI.
        """
        assert 40_000 <= result.peak_pressure_psi <= 120_000, (
            f"Pressure {result.peak_pressure_psi:.0f} PSI outside physical bounds"
        )

    def test_pressure_overprediction_documented(self, result: SimResult):
        """Document the pressure overprediction factor for calibration work."""
        ratio = result.peak_pressure_psi / self.REF.expected_pressure_psi
        # We expect overprediction. Document the factor.
        # If ratio < 1.0, the model underpredicts which would be unusual.
        assert ratio > 0.5, f"Extreme underprediction: ratio={ratio:.2f}"
        assert ratio < 3.0, f"Extreme overprediction: ratio={ratio:.2f}"

    def test_barrel_time_in_range(self, result: SimResult):
        """Barrel time must be physically reasonable."""
        assert self.REF.barrel_time_min_ms <= result.barrel_time_ms <= self.REF.barrel_time_max_ms, (
            f"Barrel time {result.barrel_time_ms:.3f} ms outside "
            f"[{self.REF.barrel_time_min_ms}, {self.REF.barrel_time_max_ms}] ms"
        )

    def test_pressure_curve_shape(self, result: SimResult):
        """Pressure curve should rise to peak then decay (correct IB shape)."""
        pressures = [p["p_psi"] for p in result.pressure_curve]
        peak_idx = pressures.index(max(pressures))
        # Peak should not be at first or last point
        assert peak_idx > 5, "Peak pressure too early (first 2.5% of travel)"
        assert peak_idx < len(pressures) - 5, "Peak pressure at end (still rising at muzzle)"

    def test_velocity_monotonically_increasing(self, result: SimResult):
        """Velocity should monotonically increase (bullet only accelerates)."""
        velocities = [v["v_fps"] for v in result.velocity_curve]
        for i in range(1, len(velocities)):
            assert velocities[i] >= velocities[i-1] - 0.01, (
                f"Velocity decreased at point {i}: {velocities[i]:.1f} < {velocities[i-1]:.1f}"
            )

    def test_structural_outputs_present(self, result: SimResult):
        """Structural calculations should produce meaningful values."""
        assert result.hoop_stress_mpa > 0, "Hoop stress should be positive"
        assert result.case_expansion_mm > 0, "Case expansion should be positive"
        assert result.erosion_per_shot_mm > 0, "Erosion should be positive"
        # Typical per-shot erosion: 0.1-5 um for standard rifle calibers
        assert result.erosion_per_shot_mm < 0.01, (
            f"Erosion {result.erosion_per_shot_mm:.6f} mm/shot unrealistically high"
        )

    def test_recoil_energy_reasonable(self, result: SimResult):
        """Free recoil energy for .308 Win should be 15-25 ft-lbs typically.

        Model may differ due to velocity differences. Accept 10-40 ft-lbs.
        """
        assert 10 <= result.recoil_energy_ft_lbs <= 40, (
            f"Recoil energy {result.recoil_energy_ft_lbs:.1f} ft-lbs outside range"
        )


# ---------------------------------------------------------------------------
# Test class: .223 Rem / 77 SMK / 24gr Varget
# ---------------------------------------------------------------------------

class TestValidation223Rem77SMK:
    """Validate .223 Rem + 77gr SMK + 24gr Varget against published data."""

    REF = ReferenceData(
        name=".223 Rem / 77 SMK / 24gr Varget",
        expected_velocity_fps=2700.0,
        expected_pressure_psi=52_000.0,
        barrel_time_min_ms=0.5,
        barrel_time_max_ms=1.8,
        source="Sierra manual, AR15.com chrono data, Hodgdon load data",
    )

    @pytest.fixture(scope="class")
    def result(self) -> SimResult:
        powder, bullet, cartridge, rifle, load = make_223_rem_77smk_varget()
        return simulate(powder, bullet, cartridge, rifle, load)

    def test_combustion_occurs(self, result: SimResult):
        assert result.peak_pressure_psi > 10_000
        assert result.muzzle_velocity_fps > 500

    def test_bullet_exits_barrel(self, result: SimResult):
        assert not any("did not exit" in w.lower() for w in result.warnings)

    def test_muzzle_velocity_range(self, result: SimResult):
        """Real-world: ~2700 fps. Accept wide band for model limitations."""
        assert 2000 <= result.muzzle_velocity_fps <= 4000, (
            f"Velocity {result.muzzle_velocity_fps:.0f} fps outside bounds"
        )

    def test_muzzle_velocity_overprediction_bounded(self, result: SimResult):
        ratio = result.muzzle_velocity_fps / self.REF.expected_velocity_fps
        assert ratio < 1.40, (
            f"Velocity overprediction {(ratio-1)*100:.1f}% exceeds 40%"
        )

    def test_peak_pressure_range(self, result: SimResult):
        """Real-world: ~52,000 PSI. Accept 35,000-130,000 PSI."""
        assert 35_000 <= result.peak_pressure_psi <= 130_000, (
            f"Pressure {result.peak_pressure_psi:.0f} PSI outside bounds"
        )

    def test_barrel_time_in_range(self, result: SimResult):
        assert self.REF.barrel_time_min_ms <= result.barrel_time_ms <= self.REF.barrel_time_max_ms

    def test_pressure_curve_has_peak(self, result: SimResult):
        pressures = [p["p_psi"] for p in result.pressure_curve]
        peak_idx = pressures.index(max(pressures))
        assert 5 < peak_idx < len(pressures) - 5

    def test_recoil_energy_reasonable(self, result: SimResult):
        """Free recoil for .223 is light: 3-8 ft-lbs typically. Accept 2-15."""
        assert 2 <= result.recoil_energy_ft_lbs <= 15, (
            f"Recoil energy {result.recoil_energy_ft_lbs:.1f} ft-lbs outside range"
        )


# ---------------------------------------------------------------------------
# Test class: 6.5 CM / 140 ELD-M / 41gr H4350
# ---------------------------------------------------------------------------

class TestValidation65CM140ELDM:
    """Validate 6.5 Creedmoor + 140gr ELD-M + 41gr H4350 against published data."""

    REF = ReferenceData(
        name="6.5 CM / 140 ELD-M / 41gr H4350",
        expected_velocity_fps=2700.0,
        expected_pressure_psi=58_000.0,
        barrel_time_min_ms=0.8,
        barrel_time_max_ms=2.0,
        source="Hornady 11th Ed., 6.5CM community chrono data",
    )

    @pytest.fixture(scope="class")
    def result(self) -> SimResult:
        powder, bullet, cartridge, rifle, load = make_65cm_140eldm_h4350()
        return simulate(powder, bullet, cartridge, rifle, load)

    def test_combustion_occurs(self, result: SimResult):
        assert result.peak_pressure_psi > 10_000
        assert result.muzzle_velocity_fps > 500

    def test_bullet_exits_barrel(self, result: SimResult):
        assert not any("did not exit" in w.lower() for w in result.warnings)

    def test_muzzle_velocity_range(self, result: SimResult):
        """Real-world: ~2700 fps. Accept 2000-3800 fps."""
        assert 2000 <= result.muzzle_velocity_fps <= 3800, (
            f"Velocity {result.muzzle_velocity_fps:.0f} fps outside bounds"
        )

    def test_muzzle_velocity_overprediction_bounded(self, result: SimResult):
        ratio = result.muzzle_velocity_fps / self.REF.expected_velocity_fps
        assert ratio < 1.40

    def test_peak_pressure_range(self, result: SimResult):
        """Real-world: ~58,000 PSI. Accept 40,000-130,000 PSI."""
        assert 40_000 <= result.peak_pressure_psi <= 130_000

    def test_barrel_time_in_range(self, result: SimResult):
        assert self.REF.barrel_time_min_ms <= result.barrel_time_ms <= self.REF.barrel_time_max_ms

    def test_recoil_energy_reasonable(self, result: SimResult):
        """6.5 CM recoil: ~10-15 ft-lbs. Accept 5-25 ft-lbs for model."""
        assert 5 <= result.recoil_energy_ft_lbs <= 25


# ---------------------------------------------------------------------------
# Test class: .338 Lapua / 285 ELD-M / 89gr Retumbo
# ---------------------------------------------------------------------------

class TestValidation338LM285ELDM:
    """Validate .338 Lapua Mag + 285gr ELD-M + 89gr Retumbo against published data."""

    REF = ReferenceData(
        name=".338 LM / 285 ELD-M / 89gr Retumbo",
        expected_velocity_fps=2700.0,
        expected_pressure_psi=58_000.0,
        barrel_time_min_ms=0.8,
        barrel_time_max_ms=2.5,
        source="Hornady 11th Ed., Lapua reloading guide",
    )

    @pytest.fixture(scope="class")
    def result(self) -> SimResult:
        powder, bullet, cartridge, rifle, load = make_338lm_285eldm_retumbo()
        return simulate(powder, bullet, cartridge, rifle, load)

    def test_combustion_occurs(self, result: SimResult):
        assert result.peak_pressure_psi > 10_000
        assert result.muzzle_velocity_fps > 500

    def test_bullet_exits_barrel(self, result: SimResult):
        assert not any("did not exit" in w.lower() for w in result.warnings)

    def test_muzzle_velocity_range(self, result: SimResult):
        """Real-world: ~2700 fps. Accept 2000-3800 fps."""
        assert 2000 <= result.muzzle_velocity_fps <= 3800, (
            f"Velocity {result.muzzle_velocity_fps:.0f} fps outside bounds"
        )

    def test_muzzle_velocity_overprediction_bounded(self, result: SimResult):
        ratio = result.muzzle_velocity_fps / self.REF.expected_velocity_fps
        assert ratio < 1.40

    def test_peak_pressure_range(self, result: SimResult):
        """Real-world: ~58,000 PSI. Accept 40,000-140,000 PSI."""
        assert 40_000 <= result.peak_pressure_psi <= 140_000

    def test_barrel_time_in_range(self, result: SimResult):
        assert self.REF.barrel_time_min_ms <= result.barrel_time_ms <= self.REF.barrel_time_max_ms

    def test_recoil_energy_reasonable(self, result: SimResult):
        """.338 LM recoil: ~35-45 ft-lbs. Accept 20-60 ft-lbs for model."""
        assert 20 <= result.recoil_energy_ft_lbs <= 60


# ---------------------------------------------------------------------------
# Test class: .308 Win / 175 SMK / 41.5gr Varget (M118LR equivalent)
# ---------------------------------------------------------------------------

class TestValidation308Win175SMK:
    """Validate .308 Win + 175gr SMK + 41.5gr Varget (M118LR) against published data."""

    REF = ReferenceData(
        name=".308 Win / 175 SMK / 41.5gr Varget",
        expected_velocity_fps=2575.0,
        expected_pressure_psi=57_000.0,
        barrel_time_min_ms=0.8,
        barrel_time_max_ms=2.0,
        source="Federal Gold Medal Match specs, M118LR TDP, Sierra manual",
    )

    @pytest.fixture(scope="class")
    def result(self) -> SimResult:
        powder, bullet, cartridge, rifle, load = make_308_win_175smk_varget()
        return simulate(powder, bullet, cartridge, rifle, load)

    def test_combustion_occurs(self, result: SimResult):
        assert result.peak_pressure_psi > 10_000
        assert result.muzzle_velocity_fps > 500

    def test_bullet_exits_barrel(self, result: SimResult):
        assert not any("did not exit" in w.lower() for w in result.warnings)

    def test_muzzle_velocity_range(self, result: SimResult):
        """Real-world: ~2575 fps. Accept 1800-3500 fps."""
        assert 1800 <= result.muzzle_velocity_fps <= 3500

    def test_muzzle_velocity_overprediction_bounded(self, result: SimResult):
        ratio = result.muzzle_velocity_fps / self.REF.expected_velocity_fps
        assert ratio < 1.40

    def test_peak_pressure_range(self, result: SimResult):
        assert 40_000 <= result.peak_pressure_psi <= 120_000

    def test_barrel_time_in_range(self, result: SimResult):
        assert self.REF.barrel_time_min_ms <= result.barrel_time_ms <= self.REF.barrel_time_max_ms

    def test_heavier_bullet_slower_than_lighter(self, result: SimResult):
        """175gr should be slower than 168gr with similar charge (physics check)."""
        powder, bullet168, cartridge, rifle, load = make_308_win_168smk_varget()
        # Use 41.5gr for both to make direct comparison
        load_415 = LoadParams(charge_mass_kg=41.5 * GRAINS_TO_KG)
        result_168 = simulate(powder, bullet168, cartridge, rifle, load_415)
        # Heavier bullet should be slower with same charge
        assert result.muzzle_velocity_fps < result_168.muzzle_velocity_fps, (
            f"175gr ({result.muzzle_velocity_fps:.0f} fps) should be slower than "
            f"168gr ({result_168.muzzle_velocity_fps:.0f} fps)"
        )


# ---------------------------------------------------------------------------
# Cross-caliber physics consistency tests
# ---------------------------------------------------------------------------

class TestCrossCaliberPhysics:
    """Verify that the solver respects fundamental physics across cartridges."""

    def test_more_powder_more_velocity(self):
        """Increasing charge weight should increase muzzle velocity."""
        powder, bullet, cartridge, rifle, _ = make_308_win_168smk_varget()

        load_low = LoadParams(charge_mass_kg=40 * GRAINS_TO_KG)
        load_high = LoadParams(charge_mass_kg=44 * GRAINS_TO_KG)

        result_low = simulate(powder, bullet, cartridge, rifle, load_low)
        result_high = simulate(powder, bullet, cartridge, rifle, load_high)

        assert result_high.muzzle_velocity_fps > result_low.muzzle_velocity_fps, (
            f"44gr charge ({result_high.muzzle_velocity_fps:.0f} fps) should be faster "
            f"than 40gr ({result_low.muzzle_velocity_fps:.0f} fps)"
        )

    def test_more_powder_more_pressure(self):
        """Increasing charge weight should increase peak pressure."""
        powder, bullet, cartridge, rifle, _ = make_308_win_168smk_varget()

        load_low = LoadParams(charge_mass_kg=40 * GRAINS_TO_KG)
        load_high = LoadParams(charge_mass_kg=44 * GRAINS_TO_KG)

        result_low = simulate(powder, bullet, cartridge, rifle, load_low)
        result_high = simulate(powder, bullet, cartridge, rifle, load_high)

        assert result_high.peak_pressure_psi > result_low.peak_pressure_psi

    def test_longer_barrel_higher_velocity(self):
        """Longer barrel should produce higher muzzle velocity (more dwell time)."""
        powder, bullet, cartridge, _, load = make_308_win_168smk_varget()

        rifle_20in = RifleParams(barrel_length_m=508 * MM_TO_M, twist_rate_m=305 * MM_TO_M)
        rifle_26in = RifleParams(barrel_length_m=660 * MM_TO_M, twist_rate_m=305 * MM_TO_M)

        result_20 = simulate(powder, bullet, cartridge, rifle_20in, load)
        result_26 = simulate(powder, bullet, cartridge, rifle_26in, load)

        assert result_26.muzzle_velocity_fps > result_20.muzzle_velocity_fps, (
            f"26\" barrel ({result_26.muzzle_velocity_fps:.0f} fps) should be faster "
            f"than 20\" ({result_20.muzzle_velocity_fps:.0f} fps)"
        )

    def test_heavier_bullet_higher_pressure(self):
        """Heavier bullet (more resistance) should produce higher peak pressure
        with the same charge weight."""
        powder, _, cartridge, rifle, load = make_308_win_168smk_varget()

        bullet_155 = BulletParams(mass_kg=155 * GRAINS_TO_KG, diameter_m=7.82 * MM_TO_M)
        bullet_190 = BulletParams(mass_kg=190 * GRAINS_TO_KG, diameter_m=7.82 * MM_TO_M)

        result_155 = simulate(powder, bullet_155, cartridge, rifle, load)
        result_190 = simulate(powder, bullet_190, cartridge, rifle, load)

        assert result_190.peak_pressure_psi > result_155.peak_pressure_psi, (
            f"190gr ({result_190.peak_pressure_psi:.0f} PSI) should have higher pressure "
            f"than 155gr ({result_155.peak_pressure_psi:.0f} PSI)"
        )

    def test_faster_powder_higher_peak_pressure(self):
        """Faster-burning powder should produce higher peak pressure in same case."""
        _, bullet, cartridge, rifle, load = make_308_win_168smk_varget()

        # Faster powder: higher burn_rate_coeff
        fast_powder = PowderParams(
            force_j_kg=950_000, covolume_m3_kg=0.001,
            burn_rate_coeff=3.8e-8,  # IMR 4198 (fast)
            burn_rate_exp=0.85, gamma=1.24, density_kg_m3=SOLID_DENSITY_SB,
            flame_temp_k=3860.0, web_thickness_m=0.0004, theta=-0.2,
        )
        # Slower powder: lower burn_rate_coeff
        slow_powder = PowderParams(
            force_j_kg=950_000, covolume_m3_kg=0.001,
            burn_rate_coeff=1.0e-8,  # H4350 (slow)
            burn_rate_exp=0.86, gamma=1.24, density_kg_m3=SOLID_DENSITY_SB,
            flame_temp_k=3760.0, web_thickness_m=0.0005, theta=-0.2,
        )

        result_fast = simulate(fast_powder, bullet, cartridge, rifle, load)
        result_slow = simulate(slow_powder, bullet, cartridge, rifle, load)

        assert result_fast.peak_pressure_psi > result_slow.peak_pressure_psi, (
            f"Fast powder ({result_fast.peak_pressure_psi:.0f} PSI) should have higher "
            f"peak than slow powder ({result_slow.peak_pressure_psi:.0f} PSI)"
        )

    def test_larger_case_lower_pressure(self):
        """Larger case volume should produce lower peak pressure (same charge)."""
        powder, bullet, _, rifle, load = make_308_win_168smk_varget()

        small_case = CartridgeParams(
            saami_max_pressure_psi=62_000,
            chamber_volume_m3=3.20e-6,  # ~3.2 cm3 (compact case)
            bore_diameter_m=7.62 * MM_TO_M,
        )
        large_case = CartridgeParams(
            saami_max_pressure_psi=62_000,
            chamber_volume_m3=4.50e-6,  # ~4.5 cm3 (like .30-06)
            bore_diameter_m=7.62 * MM_TO_M,
        )

        result_small = simulate(powder, bullet, small_case, rifle, load)
        result_large = simulate(powder, bullet, large_case, rifle, load)

        assert result_small.peak_pressure_psi > result_large.peak_pressure_psi, (
            f"Small case ({result_small.peak_pressure_psi:.0f} PSI) should have higher "
            f"pressure than large case ({result_large.peak_pressure_psi:.0f} PSI)"
        )


# ---------------------------------------------------------------------------
# Accuracy summary test (prints report)
# ---------------------------------------------------------------------------

class TestAccuracySummary:
    """Run all loads and print a summary report of accuracy vs. real-world data.

    This test always passes but documents the current accuracy level of the solver
    for use in calibration work.
    """

    LOADS = [
        (".308 Win/168 SMK/42gr Varget", make_308_win_168smk_varget, 2600, 53_000),
        (".223 Rem/77 SMK/24gr Varget", make_223_rem_77smk_varget, 2700, 52_000),
        ("6.5 CM/140 ELD-M/41gr H4350", make_65cm_140eldm_h4350, 2700, 58_000),
        (".338 LM/285 ELD-M/89gr Retumbo", make_338lm_285eldm_retumbo, 2700, 58_000),
        (".308 Win/175 SMK/41.5gr Varget", make_308_win_175smk_varget, 2575, 57_000),
    ]

    def test_print_accuracy_report(self):
        """Print accuracy report for all tested loads (always passes)."""
        lines = [
            "",
            "=" * 80,
            "BALLISTICS VALIDATION ACCURACY REPORT",
            "=" * 80,
            f"{'Load':<40} {'Vel(sim/ref/err%)':<28} {'Pres(sim/ref/err%)':<28}",
            "-" * 80,
        ]

        vel_errors = []
        pres_errors = []

        for name, builder, ref_vel, ref_pres in self.LOADS:
            powder, bullet, cartridge, rifle, load = builder()
            result = simulate(powder, bullet, cartridge, rifle, load)

            vel_err = ((result.muzzle_velocity_fps - ref_vel) / ref_vel) * 100
            pres_err = ((result.peak_pressure_psi - ref_pres) / ref_pres) * 100

            vel_errors.append(vel_err)
            pres_errors.append(pres_err)

            lines.append(
                f"{name:<40} "
                f"{result.muzzle_velocity_fps:>6.0f}/{ref_vel:>5.0f}/{vel_err:>+6.1f}%  "
                f"{result.peak_pressure_psi:>7.0f}/{ref_pres:>6.0f}/{pres_err:>+6.1f}%"
            )

        lines.append("-" * 80)
        lines.append(
            f"{'MEAN ERROR':<40} "
            f"{'':>12}{sum(vel_errors)/len(vel_errors):>+6.1f}%  "
            f"{'':>13}{sum(pres_errors)/len(pres_errors):>+6.1f}%"
        )
        lines.append("=" * 80)
        lines.append("")
        lines.append("NOTES:")
        lines.append("- Positive error = overprediction (sim > real)")
        lines.append("- Pressure overprediction is expected (adiabatic core + lumped params)")
        lines.append("- Thornhill heat loss (h=2000 W/m2K) partially compensates")
        lines.append("- Key calibration levers: h_coeff, burn_rate_coeff, web_thickness")
        lines.append("")

        report = "\n".join(lines)
        print(report)

        # This test always passes -- it's a report
        assert True
