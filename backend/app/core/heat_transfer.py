"""Thornhill-type convective heat loss model for internal ballistics.

Reduces the adiabatic overprediction by subtracting wall heat transfer:
  dQ/dt = h * A_wall * (T_gas - T_wall)

where:
  h      = convective heat transfer coefficient (W/m^2/K)
  A_wall = pi * bore_diameter * x  (grows with bullet travel)
  T_gas  = instantaneous gas temperature from Noble-Abel EOS
  T_wall = barrel wall temperature (~300 K ambient)
"""

import numpy as np

R_UNIVERSAL = 8.314  # J/(mol*K)


def wall_heat_flux(
    T_gas: float,
    T_wall: float,
    h_coeff: float,
    A_wall: float,
) -> float:
    """Calculate instantaneous heat loss rate to barrel wall.

    Args:
        T_gas: Gas temperature (K).
        T_wall: Wall temperature (K).
        h_coeff: Convective heat transfer coefficient (W/m^2/K).
        A_wall: Exposed wall area (m^2).

    Returns:
        Heat loss rate dQ/dt (W).
    """
    if T_gas <= T_wall:
        return 0.0
    return h_coeff * A_wall * (T_gas - T_wall)


def convective_area(bore_diameter: float, bullet_position: float) -> float:
    """Calculate barrel wall area exposed to propellant gas.

    Args:
        bore_diameter: Bore diameter (m).
        bullet_position: Bullet displacement from chamber (m).

    Returns:
        Exposed cylindrical wall area (m^2).
    """
    if bullet_position <= 0.0:
        return 0.0
    return np.pi * bore_diameter * bullet_position


def gas_temperature(
    pressure: float,
    free_volume: float,
    gas_mass: float,
    covolume: float,
    molecular_weight: float,
) -> float:
    """Calculate gas temperature from Noble-Abel equation of state.

    P * (V - m*eta) = m * (R_u / M_w) * T
    => T = P * (V - m*eta) * M_w / (m * R_u)

    Args:
        pressure: Average gas pressure (Pa).
        free_volume: Free volume in chamber/bore (m^3).
        gas_mass: Mass of combustion gas (kg).
        covolume: Covolume eta (m^3/kg).
        molecular_weight: Mean molecular weight of gas (kg/mol).

    Returns:
        Gas temperature (K).
    """
    if gas_mass <= 0.0:
        return 0.0
    V_corrected = free_volume - gas_mass * covolume
    if V_corrected <= 0.0:
        return 0.0
    return pressure * V_corrected * molecular_weight / (gas_mass * R_UNIVERSAL)
