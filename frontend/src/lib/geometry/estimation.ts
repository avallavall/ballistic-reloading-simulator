/**
 * Heuristic estimation functions for missing cartridge/bullet dimensions.
 *
 * Called ONLY when the database value is null. Each function returns an
 * estimated value or null if estimation is not possible.
 *
 * Pure functions -- no side effects, no React/Three.js imports.
 * Sources: standard reloading engineering heuristics and SAAMI specs.
 */

import { CartridgeDimensions, BulletDimensions } from './types';

/**
 * Estimate shoulder angle for bottleneck cartridges.
 *
 * Heuristic:
 * - Standard bottleneck: 25 degrees (e.g. .308 Win, .30-06)
 * - Short-fat magnums (case_length < 50mm): 30 degrees (e.g. WSM family)
 * - Straight-wall (shoulder_diameter - neck_diameter < 0.5mm): null (no shoulder)
 */
export function estimateShoulderAngle(dims: CartridgeDimensions): number | null {
  const shoulderD = dims.shoulder_diameter_mm;
  const neckD = dims.neck_diameter_mm;

  // Cannot estimate without at least shoulder and neck diameters
  if (shoulderD == null || neckD == null) {
    return 25; // Default assumption for bottleneck
  }

  // Straight-wall cartridge detection: negligible shoulder taper
  if (shoulderD - neckD < 0.5) {
    return null; // No shoulder on straight-wall
  }

  // Short-fat magnums tend to have steeper shoulders
  if (dims.case_length_mm != null && dims.case_length_mm < 50) {
    return 30;
  }

  return 25;
}

/**
 * Estimate neck length using the 1x caliber rule.
 *
 * Heuristic: Neck length is approximately equal to bore diameter (1x caliber).
 * Fallback: neck_diameter * 0.8 if bore_diameter unavailable.
 */
export function estimateNeckLength(dims: CartridgeDimensions): number | null {
  if (dims.bore_diameter_mm != null) {
    return dims.bore_diameter_mm; // 1x caliber rule
  }
  if (dims.neck_diameter_mm != null) {
    return dims.neck_diameter_mm * 0.8;
  }
  return null;
}

/**
 * Estimate body length from case length minus neck and shoulder region.
 *
 * Heuristic: body_length = case_length - neck_length - 6.0mm (avg shoulder region).
 * Floor: minimum 50% of case_length to prevent unreasonable values.
 */
export function estimateBodyLength(dims: CartridgeDimensions): number | null {
  if (dims.case_length_mm == null) {
    return null;
  }

  const neckLen = dims.neck_length_mm ?? estimateNeckLength(dims);
  if (neckLen == null) {
    return dims.case_length_mm * 0.6; // Rough 60% body estimate
  }

  const bodyLen = dims.case_length_mm - neckLen - 6.0;
  const minBody = dims.case_length_mm * 0.5;

  return Math.max(bodyLen, minBody);
}

/**
 * Estimate rim thickness.
 *
 * Heuristic: 1.3mm is a reasonable default for rimless cartridges
 * (e.g. .308 Win = 1.27mm, .30-06 = 1.24mm, .223 Rem = 1.14mm).
 */
export function estimateRimThickness(_dims: CartridgeDimensions): number | null {
  return 1.3;
}

/**
 * Estimate bullet length from weight and diameter using cylindrical volume
 * with a shape correction factor.
 *
 * Formula: length = (weight_kg / (density_kg_m3 * pi * (r_m)^2)) * correction
 * - Density: 10500 kg/m3 for lead-core copper jacket, 8960 kg/m3 for solid copper
 * - Shape correction: 1.20 (accounts for ogive being thinner than a cylinder)
 * - weight_kg = weight_grains * 0.00006479891
 * - r_m = (diameter_mm / 2) / 1000
 */
export function estimateBulletLength(dims: BulletDimensions): number | null {
  if (dims.diameter_mm == null || dims.weight_grains == null) {
    return null;
  }

  const weightKg = dims.weight_grains * 0.00006479891;
  const radiusM = (dims.diameter_mm / 2) / 1000;
  const areaM2 = Math.PI * radiusM * radiusM;

  // Material density selection
  let densityKgM3 = 10500; // Default: lead core with copper jacket
  if (dims.material != null) {
    const mat = dims.material.toLowerCase();
    if (mat.includes('solid_copper') || mat.includes('copper') || mat === 'copper') {
      densityKgM3 = 8960;
    }
  }

  const shapeCorrectionFactor = 1.20;
  const lengthM = (weightKg / (densityKgM3 * areaM2)) * shapeCorrectionFactor;
  const lengthMm = lengthM * 1000;

  return lengthMm;
}

/**
 * Estimate bearing surface length.
 *
 * Heuristic:
 * - Match/target bullets: ~55% of total length (long bearing for accuracy)
 * - Hunting bullets: ~40% of total length (shorter for reliable expansion)
 */
export function estimateBearingSurface(dims: BulletDimensions): number | null {
  const totalLength = dims.length_mm ?? estimateBulletLength(dims);
  if (totalLength == null) {
    return null;
  }

  const bulletType = dims.bullet_type?.toLowerCase() ?? '';
  const isMatch = bulletType.includes('match') || bulletType.includes('target')
    || bulletType.includes('hpbt') || bulletType.includes('smk');

  return totalLength * (isMatch ? 0.55 : 0.40);
}

/**
 * Estimate boat tail length.
 *
 * Heuristic:
 * - Boat-tail bullets: ~15% of total length
 * - Flat-base bullets: 0mm (no boat tail)
 * - Default (unknown base): 10% of length (slight taper assumption)
 */
export function estimateBoatTailLength(dims: BulletDimensions): number | null {
  const totalLength = dims.length_mm ?? estimateBulletLength(dims);
  if (totalLength == null) {
    return null;
  }

  const baseType = dims.base_type?.toLowerCase() ?? '';

  if (baseType.includes('flat') || baseType === 'flat_base' || baseType === 'fb') {
    return 0;
  }

  if (baseType.includes('boat') || baseType.includes('bt')) {
    return totalLength * 0.15;
  }

  // Default: assume slight boat tail
  return totalLength * 0.10;
}
