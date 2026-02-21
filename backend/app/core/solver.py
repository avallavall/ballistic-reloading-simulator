"""Main ODE integrator for internal ballistics simulation.

Solves the lumped-parameter system:
  dZ/dt = a1 * P^n / e1
  dx/dt = v
  dv/dt = (P_s * A_b - F_friction) / m_eff

With algebraic relations:
  psi = form_function(Z, theta)
  V_free = V_0 + A_b * x - omega * (1 - psi) / rho_p
  P_avg = f * omega * psi / (V_free - omega * psi * eta)
  P_s = P_avg / (1 + omega / (3 * m))
"""

import logging
from dataclasses import dataclass

import numpy as np
from scipy.integrate import solve_ivp

from app.core.harmonics import cantilever_frequency, ocw_barrel_times
from app.core.heat_transfer import convective_area, wall_heat_flux
from app.core.internal_ballistics import free_volume, lagrange_base_pressure, lagrange_breech_pressure
from app.core.structural import case_expansion, lame_hoop_stress, lawton_erosion
from app.core.thermodynamics import form_function, form_function_3curve, noble_abel_pressure, vieille_burn_rate

logger = logging.getLogger(__name__)

GRAINS_TO_KG = 0.00006479891
PSI_TO_PA = 6894.757
PA_TO_PSI = 1.0 / PSI_TO_PA
MPS_TO_FPS = 3.28084
MM3_TO_M3 = 1e-9
MM_TO_M = 1e-3
CM3_TO_M3 = 1e-6
GCM3_TO_KGM3 = 1000.0

J_TO_FT_LBS = 0.737562  # Joules to foot-pounds conversion
P_START_DEFAULT = 25e6  # 25 MPa default engraving pressure
FRICTION_COEFF = 0.05   # k_f ~ 5% of base pressure as friction
Z_PRIMER = 0.01         # Initial burn fraction representing primer ignition


@dataclass
class PowderParams:
    force_j_kg: float
    covolume_m3_kg: float
    burn_rate_coeff: float
    burn_rate_exp: float
    gamma: float
    density_kg_m3: float  # SOLID grain density (~1600 kg/m3 for NC-based), NOT bulk/loading density
    flame_temp_k: float
    web_thickness_m: float = 0.0004   # 0.4 mm default
    theta: float = -0.2              # slightly progressive

    # 3-curve GRT parameters (optional -- None = use 2-curve Vieille)
    ba: float | None = None
    bp: float | None = None
    br: float | None = None
    brp: float | None = None
    z1: float | None = None
    z2: float | None = None

    @property
    def has_3curve(self) -> bool:
        """Check if all 3-curve parameters are available."""
        return all(v is not None for v in [self.ba, self.bp, self.br, self.brp, self.z1, self.z2])


@dataclass
class BulletParams:
    mass_kg: float
    diameter_m: float


@dataclass
class CartridgeParams:
    saami_max_pressure_psi: float
    chamber_volume_m3: float
    bore_diameter_m: float


@dataclass
class RifleParams:
    barrel_length_m: float
    twist_rate_m: float
    rifle_mass_kg: float = 3.5  # ~7.7 lbs, typical bolt-action rifle


@dataclass
class LoadParams:
    charge_mass_kg: float


# Structural defaults: brass C26000
BRASS_E = 110e9       # Young's modulus (Pa)
BRASS_NU = 0.31       # Poisson's ratio
CASE_WALL_THICKNESS_M = 0.0015  # 1.5 mm typical case wall

# Lawton erosion defaults
EROSIVITY_DEFAULT = 80.0         # m/s^0.5
ACTIVATION_ENERGY_DEFAULT = 500e3  # J/mol (~500 kJ/mol, Lawton Arrhenius model for barrel steel)

# Barrel harmonics defaults: steel 4140
STEEL_E = 200e9           # Young's modulus (Pa)
STEEL_RHO = 7850.0        # density (kg/m^3)
BARREL_OUTER_DIAMETER_M = 0.025  # 25 mm typical barrel OD
OBT_TOLERANCE_MS = 0.05   # tolerance for OBT match (ms)

# Heat transfer defaults (Thornhill model)
H_COEFF_DEFAULT = 2000.0  # Convective heat transfer coefficient (W/m^2/K)
T_WALL_DEFAULT = 300.0    # Ambient barrel wall temperature (K)
# Mean molecular weight of propellant gas (typical nitrocellulose-based)
GAS_MOLECULAR_WEIGHT = 0.026  # ~26 g/mol


@dataclass
class SimResult:
    peak_pressure_psi: float
    muzzle_velocity_fps: float
    pressure_curve: list[dict]
    velocity_curve: list[dict]
    barrel_time_ms: float
    is_safe: bool
    warnings: list[str]
    hoop_stress_mpa: float = 0.0
    case_expansion_mm: float = 0.0
    erosion_per_shot_mm: float = 0.0
    barrel_frequency_hz: float = 0.0
    optimal_barrel_times: list[float] | None = None
    obt_match: bool = False
    recoil_energy_ft_lbs: float = 0.0
    recoil_impulse_ns: float = 0.0
    recoil_velocity_fps: float = 0.0


def _build_ode_system(
    powder: PowderParams,
    bullet: BulletParams,
    cartridge: CartridgeParams,
    load: LoadParams,
    h_coeff: float = H_COEFF_DEFAULT,
):
    """Build the RHS function for the ODE system with Thornhill heat loss."""
    omega = load.charge_mass_kg
    m = bullet.mass_kg
    m_eff = m + omega / 3.0
    bore_area = np.pi * (cartridge.bore_diameter_m / 2.0) ** 2
    bore_d = cartridge.bore_diameter_m
    e1 = powder.web_thickness_m / 2.0
    V0 = cartridge.chamber_volume_m3
    f = powder.force_j_kg
    eta = powder.covolume_m3_kg
    rho_p = powder.density_kg_m3
    a1 = powder.burn_rate_coeff
    n = powder.burn_rate_exp
    theta = powder.theta
    T_flame = powder.flame_temp_k

    # 3-curve dispatch: extract once, use in inner function
    use_3curve = powder.has_3curve
    if use_3curve:
        bp_val = powder.bp
        br_val = powder.br
        brp_val = powder.brp
        z1_val = powder.z1
        z2_val = powder.z2

    def rhs(t, y):
        Z, x, v, Q_loss = y

        Z_c = min(max(Z, 0.0), 1.0)
        if use_3curve:
            psi = form_function_3curve(Z_c, z1_val, z2_val, bp_val, br_val, brp_val)
        else:
            psi = form_function(Z_c, theta)

        V_f = free_volume(V0, bore_area, x, omega, rho_p, psi)

        # Modified Noble-Abel: subtract cumulative heat loss from energy
        total_energy = f * omega * psi
        effective_energy = max(total_energy - Q_loss, 0.0)
        denom = V_f - omega * psi * eta
        if denom <= 0.0:
            denom = 1e-12
        P_avg = effective_energy / denom

        P_s = lagrange_base_pressure(P_avg, omega, m)

        F_fric = FRICTION_COEFF * P_s * bore_area

        if Z_c < 1.0:
            r_b = vieille_burn_rate(P_avg, a1, n)
            dZ_dt = r_b / e1
        else:
            dZ_dt = 0.0

        dx_dt = v

        if P_s > P_START_DEFAULT or v > 0.0:
            dv_dt = max(0.0, (P_s * bore_area - F_fric)) / m_eff
        else:
            dv_dt = 0.0

        # Heat loss: dQ/dt = h * A_wall * (T_gas - T_wall)
        # Estimate T_gas from current pressure and gas state
        gas_mass = omega * psi
        if gas_mass > 0.0 and P_avg > 0.0:
            V_corrected = V_f - gas_mass * eta
            if V_corrected > 0.0:
                T_gas = P_avg * V_corrected * GAS_MOLECULAR_WEIGHT / (gas_mass * 8.314)
            else:
                T_gas = T_flame
        else:
            T_gas = T_flame * psi  # scale with burn fraction before gas exists

        A_wall = convective_area(bore_d, x)
        dQ_dt = wall_heat_flux(T_gas, T_WALL_DEFAULT, h_coeff, A_wall)

        return [dZ_dt, dx_dt, dv_dt, dQ_dt]

    return rhs, bore_area, m_eff


def simulate(
    powder: PowderParams,
    bullet: BulletParams,
    cartridge: CartridgeParams,
    rifle: RifleParams,
    load: LoadParams,
    h_coeff: float = H_COEFF_DEFAULT,
) -> SimResult:
    """Run a complete internal ballistics simulation.

    Integrates the ODE system from ignition until the bullet exits the muzzle.
    Includes Thornhill-type convective heat loss to reduce adiabatic overprediction.
    """
    warnings: list[str] = []

    bore_length = rifle.barrel_length_m - 0.051  # subtract approximate chamber length ~51mm
    if bore_length <= 0:
        bore_length = rifle.barrel_length_m * 0.9

    omega = load.charge_mass_kg
    m = bullet.mass_kg
    bore_area = np.pi * (cartridge.bore_diameter_m / 2.0) ** 2

    charge_density = omega / cartridge.chamber_volume_m3
    if charge_density * powder.covolume_m3_kg > 0.95:
        warnings.append("Charge density too high: gas volume approaches zero")

    rhs, _, m_eff = _build_ode_system(powder, bullet, cartridge, load, h_coeff)

    def bullet_exits(t, y):
        return y[1] - bore_length
    bullet_exits.terminal = True
    bullet_exits.direction = 1

    t_max = 0.010  # 10 ms max integration time
    y0 = [Z_PRIMER, 0.0, 0.0, 0.0]  # [Z, x, v, Q_loss]

    sol = solve_ivp(
        rhs,
        [0.0, t_max],
        y0,
        method="RK45",
        events=bullet_exits,
        max_step=1e-6,
        rtol=1e-8,
        atol=1e-10,
        dense_output=True,
    )

    if sol.status == -1:
        warnings.append(f"Integration failed: {sol.message}")
        return SimResult(
            peak_pressure_psi=0.0,
            muzzle_velocity_fps=0.0,
            pressure_curve=[],
            velocity_curve=[],
            barrel_time_ms=0.0,
            is_safe=False,
            warnings=warnings,
        )

    if sol.t_events[0].size > 0:
        t_exit = float(sol.t_events[0][0])
    else:
        t_exit = float(sol.t[-1])
        warnings.append("Bullet did not exit barrel within integration time")

    n_points = 200
    t_eval = np.linspace(0.0, t_exit, n_points)
    y_eval = sol.sol(t_eval)

    Z_arr = y_eval[0]
    x_arr = y_eval[1]
    v_arr = y_eval[2]
    Q_arr = y_eval[3]

    V0 = cartridge.chamber_volume_m3
    rho_p = powder.density_kg_m3

    pressure_curve = []
    velocity_curve = []
    peak_pressure_pa = 0.0

    for i in range(n_points):
        Z_c = min(max(Z_arr[i], 0.0), 1.0)
        if powder.has_3curve:
            psi = form_function_3curve(Z_c, powder.z1, powder.z2, powder.bp, powder.br, powder.brp)
        else:
            psi = form_function(Z_c, powder.theta)
        V_f = free_volume(V0, bore_area, x_arr[i], omega, rho_p, psi)

        # Heat-loss-corrected pressure (same as ODE uses)
        total_energy = powder.force_j_kg * omega * psi
        effective_energy = max(total_energy - Q_arr[i], 0.0)
        denom = V_f - omega * psi * powder.covolume_m3_kg
        if denom <= 0.0:
            denom = 1e-12
        P_avg = effective_energy / denom

        P_breech = lagrange_breech_pressure(
            lagrange_base_pressure(P_avg, omega, m), omega, m
        )

        if P_breech > peak_pressure_pa:
            peak_pressure_pa = P_breech

        pressure_curve.append({
            "t_ms": float(t_eval[i] * 1000.0),
            "p_psi": float(P_breech * PA_TO_PSI),
        })
        velocity_curve.append({
            "x_mm": float(x_arr[i] / MM_TO_M),
            "v_fps": float(v_arr[i] * MPS_TO_FPS),
        })

    peak_pressure_psi = peak_pressure_pa * PA_TO_PSI
    muzzle_velocity_fps = float(v_arr[-1] * MPS_TO_FPS)
    barrel_time_ms = t_exit * 1000.0

    is_safe = peak_pressure_psi <= cartridge.saami_max_pressure_psi
    if not is_safe:
        warnings.append(
            f"UNSAFE: Peak pressure {peak_pressure_psi:.0f} psi exceeds "
            f"SAAMI max {cartridge.saami_max_pressure_psi:.0f} psi"
        )

    ratio = peak_pressure_psi / cartridge.saami_max_pressure_psi
    if 0.90 <= ratio < 1.0:
        warnings.append(
            f"WARNING: Peak pressure at {ratio*100:.1f}% of SAAMI max"
        )

    # --- Structural calculations ---
    inner_radius = cartridge.bore_diameter_m / 2.0
    outer_radius = inner_radius + CASE_WALL_THICKNESS_M

    hoop_stress_pa = lame_hoop_stress(
        peak_pressure_pa, inner_radius, outer_radius, inner_radius
    )
    hoop_stress_mpa = hoop_stress_pa * 1e-6

    expansion_m = case_expansion(
        peak_pressure_pa, inner_radius, outer_radius, BRASS_E, BRASS_NU
    )
    case_expansion_mm = expansion_m / MM_TO_M

    erosion_m = lawton_erosion(
        EROSIVITY_DEFAULT, barrel_time_ms / 1000.0,
        ACTIVATION_ENERGY_DEFAULT, powder.flame_temp_k,
    )
    erosion_per_shot_mm = erosion_m / MM_TO_M

    # --- Barrel harmonics ---
    bore_radius = cartridge.bore_diameter_m / 2.0
    barrel_outer_r = BARREL_OUTER_DIAMETER_M / 2.0
    # Second moment of area for annular cross-section: I = pi/4 * (R_o^4 - R_i^4)
    I_barrel = (np.pi / 4.0) * (barrel_outer_r**4 - bore_radius**4)
    # Cross-section area
    A_barrel = np.pi * (barrel_outer_r**2 - bore_radius**2)

    # Mode 2 is typically the dominant vibration mode for rifle barrels
    barrel_freq = cantilever_frequency(
        mode=2,
        length=rifle.barrel_length_m,
        E=STEEL_E,
        I=I_barrel,
        rho=STEEL_RHO,
        A=A_barrel,
    )

    obt_list_s = ocw_barrel_times(barrel_freq, n_nodes=6)
    obt_list_ms = [t * 1000.0 for t in obt_list_s]

    obt_match = any(
        abs(barrel_time_ms - obt_ms) <= OBT_TOLERANCE_MS
        for obt_ms in obt_list_ms
    )

    # --- Free recoil calculation ---
    muzzle_velocity_mps = float(v_arr[-1])
    v_gas = 1.75 * muzzle_velocity_mps  # textbook approximation for propellant gas velocity
    recoil_impulse = bullet.mass_kg * muzzle_velocity_mps + omega * v_gas  # N*s
    if rifle.rifle_mass_kg > 0:
        recoil_velocity_mps = recoil_impulse / rifle.rifle_mass_kg
        recoil_energy_j = 0.5 * rifle.rifle_mass_kg * recoil_velocity_mps ** 2
    else:
        recoil_velocity_mps = 0.0
        recoil_energy_j = 0.0
    recoil_energy_ft_lbs = recoil_energy_j * J_TO_FT_LBS
    recoil_velocity_fps = recoil_velocity_mps * MPS_TO_FPS

    return SimResult(
        peak_pressure_psi=peak_pressure_psi,
        muzzle_velocity_fps=muzzle_velocity_fps,
        pressure_curve=pressure_curve,
        velocity_curve=velocity_curve,
        barrel_time_ms=barrel_time_ms,
        is_safe=is_safe,
        warnings=warnings,
        hoop_stress_mpa=hoop_stress_mpa,
        case_expansion_mm=case_expansion_mm,
        erosion_per_shot_mm=erosion_per_shot_mm,
        barrel_frequency_hz=barrel_freq,
        optimal_barrel_times=obt_list_ms,
        obt_match=obt_match,
        recoil_energy_ft_lbs=recoil_energy_ft_lbs,
        recoil_impulse_ns=recoil_impulse,
        recoil_velocity_fps=recoil_velocity_fps,
    )


def simulate_from_db(powder_row, bullet_row, cartridge_row, rifle_row, load_row) -> SimResult:
    """Convenience wrapper that converts DB model rows to simulation params."""
    powder = PowderParams(
        force_j_kg=powder_row.force_constant_j_kg,
        covolume_m3_kg=powder_row.covolume_m3_kg,
        burn_rate_coeff=powder_row.burn_rate_coeff,
        burn_rate_exp=powder_row.burn_rate_exp,
        gamma=powder_row.gamma,
        density_kg_m3=powder_row.density_g_cm3 * GCM3_TO_KGM3,
        flame_temp_k=powder_row.flame_temp_k,
        # 3-curve fields (None if not present -> 2-curve fallback)
        ba=getattr(powder_row, 'ba', None),
        bp=getattr(powder_row, 'bp', None),
        br=getattr(powder_row, 'br', None),
        brp=getattr(powder_row, 'brp', None),
        z1=getattr(powder_row, 'z1', None),
        z2=getattr(powder_row, 'z2', None),
    )

    bullet = BulletParams(
        mass_kg=bullet_row.weight_grains * GRAINS_TO_KG,
        diameter_m=bullet_row.diameter_mm * MM_TO_M,
    )

    case_capacity_m3 = cartridge_row.case_capacity_grains_h2o * GRAINS_TO_KG / 1000.0  # grains H2O -> cm3 -> m3
    chamber_vol = rifle_row.chamber_volume_mm3 * MM3_TO_M3 if rifle_row.chamber_volume_mm3 > 0 else case_capacity_m3

    cart = CartridgeParams(
        saami_max_pressure_psi=cartridge_row.saami_max_pressure_psi,
        chamber_volume_m3=chamber_vol,
        bore_diameter_m=cartridge_row.bore_diameter_mm * MM_TO_M,
    )

    rif = RifleParams(
        barrel_length_m=rifle_row.barrel_length_mm * MM_TO_M,
        twist_rate_m=rifle_row.twist_rate_mm * MM_TO_M,
        rifle_mass_kg=rifle_row.weight_kg if rifle_row.weight_kg else 3.5,
    )

    ld = LoadParams(
        charge_mass_kg=load_row.powder_charge_grains * GRAINS_TO_KG,
    )

    return simulate(powder, bullet, cart, rif, ld)
