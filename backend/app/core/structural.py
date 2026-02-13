"""Structural mechanics: Lame equations for case expansion, Lawton barrel erosion."""

import numpy as np

R_UNIVERSAL = 8.314  # J/(mol*K)


def lame_hoop_stress(
    internal_pressure: float,
    inner_radius: float,
    outer_radius: float,
    eval_radius: float,
) -> float:
    """Calculate hoop (circumferential) stress using Lame's equations for thick cylinder.

    sigma_theta(r) = (P_i * r_i^2) / (r_o^2 - r_i^2) * (1 + r_o^2 / r^2)

    Assumes external pressure P_o = 0.

    Args:
        internal_pressure: Internal pressure P_i (Pa).
        inner_radius: Inner radius r_i (m).
        outer_radius: Outer radius r_o (m).
        eval_radius: Radius at which to evaluate r (m).

    Returns:
        Hoop stress sigma_theta (Pa).
    """
    ri2 = inner_radius ** 2
    ro2 = outer_radius ** 2
    r2 = eval_radius ** 2
    return (internal_pressure * ri2 / (ro2 - ri2)) * (1.0 + ro2 / r2)


def case_expansion(
    internal_pressure: float,
    inner_radius: float,
    outer_radius: float,
    youngs_modulus: float,
    poisson_ratio: float,
) -> float:
    """Calculate radial expansion of outer surface of a thick-walled cylinder.

    u_r(r_o) = (P_i * r_i^2 * r_o) / (E * (r_o^2 - r_i^2)) * ((1 - nu) + (1 + nu))
             = (P_i * r_i^2 * r_o * 2) / (E * (r_o^2 - r_i^2))

    Args:
        internal_pressure: Internal pressure P_i (Pa).
        inner_radius: Inner radius r_i (m).
        outer_radius: Outer radius r_o (m).
        youngs_modulus: Young's modulus E (Pa).
        poisson_ratio: Poisson's ratio nu.

    Returns:
        Radial displacement of outer surface (m).
    """
    ri2 = inner_radius ** 2
    ro2 = outer_radius ** 2
    return (internal_pressure * ri2 * outer_radius * 2.0) / (youngs_modulus * (ro2 - ri2))


def lawton_erosion(
    erosivity: float,
    exposure_time: float,
    activation_energy: float,
    surface_temp: float,
) -> float:
    """Calculate barrel erosion per shot using Lawton's Arrhenius model.

    W = E_r * sqrt(t_exp) * exp(-E_a / (R_u * T_surf))

    Args:
        erosivity: Propellant erosivity constant E_r (m/s^0.5).
        exposure_time: Gas exposure time t_exp (s).
        activation_energy: Activation energy E_a (J/mol).
        surface_temp: Maximum surface temperature T_surf (K).

    Returns:
        Erosion depth per shot W (m).
    """
    if surface_temp <= 0.0:
        return 0.0
    return erosivity * np.sqrt(exposure_time) * np.exp(-activation_energy / (R_UNIVERSAL * surface_temp))
