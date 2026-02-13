"""Internal ballistics: Lagrange pressure gradient, bullet dynamics, free volume."""

import numpy as np


def lagrange_base_pressure(avg_pressure: float, charge_mass: float, bullet_mass: float) -> float:
    """Calculate shot-base pressure from average pressure using Lagrange gradient.

    P_s = P_avg / (1 + omega / (3 * m))

    Args:
        avg_pressure: Spatial average pressure P_avg (Pa).
        charge_mass: Propellant charge mass omega (kg).
        bullet_mass: Bullet mass m (kg).

    Returns:
        Shot-base pressure P_s (Pa).
    """
    return avg_pressure / (1.0 + charge_mass / (3.0 * bullet_mass))


def lagrange_breech_pressure(base_pressure: float, charge_mass: float, bullet_mass: float) -> float:
    """Calculate breech pressure from shot-base pressure using Lagrange gradient.

    P_b = P_s * (1 + omega / (2 * m))

    Args:
        base_pressure: Shot-base pressure P_s (Pa).
        charge_mass: Propellant charge mass omega (kg).
        bullet_mass: Bullet mass m (kg).

    Returns:
        Breech pressure P_b (Pa).
    """
    return base_pressure * (1.0 + charge_mass / (2.0 * bullet_mass))


def bullet_acceleration(
    base_pressure: float,
    bore_area: float,
    friction_force: float,
    effective_mass: float,
) -> float:
    """Calculate bullet acceleration from Newton's second law.

    a = (P_s * A_b - F_friction) / m_eff

    Args:
        base_pressure: Shot-base pressure P_s (Pa).
        bore_area: Bore cross-section area A_b (m^2).
        friction_force: Total friction force (N).
        effective_mass: Effective mass m + omega/3 (kg).

    Returns:
        Acceleration (m/s^2).
    """
    net_force = base_pressure * bore_area - friction_force
    if net_force < 0.0:
        return 0.0
    return net_force / effective_mass


def free_volume(
    chamber_vol: float,
    bore_area: float,
    displacement: float,
    charge_mass: float,
    density: float,
    fraction_burned: float,
) -> float:
    """Calculate free volume available for gas expansion.

    V_free = V_0 + A_b * x - (omega / rho_p) * (1 - psi)

    Args:
        chamber_vol: Initial chamber volume V_0 (m^3).
        bore_area: Bore cross-section area A_b (m^2).
        displacement: Bullet displacement x (m).
        charge_mass: Propellant charge mass omega (kg).
        density: Solid propellant density rho_p (kg/m^3).
        fraction_burned: Fraction of propellant burned psi.

    Returns:
        Free volume V_free (m^3).
    """
    solid_volume = (charge_mass / density) * (1.0 - fraction_burned)
    return chamber_vol + bore_area * displacement - solid_volume
