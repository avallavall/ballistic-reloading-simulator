/**
 * Shared geometry types for 2D SVG and 3D viewer.
 * Pure data structures -- no framework dependencies.
 *
 * Used by both Phase 12 (2D SVG drawings) and Phase 13 (3D viewer)
 * to guarantee 2D and 3D representations match exactly.
 */

export interface ProfilePoint {
  x: number;  // mm, axial position (0 = case head / bullet base)
  y: number;  // mm, radial position (half-diameter from centerline)
}

export interface GeometryResult {
  /** SVG path 'd' attribute string (M/L/C/Q/Z commands) */
  svgPath: string;
  /** Ordered profile points for Three.js LatheGeometry (Vector2 compatible) */
  profilePoints: ProfilePoint[];
  /** Field names that were estimated rather than from DB data */
  estimatedFields: string[];
  /** Data completeness tier for graceful degradation */
  dataCompleteness: 'full' | 'basic' | 'insufficient';
}

/** Cartridge dimension inputs for geometry generation */
export interface CartridgeDimensions {
  // Required core dimensions (insufficient without these)
  case_length_mm: number | null;
  base_diameter_mm: number | null;
  neck_diameter_mm: number | null;
  // Important optional dimensions
  bore_diameter_mm: number | null;
  groove_diameter_mm: number | null;
  rim_diameter_mm: number | null;
  shoulder_diameter_mm: number | null;
  // Drawing-precision fields (new in Phase 11)
  shoulder_angle_deg: number | null;
  neck_length_mm: number | null;
  body_length_mm: number | null;
  rim_thickness_mm: number | null;
  case_type: string | null;
}

/** Bullet dimension inputs for geometry generation */
export interface BulletDimensions {
  // Required core dimensions (insufficient without these)
  diameter_mm: number | null;
  length_mm: number | null;
  weight_grains: number | null;
  // Rendering fields (new in Phase 11)
  bearing_surface_mm: number | null;
  boat_tail_length_mm: number | null;
  meplat_diameter_mm: number | null;
  ogive_type: string | null;
  // Context for estimation
  material: string | null;
  bullet_type: string | null;
  base_type: string | null;
}
