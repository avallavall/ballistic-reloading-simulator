/**
 * Cartridge profile geometry generator.
 *
 * Generates both SVG path data and Three.js-compatible ProfilePoint arrays
 * from cartridge database dimensions. Handles missing fields gracefully
 * via heuristic estimation fallbacks.
 *
 * Pure TypeScript -- no React, no Three.js imports.
 */

import {
  CartridgeDimensions,
  GeometryResult,
  ProfilePoint,
} from './types';

import {
  estimateShoulderAngle,
  estimateNeckLength,
  estimateBodyLength,
  estimateRimThickness,
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
 * Resolve a dimension: use actual value if non-null, otherwise estimate.
 * Tracks estimated field names for transparency.
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
 * Determine if cartridge is straight-wall (no shoulder taper).
 */
function isStraightWall(dims: CartridgeDimensions): boolean {
  if (dims.case_type != null) {
    const ct = dims.case_type.toLowerCase();
    if (ct.includes('straight') || ct === 'straight_wall') {
      return true;
    }
  }
  // Heuristic: if shoulder and neck diameter differ by less than 0.5mm
  if (dims.shoulder_diameter_mm != null && dims.neck_diameter_mm != null) {
    return Math.abs(dims.shoulder_diameter_mm - dims.neck_diameter_mm) < 0.5;
  }
  return false;
}

/**
 * Convert top-half profile points to a full closed cross-section SVG path.
 * Top half goes left-to-right, bottom half mirrors right-to-left.
 */
function profileToSvgPath(topPoints: ProfilePoint[]): string {
  if (topPoints.length < 2) return '';

  // Top half: left to right
  const parts: string[] = [];
  parts.push(`M ${topPoints[0].x.toFixed(3)} ${(-topPoints[0].y).toFixed(3)}`);
  for (let i = 1; i < topPoints.length; i++) {
    parts.push(`L ${topPoints[i].x.toFixed(3)} ${(-topPoints[i].y).toFixed(3)}`);
  }

  // Bottom half: right to left (mirrored y)
  for (let i = topPoints.length - 1; i >= 0; i--) {
    parts.push(`L ${topPoints[i].x.toFixed(3)} ${topPoints[i].y.toFixed(3)}`);
  }

  parts.push('Z');
  return parts.join(' ');
}

/**
 * Generate cartridge profile from dimensions.
 *
 * Coordinate system:
 * - x = 0 at case head (rim back face)
 * - y = radial distance from centerline (positive = top half)
 * - All units in mm
 *
 * Profile points (top half, for LatheGeometry):
 *   1. Rim outer edge -> rim face -> extractor groove (simplified step)
 *   2. Body cylinder
 *   3. Shoulder taper (bottleneck) or direct to neck (straight-wall)
 *   4. Neck to case mouth
 */
export function generateCartridgeProfile(dims: CartridgeDimensions): GeometryResult {
  // Check required fields
  if (dims.case_length_mm == null || dims.base_diameter_mm == null || dims.neck_diameter_mm == null) {
    return insufficientResult();
  }

  const caseLength = dims.case_length_mm;
  const baseR = dims.base_diameter_mm / 2;
  const neckR = dims.neck_diameter_mm / 2;

  const estimatedFields: string[] = [];
  const straightWall = isStraightWall(dims);

  // Resolve optional dimensions with estimation fallbacks
  const rimR = resolve(
    'rim_diameter_mm',
    dims.rim_diameter_mm != null ? dims.rim_diameter_mm / 2 : null,
    () => baseR, // rimless: rim = base diameter
    estimatedFields
  ) ?? baseR;

  const rimThickness = resolve(
    'rim_thickness_mm',
    dims.rim_thickness_mm,
    () => estimateRimThickness(dims),
    estimatedFields
  ) ?? 1.3;

  const neckLength = resolve(
    'neck_length_mm',
    dims.neck_length_mm,
    () => estimateNeckLength(dims),
    estimatedFields
  );

  const bodyLength = resolve(
    'body_length_mm',
    dims.body_length_mm,
    () => estimateBodyLength(dims),
    estimatedFields
  );

  // Shoulder diameter: for bottleneck, use provided or fallback to base diameter
  const shoulderR = straightWall
    ? neckR
    : (dims.shoulder_diameter_mm != null ? dims.shoulder_diameter_mm / 2 : baseR);

  if (!straightWall && dims.shoulder_diameter_mm == null) {
    estimatedFields.push('shoulder_diameter_mm');
  }

  // Shoulder angle (only matters for bottleneck)
  let shoulderAngleDeg: number | null = null;
  if (!straightWall) {
    shoulderAngleDeg = resolve(
      'shoulder_angle_deg',
      dims.shoulder_angle_deg,
      () => estimateShoulderAngle(dims),
      estimatedFields
    );
  }

  // Build profile points (top half)
  const points: ProfilePoint[] = [];

  // Point 1: Rim back face, outer edge
  points.push({ x: 0, y: rimR });

  // Point 2: Rim front face, outer edge
  points.push({ x: rimThickness, y: rimR });

  // Point 3: Step to base/body diameter (extractor groove simplified as step)
  points.push({ x: rimThickness, y: baseR });

  if (straightWall) {
    // Straight-wall: body runs full length from rim to case mouth
    const bodyEnd = caseLength;
    points.push({ x: bodyEnd, y: baseR });
  } else {
    // Bottleneck: body + shoulder taper + neck

    // Calculate body end position
    const effectiveNeckLen = neckLength ?? (dims.bore_diameter_mm ?? neckR * 2) * 0.8;

    let bodyEnd: number;
    if (bodyLength != null) {
      bodyEnd = rimThickness + bodyLength;
    } else {
      // Estimate: case_length - neck - shoulder transition
      const shoulderTransition = shoulderAngleDeg != null && shoulderAngleDeg > 0
        ? (shoulderR - neckR) / Math.tan(shoulderAngleDeg * Math.PI / 180)
        : 4.0; // default shoulder region ~4mm
      bodyEnd = caseLength - effectiveNeckLen - shoulderTransition;
      // Floor: at least rimThickness + 40% of case
      bodyEnd = Math.max(bodyEnd, rimThickness + caseLength * 0.4);
    }

    // Point 4: Body end / shoulder start
    points.push({ x: bodyEnd, y: shoulderR });

    // Point 5: Shoulder taper end / neck start
    let shoulderEndX: number;
    if (shoulderAngleDeg != null && shoulderAngleDeg > 0) {
      const shoulderRun = (shoulderR - neckR) / Math.tan(shoulderAngleDeg * Math.PI / 180);
      shoulderEndX = bodyEnd + shoulderRun;
    } else {
      // Default: linear taper over remaining space minus neck
      shoulderEndX = caseLength - effectiveNeckLen;
    }

    // Clamp shoulder end to not exceed case length
    shoulderEndX = Math.min(shoulderEndX, caseLength - 1.0);

    points.push({ x: shoulderEndX, y: neckR });

    // Point 6: Case mouth
    points.push({ x: caseLength, y: neckR });
  }

  // Generate SVG path (full cross-section for 2D drawing)
  const svgPath = profileToSvgPath(points);

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
 * Classify data completeness based on number of estimated fields.
 */
function classifyCompleteness(estimatedCount: number): 'full' | 'basic' | 'insufficient' {
  if (estimatedCount === 0) return 'full';
  if (estimatedCount <= 3) return 'basic';
  return 'insufficient';
}
