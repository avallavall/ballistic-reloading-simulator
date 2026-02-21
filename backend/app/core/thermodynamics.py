"""Thermodynamics of propellant combustion: Noble-Abel EOS, Vieille burn rate, form function."""

import numpy as np

R_UNIVERSAL = 8.314  # J/(mol*K)


def noble_abel_pressure(
    mass_gas: float,
    volume: float,
    covolume: float,
    force: float,
    fraction_burned: float,
) -> float:
    """Calculate gas pressure using the Noble-Abel equation of state.

    P = f * omega * psi / (V_free - omega * psi * eta)

    Args:
        mass_gas: Total propellant charge mass omega (kg).
        volume: Free volume available V_free (m^3).
        covolume: Gas covolume eta (m^3/kg).
        force: Propellant force/impetus f (J/kg).
        fraction_burned: Fraction of propellant burned psi (0 to 1).

    Returns:
        Pressure in Pa.
    """
    if fraction_burned <= 0.0:
        return 0.0
    numerator = force * mass_gas * fraction_burned
    denominator = volume - mass_gas * fraction_burned * covolume
    if denominator <= 0.0:
        return np.inf
    return numerator / denominator


def vieille_burn_rate(pressure: float, coeff_a: float, exponent_n: float) -> float:
    """Calculate linear regression rate using Vieille's (Saint-Robert's) law.

    r_b = a1 * P^n

    Args:
        pressure: Gas pressure P (Pa).
        coeff_a: Burn rate coefficient a1 (m / (s * Pa^n)).
        exponent_n: Pressure exponent n (dimensionless).

    Returns:
        Linear burn rate in m/s.
    """
    if pressure <= 0.0:
        return 0.0
    return coeff_a * (pressure ** exponent_n)


def form_function(z: float, theta: float) -> float:
    """Calculate fraction of propellant burned from normalized burn depth.

    psi(Z) = (theta + 1) * Z - theta * Z^2   for 0 <= Z <= 1

    Args:
        z: Normalized burn depth Z = e / e1 (0 to 1).
        theta: Grain form factor (positive=regressive, 0=neutral, negative=progressive).

    Returns:
        Fraction burned psi (0 to 1).
    """
    z_clamped = np.clip(z, 0.0, 1.0)
    psi = (theta + 1.0) * z_clamped - theta * z_clamped ** 2
    return float(np.clip(psi, 0.0, 1.0))


def form_function_3curve(z: float, z1: float, z2: float,
                         bp: float, br: float, brp: float) -> float:
    """Three-phase piecewise form function for GRT-style 3-curve burn model.

    Divides combustion into three phases:
      Phase 1 (0 <= z < z1): Initial ignition. psi_raw = z + bp * z^2
      Phase 2 (z1 <= z < z2): Main combustion. psi_raw = psi(z1) + (z-z1) + brp*(z-z1)*(z+z1)
      Phase 3 (z2 <= z <= 1): Tail-off. psi_raw = psi(z2) + (z-z2) + br*(z-z2)*(z+z2)

    Normalized so psi(1.0) = 1.0.

    Args:
        z: Normalized burn depth (0 to 1).
        z1: Phase 1/2 transition point.
        z2: Phase 2/3 transition point.
        bp: Progressivity factor.
        br: Brisance factor.
        brp: Combined progressivity/brisance factor.

    Returns:
        Fraction burned psi (0 to 1).
    """
    z_c = float(np.clip(z, 0.0, 1.0))

    # Phase 1: 0 to z1
    psi_z1 = z1 + bp * z1 ** 2

    if z_c <= z1:
        psi_raw = z_c + bp * z_c ** 2
    elif z_c <= z2:
        # Phase 2: z1 to z2 (transition using brp)
        dz = z_c - z1
        psi_raw = psi_z1 + dz + brp * dz * (z_c + z1)
    else:
        # Phase 3: z2 to 1.0 (tail-off using br)
        dz12 = z2 - z1
        psi_z2 = psi_z1 + dz12 + brp * dz12 * (z2 + z1)
        dz = z_c - z2
        psi_raw = psi_z2 + dz + br * dz * (z_c + z2)

    # Normalize so psi(1.0) = 1.0
    # Compute psi_raw at z=1.0
    dz12 = z2 - z1
    psi_z2_total = psi_z1 + dz12 + brp * dz12 * (z2 + z1)
    dz_tail = 1.0 - z2
    psi_total = psi_z2_total + dz_tail + br * dz_tail * (1.0 + z2)

    if psi_total <= 0.0:
        return 0.0

    return float(np.clip(psi_raw / psi_total, 0.0, 1.0))


def flame_temperature(force: float, molecular_weight: float) -> float:
    """Calculate adiabatic flame temperature from propellant force.

    T_v = f * M_g / R_u

    Args:
        force: Propellant force f (J/kg).
        molecular_weight: Mean molecular weight of combustion gases M_g (kg/mol).

    Returns:
        Adiabatic flame temperature T_v (K).
    """
    return force * molecular_weight / R_UNIVERSAL
