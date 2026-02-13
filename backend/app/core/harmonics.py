"""Barrel harmonics: Euler-Bernoulli cantilever vibration modes, OCW barrel times."""

import numpy as np

CANTILEVER_EIGENVALUES = [1.8751, 4.6941, 7.8548, 10.996]


def _eigenvalue(mode: int) -> float:
    """Get eigenvalue lambda_n for cantilever beam mode n (1-indexed)."""
    if mode <= len(CANTILEVER_EIGENVALUES):
        return CANTILEVER_EIGENVALUES[mode - 1]
    return (2 * mode - 1) * np.pi / 2.0


def cantilever_frequency(
    mode: int,
    length: float,
    E: float,
    I: float,
    rho: float,
    A: float,
) -> float:
    """Calculate natural frequency of a cantilever beam (Euler-Bernoulli).

    f_n = lambda_n^2 / (2 * pi * L^2) * sqrt(E * I / (rho * A))

    Args:
        mode: Mode number (1, 2, 3, ...).
        length: Free length of barrel L (m).
        E: Young's modulus (Pa).
        I: Second moment of area (m^4).
        rho: Material density (kg/m^3).
        A: Cross-section area (m^2).

    Returns:
        Natural frequency f_n (Hz).
    """
    lam = _eigenvalue(mode)
    return (lam ** 2 / (2.0 * np.pi * length ** 2)) * np.sqrt(E * I / (rho * A))


def muzzle_deflection(
    mode_amplitudes: list[float],
    frequencies: list[float],
    time: float,
    length: float,
) -> float:
    """Calculate muzzle deflection as superposition of vibration modes.

    delta = sum(A_n * sin(2*pi*f_n*t))

    Simplified model assuming maximum mode shape at muzzle tip.

    Args:
        mode_amplitudes: Amplitude for each mode A_n (m).
        frequencies: Natural frequency for each mode f_n (Hz).
        time: Time of evaluation t (s).
        length: Barrel length (m) -- unused in simplified model.

    Returns:
        Muzzle deflection (m).
    """
    deflection = 0.0
    for amp, freq in zip(mode_amplitudes, frequencies):
        deflection += amp * np.sin(2.0 * np.pi * freq * time)
    return deflection


def ocw_barrel_times(dominant_frequency: float, n_nodes: int = 6) -> list[float]:
    """Calculate optimal barrel times (OBT) where muzzle velocity is at a vibration node.

    t_OBT_k = (2k - 1) / (4 * f_n)   for k = 1, 2, 3, ...

    Args:
        dominant_frequency: Dominant vibration frequency f_n (Hz), typically mode 2.
        n_nodes: Number of nodes to calculate.

    Returns:
        List of optimal barrel times (s).
    """
    return [(2 * k - 1) / (4.0 * dominant_frequency) for k in range(1, n_nodes + 1)]
