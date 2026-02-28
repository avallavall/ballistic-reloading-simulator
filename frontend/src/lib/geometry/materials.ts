/**
 * PBR material parameter definitions for 3D cartridge rendering.
 * Pure data library -- ZERO React imports.
 *
 * These are plain parameter objects, NOT Three.js material instances.
 * Actual MeshStandardMaterial objects must be created in React components
 * (within the R3F Canvas context) using these values.
 */

/** PBR material parameter set for MeshStandardMaterial */
export interface MaterialParams {
  color: string;
  metalness: number;
  roughness: number;
}

/** PBR material presets for all cartridge component materials */
export const MATERIALS: Record<string, MaterialParams> = {
  brass:  { color: '#B5A642', metalness: 0.85, roughness: 0.25 },
  copper: { color: '#B87333', metalness: 0.80, roughness: 0.30 },
  lead:   { color: '#4A4A4A', metalness: 0.30, roughness: 0.70 },
  nickel: { color: '#C0C0C0', metalness: 0.90, roughness: 0.15 },
  powder: { color: '#2D2D2D', metalness: 0.00, roughness: 0.95 },
};

/** Bullet material pair: jacket exterior + core interior */
export interface BulletMaterials {
  jacket: MaterialParams;
  core: MaterialParams;
}

/**
 * Determine jacket and core materials based on bullet type string.
 *
 * @param bulletType  Bullet type from DB (e.g. "FMJ", "HP", "Solid Copper", null)
 * @returns Jacket and core MaterialParams pair
 */
export function getBulletMaterials(bulletType: string | null): BulletMaterials {
  if (bulletType == null) {
    return { jacket: MATERIALS.copper, core: MATERIALS.lead };
  }

  const lower = bulletType.toLowerCase();

  // Solid copper bullets (monolithic): same material throughout
  if (lower.includes('solid') && lower.includes('copper')) {
    return { jacket: MATERIALS.copper, core: MATERIALS.copper };
  }

  // Hollow point: copper jacket, lead core (core exposed at tip)
  if (lower.includes('hp') || lower.includes('hollow')) {
    return { jacket: MATERIALS.copper, core: MATERIALS.lead };
  }

  // Default (FMJ and others): copper jacket over lead core
  return { jacket: MATERIALS.copper, core: MATERIALS.lead };
}

/** Colors for cutaway / cross-section face rendering */
export const CUTAWAY_COLORS: Record<string, string> = {
  brassWall: '#C4A44A',      // Slightly brighter brass for cross-section face
  powderSpace: '#3D3D3D',    // Dark gray for powder cavity
  bulletCore: '#5A5A5A',     // Visible lead core in cutaway
  bulletJacket: '#C08040',   // Copper jacket cross-section
};
