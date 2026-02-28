/**
 * Mesh builder: converts ProfilePoint[] arrays into Three.js geometries.
 * Pure computation library -- ZERO React imports.
 *
 * Used by the 3D cartridge viewer (Phase 13) to create revolution
 * solids from the same profile data that drives 2D SVG drawings.
 *
 * CRITICAL axis mapping:
 *   ProfilePoint.x (axial, mm) -> THREE.Vector2.y
 *   ProfilePoint.y (radial, mm) -> THREE.Vector2.x
 */

import * as THREE from 'three';
import type { ProfilePoint } from './types';

/**
 * Convert a ProfilePoint[] profile into a full-revolution LatheGeometry.
 *
 * @param points  Ordered profile points (x=axial, y=radial in mm)
 * @param segments  Number of radial segments (default 64 for smooth surface)
 * @returns THREE.LatheGeometry revolved 360 degrees around the axial axis
 */
export function profileToLatheGeometry(
  points: ProfilePoint[],
  segments: number = 64,
): THREE.LatheGeometry {
  const vectors = points.map(
    (p) => new THREE.Vector2(p.y, p.x), // radial -> x, axial -> y
  );
  return new THREE.LatheGeometry(vectors, segments);
}

/**
 * Convert a ProfilePoint[] profile into a half-revolution LatheGeometry
 * for cutaway / cross-section views.
 *
 * @param points  Ordered profile points (x=axial, y=radial in mm)
 * @param segments  Number of radial segments (default 32, half the full count)
 * @returns THREE.LatheGeometry revolved 180 degrees (phiLength = PI)
 */
export function profileToHalfLatheGeometry(
  points: ProfilePoint[],
  segments: number = 32,
): THREE.LatheGeometry {
  const vectors = points.map(
    (p) => new THREE.Vector2(p.y, p.x),
  );
  return new THREE.LatheGeometry(vectors, segments, 0, Math.PI);
}

/**
 * Create a simple cylinder geometry for the primer cup.
 *
 * @param primerDiameter  Primer cup outer diameter in mm
 * @param primerHeight    Primer cup height (depth) in mm
 * @returns THREE.CylinderGeometry centered at origin
 */
export function createPrimerGeometry(
  primerDiameter: number,
  primerHeight: number,
): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(
    primerDiameter / 2,
    primerDiameter / 2,
    primerHeight,
    32,
  );
}

/**
 * Create a cylinder geometry representing the powder charge fill level.
 * Only used when load data is available to show charge amount.
 *
 * @param caseInnerRadius  Inner radius of the case at the powder area in mm
 * @param fillHeight       Height of powder fill in mm
 * @returns THREE.CylinderGeometry centered at origin
 */
export function createPowderFillGeometry(
  caseInnerRadius: number,
  fillHeight: number,
): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(
    caseInnerRadius,
    caseInnerRadius,
    fillHeight,
    32,
  );
}
