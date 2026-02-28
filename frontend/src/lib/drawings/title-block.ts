/**
 * Title block data computation for technical drawings.
 * Returns data objects for rendering -- actual SVG rendering is in React components.
 * Pure computation -- no React or DOM dependencies.
 */

import { TitleBlockData } from './types';

/** Title block width in drawing coordinates (mm) */
export const TITLE_BLOCK_WIDTH = 60;

/** Title block height in drawing coordinates (mm) */
export const TITLE_BLOCK_HEIGHT = 15;

// ============================================================
// Title Block Computation
// ============================================================

/**
 * Compute title block data for rendering.
 *
 * @param name - Drawing name (e.g., ".308 Winchester - Remington 700")
 * @param drawingType - Type label (e.g., "Cross Section", "Chamber Detail", "Assembly")
 * @param scale - Numeric scale factor (e.g., 8 for "8:1")
 * @param style - Drawing style name
 * @returns TitleBlockData ready for rendering
 */
export function computeTitleBlock(
  name: string,
  drawingType: string,
  scale: number,
  style: 'blueprint' | 'modern'
): TitleBlockData {
  // Format scale text
  const scaleText = scale >= 1
    ? `Scale: ${scale}:1`
    : `Scale: 1:${Math.round(1 / scale)}`;

  // Format date
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD

  // Style display name
  const styleName = style === 'blueprint' ? 'Blueprint' : 'Modern';

  return {
    name,
    drawingType,
    scale: scaleText,
    date,
    style: styleName,
  };
}
