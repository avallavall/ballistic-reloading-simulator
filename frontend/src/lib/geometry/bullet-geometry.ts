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
 * Build SVG path from top-half profile points.
 * Uses bezier curves for ogive sections (marked by indices).
 */
function buildSvgPath(
  topPoints: ProfilePoint[],
  ogiveStartIdx: number,
  ogiveEndIdx: number,
  ogiveNormalized: string
): string {
  if (topPoints.length < 2) return '';

  const parts: string[] = [];
  const fmt = (n: number) => n.toFixed(3);

  // Top half (negative y in SVG = top)
  parts.push(`M ${fmt(topPoints[0].x)} ${fmt(-topPoints[0].y)}`);

  for (let i = 1; i < topPoints.length; i++) {
    if (i === ogiveStartIdx && ogiveEndIdx > ogiveStartIdx) {
      // Use bezier curve for ogive section
      const svgOgive = buildOgiveSvgSegment(
        topPoints, ogiveStartIdx, ogiveEndIdx, ogiveNormalized
      );
      parts.push(svgOgive);
      i = ogiveEndIdx; // Skip to end of ogive
    } else {
      parts.push(`L ${fmt(topPoints[i].x)} ${fmt(-topPoints[i].y)}`);
    }
  }

  // Bottom half: mirror (right to left, positive y in SVG)
  for (let i = topPoints.length - 1; i >= 0; i--) {
    if (i === ogiveEndIdx && ogiveStartIdx < ogiveEndIdx) {
      // Reverse bezier for bottom half ogive
      const svgOgiveReverse = buildOgiveSvgSegmentReverse(
        topPoints, ogiveStartIdx, ogiveEndIdx, ogiveNormalized
      );
      parts.push(svgOgiveReverse);
      i = ogiveStartIdx;
    } else {
      parts.push(`L ${fmt(topPoints[i].x)} ${fmt(topPoints[i].y)}`);
    }
  }

  parts.push('Z');
  return parts.join(' ');
}

/**
 * Build SVG bezier segment for ogive (top half, negative y in SVG).
 */
function buildOgiveSvgSegment(
  points: ProfilePoint[],
  startIdx: number,
  endIdx: number,
  ogiveType: string
): string {
  const start = points[startIdx];
  const end = points[endIdx];
  const fmt = (n: number) => n.toFixed(3);

  switch (ogiveType) {
    case 'tangent':
    case 'spitzer': {
      // Quadratic bezier: control point at (midX, startY) for tangent-smooth curve
      const cpX = start.x + (end.x - start.x) * 0.6;
      const cpY = start.y * 0.5 + end.y * 0.5;
      return `Q ${fmt(cpX)} ${fmt(-cpY)} ${fmt(end.x)} ${fmt(-end.y)}`;
    }

    case 'secant': {
      // Steeper secant ogive: control point closer to the nose
      const cpX = start.x + (end.x - start.x) * 0.75;
      const cpY = start.y * 0.3 + end.y * 0.7;
      return `Q ${fmt(cpX)} ${fmt(-cpY)} ${fmt(end.x)} ${fmt(-end.y)}`;
    }

    case 'hybrid': {
      // Cubic bezier: tangent at body junction, secant toward nose
      const cp1X = start.x + (end.x - start.x) * 0.35;
      const cp1Y = start.y; // Tangent at body junction
      const cp2X = start.x + (end.x - start.x) * 0.75;
      const cp2Y = start.y * 0.2 + end.y * 0.8; // Secant toward nose
      return `C ${fmt(cp1X)} ${fmt(-cp1Y)} ${fmt(cp2X)} ${fmt(-cp2Y)} ${fmt(end.x)} ${fmt(-end.y)}`;
    }

    case 'round_nose': {
      // Semi-circular arc using SVG arc command
      const rx = (end.x - start.x);
      const ry = start.y - end.y;
      return `A ${fmt(rx)} ${fmt(ry)} 0 0 1 ${fmt(end.x)} ${fmt(-end.y)}`;
    }

    case 'flat_nose': {
      // Straight line from body to flat face (wadcutter style)
      return `L ${fmt(end.x)} ${fmt(-end.y)}`;
    }

    default: {
      // Fallback: quadratic bezier (spitzer-like)
      const cpX = start.x + (end.x - start.x) * 0.6;
      const cpY = start.y * 0.5 + end.y * 0.5;
      return `Q ${fmt(cpX)} ${fmt(-cpY)} ${fmt(end.x)} ${fmt(-end.y)}`;
    }
  }
}

/**
 * Build SVG bezier segment for ogive bottom-half mirror (positive y in SVG).
 */
function buildOgiveSvgSegmentReverse(
  points: ProfilePoint[],
  startIdx: number,
  endIdx: number,
  ogiveType: string
): string {
  const start = points[startIdx]; // body end
  const end = points[endIdx]; // tip
  const fmt = (n: number) => n.toFixed(3);

  // Reverse: we go from end (tip) to start (body), with mirrored y
  switch (ogiveType) {
    case 'tangent':
    case 'spitzer': {
      const cpX = start.x + (end.x - start.x) * 0.6;
      const cpY = start.y * 0.5 + end.y * 0.5;
      return `Q ${fmt(cpX)} ${fmt(cpY)} ${fmt(start.x)} ${fmt(start.y)}`;
    }

    case 'secant': {
      const cpX = start.x + (end.x - start.x) * 0.75;
      const cpY = start.y * 0.3 + end.y * 0.7;
      return `Q ${fmt(cpX)} ${fmt(cpY)} ${fmt(start.x)} ${fmt(start.y)}`;
    }

    case 'hybrid': {
      // Reverse cubic: swap control points
      const cp1X = start.x + (end.x - start.x) * 0.75;
      const cp1Y = start.y * 0.2 + end.y * 0.8;
      const cp2X = start.x + (end.x - start.x) * 0.35;
      const cp2Y = start.y;
      return `C ${fmt(cp1X)} ${fmt(cp1Y)} ${fmt(cp2X)} ${fmt(cp2Y)} ${fmt(start.x)} ${fmt(start.y)}`;
    }

    case 'round_nose': {
      const rx = (end.x - start.x);
      const ry = start.y - end.y;
      return `A ${fmt(rx)} ${fmt(ry)} 0 0 1 ${fmt(start.x)} ${fmt(start.y)}`;
    }

    case 'flat_nose': {
      return `L ${fmt(start.x)} ${fmt(start.y)}`;
    }

    default: {
      const cpX = start.x + (end.x - start.x) * 0.6;
      const cpY = start.y * 0.5 + end.y * 0.5;
      return `Q ${fmt(cpX)} ${fmt(cpY)} ${fmt(start.x)} ${fmt(start.y)}`;
    }
  }
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
  let ogiveStartIdx = -1;
  let ogiveEndIdx = -1;

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

  // Section 3: Ogive start marker
  ogiveStartIdx = points.length - 1; // Last body point

  // Section 4: Ogive end / meplat
  if (ogiveLength > 0) {
    // For profile points (LatheGeometry), we sample the ogive as discrete points
    const ogivePoints = generateOgiveProfilePoints(
      bearingEnd, bodyR, totalLength, meplatR, ogiveNormalized
    );
    // Add intermediate ogive points (skip first which overlaps bearing end)
    for (let i = 1; i < ogivePoints.length; i++) {
      points.push(ogivePoints[i]);
    }
    ogiveEndIdx = points.length - 1;
  } else {
    // No ogive section (e.g. wadcutter fully flat)
    points.push({ x: totalLength, y: meplatR });
    ogiveEndIdx = points.length - 1;
  }

  // Generate SVG path with bezier curves for ogive
  const svgPath = buildSvgPath(points, ogiveStartIdx, ogiveEndIdx, ogiveNormalized);

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
