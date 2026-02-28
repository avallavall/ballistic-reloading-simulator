/**
 * Title block data computation for technical drawings.
 * Returns data objects for rendering -- actual SVG rendering is in React components.
 * Pure computation -- no React or DOM dependencies.
 */

import { TitleBlockData } from './types';

/** Title block width in drawing coordinates (mm) */
export const TITLE_BLOCK_WIDTH = 60;

/** Title block height in drawing coordinates (mm) */
export const TITLE_BLOCK_HEIGHT = 7;

// ============================================================
// Title Block Computation
// ============================================================

/**
 * Compute title block data for rendering.
 *
 * @param name - Drawing name (e.g., ".308 Winchester")
 * @returns TitleBlockData ready for rendering
 */
export function computeTitleBlock(name: string): TitleBlockData {
  return { name };
}
