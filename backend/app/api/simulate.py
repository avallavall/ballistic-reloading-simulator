import io
import uuid

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware import limiter
from app.core.solver import (
    BulletParams,
    CartridgeParams,
    LoadParams,
    PowderParams,
    RifleParams,
    simulate,
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
    SimulationRequest,
    SimulationResultResponse,
)

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


def _make_params(powder_row, bullet_row, cartridge_row, rifle_row, charge_grains: float):
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
    rif = RifleParams(
        barrel_length_m=rifle_row.barrel_length_mm * MM_TO_M,
        twist_rate_m=rifle_row.twist_rate_mm * MM_TO_M,
        rifle_mass_kg=rifle_row.weight_kg if rifle_row.weight_kg else 3.5,
    )
    ld = LoadParams(charge_mass_kg=charge_grains * GRAINS_TO_KG)
    return powder, bullet, cart, rif, ld


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

        results.append(DirectSimulationResponse(
            peak_pressure_psi=sim_result.peak_pressure_psi,
            muzzle_velocity_fps=sim_result.muzzle_velocity_fps,
            pressure_curve=sim_result.pressure_curve,
            velocity_curve=sim_result.velocity_curve,
            barrel_time_ms=sim_result.barrel_time_ms,
            is_safe=sim_result.is_safe,
            warnings=sim_result.warnings,
            hoop_stress_mpa=sim_result.hoop_stress_mpa,
            case_expansion_mm=sim_result.case_expansion_mm,
            erosion_per_shot_mm=sim_result.erosion_per_shot_mm,
            barrel_frequency_hz=sim_result.barrel_frequency_hz,
            optimal_barrel_times=sim_result.optimal_barrel_times,
            obt_match=sim_result.obt_match,
            recoil_energy_ft_lbs=sim_result.recoil_energy_ft_lbs,
            recoil_impulse_ns=sim_result.recoil_impulse_ns,
            recoil_velocity_fps=sim_result.recoil_velocity_fps,
        ))
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
        powder_row, bullet_row, cartridge_row, rifle_row, req.powder_charge_grains
    )

    result = simulate(powder, bullet, cart, rif, ld)

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
