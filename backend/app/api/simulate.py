import io
import logging
import time
import uuid

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware import limiter
from app.core.solver import (
    BulletParams,
    CartridgeParams,
    LoadParams,
    PowderParams,
    RifleParams,
    simulate,
    J_TO_FT_LBS,
)
from app.core.solver import GRAINS_TO_KG, MM_TO_M, MM3_TO_M3, GCM3_TO_KGM3
from app.db.session import get_db
from app.models.bullet import Bullet
from app.models.cartridge import Cartridge
from app.models.load import Load
from app.models.powder import Powder
from app.models.rifle import Rifle
from app.models.simulation import SimulationResult
from app.schemas.simulation import (
    DirectSimulationRequest,
    DirectSimulationResponse,
    LadderTestRequest,
    LadderTestResponse,
    ParametricSearchRequest,
    ParametricSearchResponse,
    PowderChargeResult,
    PowderSearchResult,
    SensitivityRequest,
    SensitivityResponse,
    SimulationRequest,
    SimulationResultResponse,
    ValidationLoadResult,
    ValidationResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/simulate", tags=["simulation"])


async def _load_simulation_data(db: AsyncSession, load: Load):
    """Load all related entities for a simulation."""
    powder = await db.get(Powder, load.powder_id)
    bullet = await db.get(Bullet, load.bullet_id)
    rifle = await db.get(Rifle, load.rifle_id)
    if not powder or not bullet or not rifle:
        raise HTTPException(404, "Related powder, bullet, or rifle not found")
    cartridge = await db.get(Cartridge, rifle.cartridge_id)
    if not cartridge:
        raise HTTPException(404, "Cartridge not found for rifle")
    return powder, bullet, cartridge, rifle


def _make_params(powder_row, bullet_row, cartridge_row, rifle_row, charge_grains: float, barrel_length_mm_override: float | None = None):
    """Convert DB rows to simulation parameter dataclasses."""
    case_capacity_m3 = cartridge_row.case_capacity_grains_h2o * GRAINS_TO_KG / 1000.0
    chamber_vol = rifle_row.chamber_volume_mm3 * MM3_TO_M3 if rifle_row.chamber_volume_mm3 > 0 else case_capacity_m3

    powder = PowderParams(
        force_j_kg=powder_row.force_constant_j_kg,
        covolume_m3_kg=powder_row.covolume_m3_kg,
        burn_rate_coeff=powder_row.burn_rate_coeff,
        burn_rate_exp=powder_row.burn_rate_exp,
        gamma=powder_row.gamma,
        density_kg_m3=powder_row.density_g_cm3 * GCM3_TO_KGM3,
        flame_temp_k=powder_row.flame_temp_k,
        # 3-curve fields (None if not present -> 2-curve fallback)
        ba=powder_row.ba,
        bp=powder_row.bp,
        br=powder_row.br,
        brp=powder_row.brp,
        z1=powder_row.z1,
        z2=powder_row.z2,
    )
    bullet = BulletParams(
        mass_kg=bullet_row.weight_grains * GRAINS_TO_KG,
        diameter_m=bullet_row.diameter_mm * MM_TO_M,
    )
    cart = CartridgeParams(
        saami_max_pressure_psi=cartridge_row.saami_max_pressure_psi,
        chamber_volume_m3=chamber_vol,
        bore_diameter_m=cartridge_row.bore_diameter_mm * MM_TO_M,
    )
    barrel_length_m = (barrel_length_mm_override * MM_TO_M) if barrel_length_mm_override else (rifle_row.barrel_length_mm * MM_TO_M)
    rif = RifleParams(
        barrel_length_m=barrel_length_m,
        twist_rate_m=rifle_row.twist_rate_mm * MM_TO_M,
        rifle_mass_kg=rifle_row.weight_kg if rifle_row.weight_kg else 3.5,
    )
    ld = LoadParams(charge_mass_kg=charge_grains * GRAINS_TO_KG)
    return powder, bullet, cart, rif, ld


def _sim_result_to_response(result) -> DirectSimulationResponse:
    """Convert a SimResult to a DirectSimulationResponse."""
    return DirectSimulationResponse(
        peak_pressure_psi=result.peak_pressure_psi,
        muzzle_velocity_fps=result.muzzle_velocity_fps,
        pressure_curve=result.pressure_curve,
        velocity_curve=result.velocity_curve,
        barrel_time_ms=result.barrel_time_ms,
        is_safe=result.is_safe,
        warnings=result.warnings,
        hoop_stress_mpa=result.hoop_stress_mpa,
        case_expansion_mm=result.case_expansion_mm,
        erosion_per_shot_mm=result.erosion_per_shot_mm,
        barrel_frequency_hz=result.barrel_frequency_hz,
        optimal_barrel_times=result.optimal_barrel_times,
        obt_match=result.obt_match,
        recoil_energy_ft_lbs=result.recoil_energy_ft_lbs,
        recoil_impulse_ns=result.recoil_impulse_ns,
        recoil_velocity_fps=result.recoil_velocity_fps,
        burn_curve=result.burn_curve or [],
        energy_curve=result.energy_curve or [],
        temperature_curve=result.temperature_curve or [],
        recoil_curve=result.recoil_curve or [],
    )


@router.post("", response_model=SimulationResultResponse, status_code=201)
@limiter.limit("10/minute")
async def run_simulation(request: Request, req: SimulationRequest, db: AsyncSession = Depends(get_db)):
    load = await db.get(Load, req.load_id)
    if not load:
        raise HTTPException(404, "Load not found")

    powder_row, bullet_row, cartridge_row, rifle_row = await _load_simulation_data(db, load)
    powder, bullet, cart, rif, ld = _make_params(
        powder_row, bullet_row, cartridge_row, rifle_row, load.powder_charge_grains
    )

    result = simulate(powder, bullet, cart, rif, ld)

    sim_record = SimulationResult(
        load_id=load.id,
        peak_pressure_psi=result.peak_pressure_psi,
        muzzle_velocity_fps=result.muzzle_velocity_fps,
        pressure_curve=result.pressure_curve,
        velocity_curve=result.velocity_curve,
        barrel_time_ms=result.barrel_time_ms,
        is_safe=result.is_safe,
        warnings=result.warnings,
        hoop_stress_mpa=result.hoop_stress_mpa,
        case_expansion_mm=result.case_expansion_mm,
        erosion_per_shot_mm=result.erosion_per_shot_mm,
        barrel_frequency_hz=result.barrel_frequency_hz,
        optimal_barrel_times=result.optimal_barrel_times,
        obt_match=result.obt_match,
        recoil_energy_ft_lbs=result.recoil_energy_ft_lbs,
        recoil_impulse_ns=result.recoil_impulse_ns,
        recoil_velocity_fps=result.recoil_velocity_fps,
    )
    db.add(sim_record)
    await db.commit()
    await db.refresh(sim_record)
    return sim_record


@router.post("/ladder", response_model=LadderTestResponse)
@limiter.limit("5/minute")
async def run_ladder_test(request: Request, req: LadderTestRequest, db: AsyncSession = Depends(get_db)):
    powder_row = await db.get(Powder, req.powder_id)
    bullet_row = await db.get(Bullet, req.bullet_id)
    rifle_row = await db.get(Rifle, req.rifle_id)
    if not powder_row or not bullet_row or not rifle_row:
        raise HTTPException(404, "Powder, bullet, or rifle not found")
    cartridge_row = await db.get(Cartridge, rifle_row.cartridge_id)
    if not cartridge_row:
        raise HTTPException(404, "Cartridge not found")

    charges = np.arange(req.charge_start_grains, req.charge_end_grains + req.charge_step_grains / 2, req.charge_step_grains)

    results = []
    charge_weights = []

    for charge_gr in charges:
        charge_gr = float(charge_gr)
        powder, bullet, cart, rif, ld = _make_params(
            powder_row, bullet_row, cartridge_row, rifle_row, charge_gr
        )
        sim_result = simulate(powder, bullet, cart, rif, ld)

        results.append(_sim_result_to_response(sim_result))
        charge_weights.append(charge_gr)

    return LadderTestResponse(results=results, charge_weights=charge_weights)


@router.post("/direct", response_model=DirectSimulationResponse)
@limiter.limit("10/minute")
async def run_direct_simulation(request: Request, req: DirectSimulationRequest, db: AsyncSession = Depends(get_db)):
    """Run a simulation directly from component IDs without creating a Load."""
    powder_row = await db.get(Powder, req.powder_id)
    bullet_row = await db.get(Bullet, req.bullet_id)
    rifle_row = await db.get(Rifle, req.rifle_id)
    if not powder_row or not bullet_row or not rifle_row:
        raise HTTPException(404, "Powder, bullet, or rifle not found")

    cartridge_row = await db.get(Cartridge, rifle_row.cartridge_id)
    if not cartridge_row:
        raise HTTPException(404, "Cartridge not found for rifle")

    powder, bullet, cart, rif, ld = _make_params(
        powder_row, bullet_row, cartridge_row, rifle_row, req.powder_charge_grains,
        barrel_length_mm_override=req.barrel_length_mm_override,
    )

    result = simulate(powder, bullet, cart, rif, ld)

    return _sim_result_to_response(result)


@router.post("/sensitivity", response_model=SensitivityResponse)
@limiter.limit("10/minute")
async def run_sensitivity(request: Request, req: SensitivityRequest, db: AsyncSession = Depends(get_db)):
    """Run 3 simulations (center, +delta, -delta) for sensitivity/error band visualization."""
    powder_row = await db.get(Powder, req.powder_id)
    bullet_row = await db.get(Bullet, req.bullet_id)
    rifle_row = await db.get(Rifle, req.rifle_id)
    if not powder_row or not bullet_row or not rifle_row:
        raise HTTPException(404, "Powder, bullet, or rifle not found")

    cartridge_row = await db.get(Cartridge, rifle_row.cartridge_id)
    if not cartridge_row:
        raise HTTPException(404, "Cartridge not found for rifle")

    charge_center = req.powder_charge_grains
    charge_upper = charge_center + req.charge_delta_grains
    charge_lower = max(0.1, charge_center - req.charge_delta_grains)

    # Run 3 simulations: center, upper, lower
    results = {}
    for label, charge_gr in [("center", charge_center), ("upper", charge_upper), ("lower", charge_lower)]:
        powder, bullet, cart, rif, ld = _make_params(
            powder_row, bullet_row, cartridge_row, rifle_row, charge_gr,
            barrel_length_mm_override=req.barrel_length_mm_override,
        )
        sim_result = simulate(powder, bullet, cart, rif, ld)
        results[label] = _sim_result_to_response(sim_result)

    return SensitivityResponse(
        center=results["center"],
        upper=results["upper"],
        lower=results["lower"],
        charge_center_grains=charge_center,
        charge_upper_grains=charge_upper,
        charge_lower_grains=charge_lower,
    )


@router.get("/export/{simulation_id}")
async def export_simulation_csv(simulation_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Export a simulation result as CSV with pressure and velocity curves."""
    sim = await db.get(SimulationResult, simulation_id)
    if not sim:
        raise HTTPException(404, "Simulation result not found")

    buf = io.StringIO()
    # Header with summary
    buf.write(f"# Peak Pressure (PSI),{sim.peak_pressure_psi:.1f}\n")
    buf.write(f"# Muzzle Velocity (FPS),{sim.muzzle_velocity_fps:.1f}\n")
    buf.write(f"# Barrel Time (ms),{sim.barrel_time_ms:.4f}\n")
    buf.write(f"# Safe,{sim.is_safe}\n")
    buf.write("\n")

    # Pressure curve
    buf.write("# Pressure Curve\n")
    buf.write("t_ms,p_psi\n")
    for pt in sim.pressure_curve:
        buf.write(f"{pt['t_ms']:.4f},{pt['p_psi']:.1f}\n")

    buf.write("\n")

    # Velocity curve
    buf.write("# Velocity Curve\n")
    buf.write("x_mm,v_fps\n")
    for pt in sim.velocity_curve:
        buf.write(f"{pt['x_mm']:.2f},{pt['v_fps']:.1f}\n")

    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=simulation_{simulation_id}.csv"},
    )


# Grains of water to cm^3 (1 grain H2O ≈ 0.0648 cm^3)
_GRAINS_H2O_TO_CM3 = GRAINS_TO_KG / 1e-3  # grains -> kg -> liters (cm^3)


@router.post("/parametric", response_model=ParametricSearchResponse)
@limiter.limit("3/minute")
async def run_parametric_search(request: Request, req: ParametricSearchRequest, db: AsyncSession = Depends(get_db)):
    """Search across all powders to find optimal loads for a given rifle/bullet/cartridge combination."""
    t_start = time.perf_counter()

    # Load rifle, bullet, cartridge from DB
    rifle_row = await db.get(Rifle, req.rifle_id)
    if not rifle_row:
        raise HTTPException(404, "Rifle not found")

    bullet_row = await db.get(Bullet, req.bullet_id)
    if not bullet_row:
        raise HTTPException(404, "Bullet not found")

    cartridge_row = await db.get(Cartridge, req.cartridge_id)
    if not cartridge_row:
        raise HTTPException(404, "Cartridge not found")

    # Get all powders
    result = await db.execute(select(Powder).order_by(Powder.name))
    all_powders = result.scalars().all()

    if not all_powders:
        raise HTTPException(404, "No powders found in database")

    # Case capacity in cm^3 for charge estimation
    case_capacity_cm3 = cartridge_row.case_capacity_grains_h2o * _GRAINS_H2O_TO_CM3

    powder_results: list[PowderSearchResult] = []

    for powder_row in all_powders:
        try:
            # Estimate max charge: case_capacity * powder_bulk_density * fill_factor
            # Bulk density is roughly 55-60% of solid density for granular powder
            bulk_density_g_cm3 = powder_row.density_g_cm3 * 0.58
            max_charge_g = case_capacity_cm3 * bulk_density_g_cm3 * 0.85
            max_charge_grains = max_charge_g / (GRAINS_TO_KG * 1000.0)

            # Generate charge range
            charge_min = req.charge_percent_min * max_charge_grains
            charge_max = req.charge_percent_max * max_charge_grains
            charges = np.linspace(charge_min, charge_max, req.charge_steps)

            charge_results: list[PowderChargeResult] = []
            best_safe_result = None
            best_safe_charge = None

            for charge_gr in charges:
                charge_gr = float(charge_gr)
                powder, bullet, cart, rif, ld = _make_params(
                    powder_row, bullet_row, cartridge_row, rifle_row, charge_gr
                )
                sim_result = simulate(powder, bullet, cart, rif, ld)

                cr = PowderChargeResult(
                    charge_grains=round(charge_gr, 2),
                    peak_pressure_psi=round(sim_result.peak_pressure_psi, 1),
                    muzzle_velocity_fps=round(sim_result.muzzle_velocity_fps, 1),
                    is_safe=sim_result.is_safe,
                )
                charge_results.append(cr)

                # Track the best safe result (highest velocity that is still safe)
                if sim_result.is_safe:
                    if best_safe_result is None or sim_result.muzzle_velocity_fps > best_safe_result.muzzle_velocity_fps:
                        best_safe_result = sim_result
                        best_safe_charge = charge_gr

            is_viable = best_safe_result is not None

            if is_viable:
                # Calculate efficiency: muzzle energy (ft-lbs) per grain of powder
                bullet_mass_kg = bullet_row.weight_grains * GRAINS_TO_KG
                muzzle_velocity_mps = best_safe_result.muzzle_velocity_fps / 3.28084
                muzzle_energy_j = 0.5 * bullet_mass_kg * muzzle_velocity_mps ** 2
                muzzle_energy_ft_lbs = muzzle_energy_j * J_TO_FT_LBS
                efficiency = muzzle_energy_ft_lbs / best_safe_charge if best_safe_charge > 0 else 0.0

                pressure_percent = (best_safe_result.peak_pressure_psi / cartridge_row.saami_max_pressure_psi) * 100.0

                powder_results.append(PowderSearchResult(
                    powder_id=powder_row.id,
                    powder_name=powder_row.name,
                    manufacturer=powder_row.manufacturer,
                    optimal_charge_grains=round(best_safe_charge, 2),
                    peak_pressure_psi=round(best_safe_result.peak_pressure_psi, 1),
                    muzzle_velocity_fps=round(best_safe_result.muzzle_velocity_fps, 1),
                    pressure_percent=round(pressure_percent, 1),
                    efficiency=round(efficiency, 2),
                    barrel_time_ms=round(best_safe_result.barrel_time_ms, 4),
                    recoil_energy_ft_lbs=round(best_safe_result.recoil_energy_ft_lbs, 2),
                    recoil_impulse_ns=round(best_safe_result.recoil_impulse_ns, 4),
                    is_viable=True,
                    all_results=charge_results,
                ))
            else:
                powder_results.append(PowderSearchResult(
                    powder_id=powder_row.id,
                    powder_name=powder_row.name,
                    manufacturer=powder_row.manufacturer,
                    is_viable=False,
                    all_results=charge_results,
                ))

        except Exception as e:
            logger.warning("Parametric search failed for powder %s: %s", powder_row.name, e)
            powder_results.append(PowderSearchResult(
                powder_id=powder_row.id,
                powder_name=powder_row.name,
                manufacturer=powder_row.manufacturer,
                is_viable=False,
                error=str(e),
            ))

    # Sort: viable powders first (by velocity desc), then non-viable
    viable = sorted([r for r in powder_results if r.is_viable], key=lambda r: r.muzzle_velocity_fps, reverse=True)
    non_viable = [r for r in powder_results if not r.is_viable]
    sorted_results = viable + non_viable

    total_time_ms = (time.perf_counter() - t_start) * 1000.0

    return ParametricSearchResponse(
        results=sorted_results,
        rifle_name=rifle_row.name,
        bullet_name=f"{bullet_row.weight_grains}gr {getattr(bullet_row, 'name', '')}".strip(),
        cartridge_name=cartridge_row.name,
        saami_max_psi=cartridge_row.saami_max_pressure_psi,
        total_powders_tested=len(all_powders),
        viable_powders=len(viable),
        total_time_ms=round(total_time_ms, 1),
    )


@router.post("/validate", response_model=ValidationResponse)
@limiter.limit("3/minute")
async def run_validation(request: Request):
    """Run all reference loads and return comparison results.

    Uses the shared VALIDATION_LOADS fixture to simulate each load
    and compare predicted vs published muzzle velocity.
    """
    from tests.fixtures.validation_loads import VALIDATION_LOADS, run_validation_load

    results: list[ValidationLoadResult] = []
    errors: list[float] = []

    for load in VALIDATION_LOADS:
        r = run_validation_load(load)
        results.append(ValidationLoadResult(
            load_id=r["load_id"],
            caliber=r["caliber"],
            bullet_desc=r["bullet_desc"],
            powder_name=r["powder_name"],
            charge_gr=r["charge_gr"],
            barrel_length_mm=r["barrel_length_mm"],
            published_velocity_fps=r["published_velocity_fps"],
            predicted_velocity_fps=r["predicted_velocity_fps"],
            error_pct=r["error_pct"],
            is_pass=r["is_pass"],
            source=r["source"],
        ))
        errors.append(r["error_pct"])

    passing = sum(1 for r in results if r.is_pass)
    max_error = max(errors) if errors else 0.0
    worst_idx = errors.index(max_error) if errors else 0
    worst_id = results[worst_idx].load_id if results else ""

    return ValidationResponse(
        results=results,
        total_loads=len(results),
        passing_loads=passing,
        pass_rate_pct=round(passing / len(results) * 100.0, 1) if results else 0.0,
        mean_error_pct=round(sum(errors) / len(errors), 2) if errors else 0.0,
        max_error_pct=round(max_error, 2),
        worst_load_id=worst_id,
    )
