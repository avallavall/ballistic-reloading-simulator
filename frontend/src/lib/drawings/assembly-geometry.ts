/**
 * Assembly layout computation for full cartridge-in-barrel technical drawings.
 * Positions cartridge, bullet, and barrel components in drawing space.
 * Pure computation -- no React or DOM dependencies.
 */

import { AssemblyLayout } from './types';
import { Cartridge, Bullet, Rifle, SimulationResult } from '../types';

/** Barrel wall thickness estimate (mm) beyond groove diameter */
const BARREL_WALL_THICKNESS_MM = 3.0;

// ============================================================
// Assembly Layout
// ============================================================

/**
 * Compute positions and dimensions for a full assembly drawing.
 * Positions: cartridge at origin, barrel extending forward, bullet seated in case mouth.
 *
 * @param cartridge - Cartridge dimensions
 * @param bullet - Bullet dimensions (nullable)
 * @param rifle - Rifle with barrel_length_mm
 * @returns AssemblyLayout with all positions computed
 */
export function computeAssemblyLayout(
  cartridge: Cartridge,
  bullet: Bullet | null,
  rifle: Rifle
): AssemblyLayout {
  const caseLength = cartridge.case_length_mm;
  const boreRadius = cartridge.bore_diameter_mm / 2;
  const grooveRadius = cartridge.groove_diameter_mm / 2;
  const barrelOuterR = grooveRadius + BARREL_WALL_THICKNESS_MM;

  // Cartridge positioned at x=0 (case head at origin)
  const cartridge_x = 0;

  // Barrel starts at the end of the case
  // (In reality, the barrel starts at the chamber which surrounds the case,
  //  but for assembly view we show barrel extending from case mouth forward)
  const barrel_start_x = caseLength;

  // Barrel ends at barrel_length_mm from breech face
  // The barrel length includes the chamber, so visible barrel = total - case length
  const barrel_end_x = rifle.barrel_length_mm;

  // Bullet tip position
  let bullet_tip_x: number;
  if (bullet && bullet.length_mm) {
    // Bullet seated: base at seating depth inside case mouth
    // OAL = case_length + bullet_protrusion
    // bullet_protrusion = OAL - case_length (but we use overall_length from cartridge)
    const coalEstimate = cartridge.overall_length_mm;
    bullet_tip_x = coalEstimate;
  } else {
    // No bullet data: estimate tip at overall length
    bullet_tip_x = cartridge.overall_length_mm;
  }

  // Total drawing dimensions
  // Include some padding for dimension annotations
  const baseRadius = (cartridge.base_diameter_mm ?? grooveRadius * 2) / 2;
  const total_height_mm = Math.max(barrelOuterR, baseRadius) * 2 + 20; // +20 for dim space

  // For full assembly, we show a truncated barrel (not the full 600mm+)
  // Show proportional segment: max 200mm of barrel or full if short
  const visibleBarrelLength = Math.min(barrel_end_x - barrel_start_x, 200);
  const effective_barrel_end = barrel_start_x + visibleBarrelLength;
  const total_width_mm = effective_barrel_end + 20; // +20 for dim space

  // Scale: fit the full assembly in the drawing
  const cartridge_scale = 1.0; // 1:1 in mm drawing coordinates

  return {
    cartridge_x,
    cartridge_scale,
    barrel_start_x,
    barrel_end_x: effective_barrel_end,
    barrel_outer_r: barrelOuterR,
    barrel_bore_r: boreRadius,
    bullet_tip_x,
    total_width_mm,
    total_height_mm,
  };
}

// ============================================================
// OBT Node Positions
// ============================================================

/**
 * Convert optimal barrel times to x-positions along the barrel.
 * Uses the barrel time to compute what fraction of barrel length
 * corresponds to each OBT node.
 *
 * @param barrelLength - Total barrel length (mm)
 * @param simulation - Simulation result with barrel_time_ms and optimal_barrel_times
 * @returns Array of positions with labels and node indicators
 */
export function getObtNodePositions(
  barrelLength: number,
  simulation: SimulationResult
): { x: number; label: string; isNode: boolean }[] {
  const results: { x: number; label: string; isNode: boolean }[] = [];

  if (!simulation.optimal_barrel_times || simulation.optimal_barrel_times.length === 0) {
    return results;
  }

  const barrelTimeMs = simulation.barrel_time_ms;
  if (barrelTimeMs <= 0) return results;

  for (let i = 0; i < simulation.optimal_barrel_times.length; i++) {
    const obtTime = simulation.optimal_barrel_times[i];
    // Position along barrel proportional to time ratio
    // (Simplified: assumes roughly uniform acceleration, which isn't exact
    //  but sufficient for visualization purposes)
    const timeFraction = obtTime / barrelTimeMs;
    // Position is roughly proportional to time squared for constant acceleration
    // but for visualization, linear interpolation of position is acceptable
    const x = barrelLength * Math.min(timeFraction, 1.0);

    results.push({
      x,
      label: `OBT ${i + 1}`,
      isNode: true,
    });
  }

  // Add the actual barrel time position (muzzle exit)
  results.push({
    x: barrelLength,
    label: 'Muzzle Exit',
    isNode: false,
  });

  return results;
}

// ============================================================
// Stress Zone
// ============================================================

/**
 * Compute pressure stress severity for overlay coloring.
 * Returns a severity level and fraction for color interpolation.
 *
 * @param simulation - Simulation result with peak_pressure_psi
 * @param saamiMaxPsi - SAAMI maximum average pressure (PSI)
 * @returns Severity level and pressure fraction
 */
export function getStressZone(
  simulation: SimulationResult,
  saamiMaxPsi: number
): { severity: 'safe' | 'caution' | 'danger'; fraction: number } {
  if (saamiMaxPsi <= 0) {
    return { severity: 'safe', fraction: 0 };
  }

  const fraction = simulation.peak_pressure_psi / saamiMaxPsi;

  if (fraction > 1.0) {
    return { severity: 'danger', fraction };
  }
  if (fraction > 0.9) {
    return { severity: 'caution', fraction };
  }
  return { severity: 'safe', fraction };
}
