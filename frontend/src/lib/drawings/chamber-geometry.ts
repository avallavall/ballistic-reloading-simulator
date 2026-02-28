/**
 * Chamber clearance and geometry computation for technical drawings.
 * Computes the gap between cartridge exterior and chamber interior.
 * Pure computation -- no React or DOM dependencies.
 */

import { ChamberClearances } from './types';
import { ProfilePoint } from '../geometry/types';
import { Cartridge, Bullet } from '../types';

// ============================================================
// Freebore Estimation
// ============================================================

/**
 * Estimate freebore length based on bore diameter.
 * Uses SAAMI-typical values by caliber class.
 *
 * @param cartridge - Cartridge with bore_diameter_mm
 * @returns Estimated freebore in mm
 */
export function estimateFreebore(cartridge: Cartridge): number {
  const bore = cartridge.bore_diameter_mm;
  if (bore < 7) return 1.0;   // Small bore (.22, 6mm, 6.5mm)
  if (bore <= 8) return 2.0;  // Medium bore (7mm, .308)
  return 3.0;                  // Large bore (.338, .375, .50)
}

// ============================================================
// Chamber Clearances
// ============================================================

/**
 * Compute chamber-to-cartridge clearance values.
 * Uses rifle-specific overrides when available, falls back to SAAMI tolerances.
 *
 * @param cartridge - Cartridge dimensions
 * @param bullet - Bullet dimensions (nullable -- rifling engagement estimated if null)
 * @param rifle - Rifle chamber fields (all nullable)
 * @returns ChamberClearances with estimated_fields tracking
 */
export function computeChamberClearances(
  cartridge: Cartridge,
  bullet: Bullet | null,
  rifle: {
    freebore_mm?: number | null;
    throat_angle_deg?: number | null;
    headspace_mm?: number | null;
  }
): ChamberClearances {
  const estimated: string[] = [];

  // Headspace gap
  let headspace_gap_mm: number;
  if (rifle.headspace_mm != null) {
    headspace_gap_mm = rifle.headspace_mm;
  } else {
    headspace_gap_mm = 0.05; // SAAMI minimum for rimless
    estimated.push('headspace_gap_mm');
  }

  // Neck clearance (~0.5% of neck diameter, radial)
  let neck_clearance_mm: number;
  if (cartridge.neck_diameter_mm != null) {
    neck_clearance_mm = cartridge.neck_diameter_mm * 0.005;
  } else {
    neck_clearance_mm = 0.05;
    estimated.push('neck_clearance_mm');
  }

  // Body clearance (~0.3% of base diameter, radial)
  let body_clearance_mm: number;
  if (cartridge.base_diameter_mm != null) {
    body_clearance_mm = cartridge.base_diameter_mm * 0.003;
  } else {
    body_clearance_mm = 0.04;
    estimated.push('body_clearance_mm');
  }

  // Freebore
  let freebore_mm: number;
  if (rifle.freebore_mm != null) {
    freebore_mm = rifle.freebore_mm;
  } else {
    freebore_mm = estimateFreebore(cartridge);
    estimated.push('freebore_mm');
  }

  // Throat angle
  let throat_angle_deg: number;
  if (rifle.throat_angle_deg != null) {
    throat_angle_deg = rifle.throat_angle_deg;
  } else {
    throat_angle_deg = 1.5; // SAAMI standard
    estimated.push('throat_angle_deg');
  }

  // Rifling engagement (from bullet dimensions)
  let rifling_engagement_mm: number;
  if (bullet && bullet.bearing_surface_mm != null && bullet.length_mm != null) {
    // Bearing surface is the portion of bullet in contact with rifling
    // Engagement depends on how much bearing surface extends past the case mouth
    const seatedLength = bullet.length_mm * 0.5; // Approximate 50% of bullet seated in case
    rifling_engagement_mm = Math.max(0, bullet.bearing_surface_mm - seatedLength);
    if (rifling_engagement_mm < 0.5) {
      // Minimum reasonable engagement
      rifling_engagement_mm = bullet.bearing_surface_mm * 0.3;
    }
  } else if (bullet && bullet.length_mm != null) {
    // Estimate: ~20% of bullet length engages rifling
    rifling_engagement_mm = bullet.length_mm * 0.2;
    estimated.push('rifling_engagement_mm');
  } else {
    // No bullet data: estimate from bore diameter
    rifling_engagement_mm = cartridge.bore_diameter_mm * 0.5;
    estimated.push('rifling_engagement_mm');
  }

  return {
    headspace_gap_mm,
    neck_clearance_mm,
    body_clearance_mm,
    freebore_mm,
    throat_angle_deg,
    rifling_engagement_mm,
    estimated_fields: estimated,
  };
}

// ============================================================
// Chamber Profile
// ============================================================

/**
 * Compute chamber interior profile points.
 * The chamber outline is the cartridge exterior plus clearance gaps.
 * Returns a half-profile (above centerline) suitable for SVG path rendering.
 *
 * @param cartridge - Cartridge dimensions
 * @param clearances - Computed chamber clearances
 * @returns Array of profile points defining the chamber outline
 */
export function computeChamberProfile(
  cartridge: Cartridge,
  clearances: ChamberClearances
): ProfilePoint[] {
  const points: ProfilePoint[] = [];

  // Chamber dimensions = cartridge exterior + clearances
  const baseDiameter = (cartridge.base_diameter_mm ?? cartridge.groove_diameter_mm) + clearances.body_clearance_mm * 2;
  const baseRadius = baseDiameter / 2;

  const neckDiameter = (cartridge.neck_diameter_mm ?? cartridge.bore_diameter_mm) + clearances.neck_clearance_mm * 2;
  const neckRadius = neckDiameter / 2;

  const shoulderDiameter = (cartridge.shoulder_diameter_mm ?? baseDiameter * 0.85);
  const shoulderRadius = shoulderDiameter / 2 + clearances.body_clearance_mm;

  const rimThickness = cartridge.rim_thickness_mm ?? 1.2;
  const caseLength = cartridge.case_length_mm;
  const neckLength = cartridge.neck_length_mm ?? caseLength * 0.15;
  const bodyLength = cartridge.body_length_mm ?? (caseLength - neckLength) * 0.7;

  // Start at chamber face (bolt face) with headspace gap
  const x0 = -clearances.headspace_gap_mm;

  // Point 0: chamber face at base radius
  points.push({ x: x0, y: baseRadius });

  // Point 1: rim seat area
  points.push({ x: 0, y: baseRadius });

  // Point 2: body-to-shoulder transition
  const shoulderStart = rimThickness + bodyLength;
  points.push({ x: shoulderStart, y: baseRadius });

  // Point 3: shoulder-to-neck transition
  const shoulderEnd = caseLength - neckLength;
  points.push({ x: shoulderEnd, y: shoulderRadius });

  // Point 4: neck start (at case mouth)
  points.push({ x: caseLength - neckLength, y: neckRadius });

  // Point 5: case mouth / neck end
  points.push({ x: caseLength, y: neckRadius });

  // Point 6: freebore section (same diameter as neck chamber)
  const freeboreEnd = caseLength + clearances.freebore_mm;
  const boreRadius = cartridge.bore_diameter_mm / 2;
  points.push({ x: freeboreEnd, y: boreRadius + clearances.neck_clearance_mm });

  // Point 7: throat taper to bore diameter
  const throatLength = (neckRadius - boreRadius) / Math.tan((clearances.throat_angle_deg * Math.PI) / 180);
  const throatEnd = freeboreEnd + throatLength;
  points.push({ x: throatEnd, y: boreRadius });

  // Point 8: rifling start (bore diameter)
  points.push({ x: throatEnd + 2, y: boreRadius });

  return points;
}
