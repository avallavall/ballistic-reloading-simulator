/**
 * Bullet profile geometry generator.
 *
 * Generates both SVG path data and Three.js-compatible ProfilePoint arrays
 * from bullet database dimensions. Produces type-aware ogive profiles
 * (tangent, secant, hybrid, flat_nose, round_nose, spitzer).
 *
 * Pure TypeScript -- no React, no Three.js imports.
 */

import {
  BulletDimensions,
  GeometryResult,
  ProfilePoint,
} from './types';

import {
  estimateBulletLength,
  estimateBearingSurface,
  estimateBoatTailLength,
} from './estimation';

/** Empty result for insufficient data */
function insufficientResult(): GeometryResult {
  return {
    svgPath: '',
    profilePoints: [],
    estimatedFields: [],
    dataCompleteness: 'insufficient',
  };
}

/**
 * Resolve a dimension with estimation fallback, tracking estimated fields.
 */
function resolve(
  fieldName: string,
  actualValue: number | null,
  estimateFn: () => number | null,
  estimatedFields: string[]
): number | null {
  if (actualValue != null) {
    return actualValue;
  }
  const estimated = estimateFn();
  if (estimated != null) {
    estimatedFields.push(fieldName);
  }
  return estimated;
}

/**
 * Normalize ogive type string to a known enum value.
 */
function normalizeOgiveType(
  ogiveType: string | null,
  bulletType: string | null
): 'tangent' | 'secant' | 'hybrid' | 'flat_nose' | 'round_nose' | 'spitzer' {
  if (ogiveType != null) {
    const ot = ogiveType.toLowerCase().replace(/[\s-]/g, '_');
    if (ot.includes('tangent')) return 'tangent';
    if (ot.includes('secant')) return 'secant';
    if (ot.includes('hybrid') || ot.includes('vld')) return 'hybrid';
    if (ot.includes('flat') && ot.includes('nose')) return 'flat_nose';
    if (ot.includes('round') && ot.includes('nose')) return 'round_nose';
    if (ot.includes('spitzer') || ot.includes('spire')) return 'spitzer';
  }

  // Infer from bullet_type if ogive_type not specified
  if (bulletType != null) {
    const bt = bulletType.toLowerCase();
    if (bt.includes('wadcutter') || bt.includes('wc') || bt.includes('swc')) return 'flat_nose';
    if (bt.includes('round_nose') || bt.includes('rn') || bt === 'fmj_rn') return 'round_nose';
    if (bt.includes('vld') || bt.includes('berger')) return 'hybrid';
  }

  return 'spitzer'; // Default
}

/**
 * Build SVG path from top-half profile points using polylines.
 * Uses all intermediate ogive points for accurate, symmetric rendering.
 */
function buildSvgPath(topPoints: ProfilePoint[]): string {
  if (topPoints.length < 2) return '';
  const fmt = (n: number) => n.toFixed(3);
  const parts: string[] = [];

  // Top half: base → tip (negative y for SVG top)
  parts.push(`M ${fmt(topPoints[0].x)} ${fmt(-topPoints[0].y)}`);
  for (let i = 1; i < topPoints.length; i++) {
    parts.push(`L ${fmt(topPoints[i].x)} ${fmt(-topPoints[i].y)}`);
  }

  // Bottom half: tip → base (positive y for SVG bottom) — exact mirror
  for (let i = topPoints.length - 1; i >= 0; i--) {
    parts.push(`L ${fmt(topPoints[i].x)} ${fmt(topPoints[i].y)}`);
  }

  parts.push('Z');
  return parts.join(' ');
}

/**
 * Generate bullet profile from dimensions.
 *
 * Coordinate system:
 * - x = 0 at bullet base
 * - y = radial distance from centerline (positive = top half)
 * - All units in mm
 *
 * Profile sections (base to tip):
 *   1. Boat tail (if applicable) or flat base
 *   2. Bearing surface (body cylinder)
 *   3. Ogive (type-aware: tangent, secant, hybrid, flat_nose, round_nose, spitzer)
 *   4. Meplat (flat tip)
 */
export function generateBulletProfile(dims: BulletDimensions): GeometryResult {
  // Required: diameter
  if (dims.diameter_mm == null) {
    return insufficientResult();
  }

  const bodyR = dims.diameter_mm / 2;
  const estimatedFields: string[] = [];

  // Resolve total length (required for profile, can be estimated from weight)
  const totalLength = resolve(
    'length_mm',
    dims.length_mm,
    () => estimateBulletLength(dims),
    estimatedFields
  );

  if (totalLength == null) {
    return insufficientResult();
  }

  // Resolve rendering dimensions
  const bearingSurface = resolve(
    'bearing_surface_mm',
    dims.bearing_surface_mm,
    () => estimateBearingSurface(dims),
    estimatedFields
  ) ?? totalLength * 0.45;

  const boatTailLength = resolve(
    'boat_tail_length_mm',
    dims.boat_tail_length_mm,
    () => estimateBoatTailLength(dims),
    estimatedFields
  ) ?? 0;

  // Meplat: the flat tip diameter. Even sharp bullets have a small meplat.
  const meplatR = resolve(
    'meplat_diameter_mm',
    dims.meplat_diameter_mm != null ? dims.meplat_diameter_mm / 2 : null,
    () => bodyR * 0.06, // ~6% of body diameter for pointed bullets
    estimatedFields
  ) ?? bodyR * 0.06;

  // Ogive type
  const ogiveNormalized = normalizeOgiveType(dims.ogive_type, dims.bullet_type);
  if (dims.ogive_type == null) {
    estimatedFields.push('ogive_type');
  }

  // Boat tail base diameter (smaller than body)
  const hasBoatTail = boatTailLength > 0;
  const btBaseR = hasBoatTail ? bodyR * 0.85 : bodyR; // BT typically 85% of body diameter

  // Calculate ogive length (remaining after base + bearing)
  const ogiveLength = totalLength - bearingSurface - boatTailLength;

  // Build profile points (top half, base to tip)
  const points: ProfilePoint[] = [];

  // Section 1: Bullet base
  if (hasBoatTail) {
    // Boat tail: angled taper from BT base diameter up to body diameter
    points.push({ x: 0, y: btBaseR });
    points.push({ x: boatTailLength, y: bodyR });
  } else {
    // Flat base: start at body radius
    points.push({ x: 0, y: bodyR });
  }

  // Section 2: Bearing surface (body cylinder)
  const bearingStart = hasBoatTail ? boatTailLength : 0;
  const bearingEnd = bearingStart + bearingSurface;

  // Only add bearing end point if it differs from previous point
  if (points[points.length - 1].x < bearingEnd) {
    points.push({ x: bearingEnd, y: bodyR });
  }

  // Section 3: Ogive (sampled as discrete points for smooth rendering)
  if (ogiveLength > 0) {
    const ogivePoints = generateOgiveProfilePoints(
      bearingEnd, bodyR, totalLength, meplatR, ogiveNormalized
    );
    // Add intermediate ogive points (skip first which overlaps bearing end)
    for (let i = 1; i < ogivePoints.length; i++) {
      points.push(ogivePoints[i]);
    }
  } else {
    // No ogive section (e.g. wadcutter fully flat)
    points.push({ x: totalLength, y: meplatR });
  }

  // Generate SVG path using all profile points (polyline)
  const svgPath = buildSvgPath(points);

  // Classify completeness
  const dataCompleteness = classifyCompleteness(estimatedFields.length);

  return {
    svgPath,
    profilePoints: points,
    estimatedFields,
    dataCompleteness,
  };
}

/**
 * Generate discrete ogive profile points for LatheGeometry.
 * These are sampled from the parametric ogive curve.
 */
function generateOgiveProfilePoints(
  startX: number,
  bodyR: number,
  totalLength: number,
  meplatR: number,
  ogiveType: string
): ProfilePoint[] {
  const numSamples = 16; // Enough for smooth lathe geometry
  const points: ProfilePoint[] = [];
  const ogiveLength = totalLength - startX;

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples; // 0 to 1
    const x = startX + ogiveLength * t;
    let y: number;

    switch (ogiveType) {
      case 'tangent':
      case 'spitzer': {
        // Tangent ogive: smooth quadratic-like taper
        // y = bodyR * (1 - t) + meplatR * t, with curve toward body
        const curve = 1 - t * t; // Quadratic ease
        y = meplatR + (bodyR - meplatR) * curve;
        break;
      }

      case 'secant': {
        // Secant ogive: steeper curve, drops faster
        const curve = Math.pow(1 - t, 1.5);
        y = meplatR + (bodyR - meplatR) * curve;
        break;
      }

      case 'hybrid': {
        // Hybrid: tangent near body, secant near tip
        // Uses a blend: smooth start, steep finish
        const tangentCurve = 1 - t * t;
        const secantCurve = Math.pow(1 - t, 1.5);
        const blend = t; // Linear blend from tangent to secant
        const curve = tangentCurve * (1 - blend) + secantCurve * blend;
        y = meplatR + (bodyR - meplatR) * curve;
        break;
      }

      case 'round_nose': {
        // Semi-circular: y = sqrt(1 - t^2) scaled
        const curve = Math.sqrt(Math.max(0, 1 - t * t));
        y = meplatR + (bodyR - meplatR) * curve;
        break;
      }

      case 'flat_nose': {
        // Linear taper (wadcutter style)
        y = bodyR * (1 - t) + meplatR * t;
        break;
      }

      default: {
        // Spitzer-like default
        const curve = 1 - t * t;
        y = meplatR + (bodyR - meplatR) * curve;
        break;
      }
    }

    points.push({ x, y });
  }

  return points;
}

/**
 * Classify data completeness based on number of estimated fields.
 */
function classifyCompleteness(estimatedCount: number): 'full' | 'basic' | 'insufficient' {
  if (estimatedCount === 0) return 'full';
  if (estimatedCount <= 3) return 'basic';
  return 'insufficient';
}
