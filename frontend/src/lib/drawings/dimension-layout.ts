/**
 * Smart dimension annotation layout algorithm.
 * Assigns stagger tiers to prevent overlapping dimension lines.
 * Pure computation -- no React or DOM dependencies.
 */

import { DimensionAnnotation } from './types';

/** Spacing between stagger tiers (mm in drawing coordinates) */
export const TIER_SPACING_MM = 4;

/** Distance from the outline to the first tier (mm) */
export const BASE_OFFSET_MM = 6;

/** Approximate character width as fraction of font size */
const CHAR_WIDTH_FACTOR = 0.6;

/** Default dimension font size (mm) -- matches theme dimFontSize */
const DEFAULT_DIM_FONT_SIZE = 2.0;

// ============================================================
// Interval type for overlap detection
// ============================================================

interface Interval {
  start: number;
  end: number;
}

// ============================================================
// Core Algorithm
// ============================================================

/**
 * Layout dimension annotations with non-overlapping stagger tiers.
 *
 * Algorithm:
 * 1. Separate annotations by side (top, bottom, left, right)
 * 2. Sort each group by position (x for top/bottom, y for left/right)
 * 3. Greedy interval scheduling: assign each annotation to the lowest tier
 *    where its text interval doesn't overlap any existing annotation
 * 4. Return annotations with offset_tier populated
 *
 * @param annotations - Array of dimension annotations (offset_tier may be unset)
 * @param _drawingBounds - Drawing bounds for reference (reserved for future use)
 * @param dimFontSize - Font size for estimating text width (default: 2.0mm)
 * @returns Annotations with offset_tier assigned
 */
export function layoutDimensions(
  annotations: DimensionAnnotation[],
  _drawingBounds: { width: number; height: number },
  dimFontSize: number = DEFAULT_DIM_FONT_SIZE
): DimensionAnnotation[] {
  if (annotations.length === 0) return [];

  // Group by side
  const groups: Record<string, DimensionAnnotation[]> = {
    top: [],
    bottom: [],
    left: [],
    right: [],
  };

  for (const ann of annotations) {
    if (groups[ann.side]) {
      groups[ann.side].push({ ...ann });
    }
  }

  const result: DimensionAnnotation[] = [];

  // Process each group independently
  for (const side of ['top', 'bottom', 'left', 'right'] as const) {
    const group = groups[side];
    if (group.length === 0) continue;

    // Sort by position: x for horizontal sides, y for vertical sides
    const isHorizontal = side === 'top' || side === 'bottom';
    group.sort((a, b) => {
      if (isHorizontal) {
        return Math.min(a.x1, a.x2) - Math.min(b.x1, b.x2);
      }
      return Math.min(a.y1, a.y2) - Math.min(b.y1, b.y2);
    });

    // Greedy interval scheduling per tier
    const tierOccupied: Interval[][] = []; // tierOccupied[tier] = occupied intervals

    for (const ann of group) {
      // Estimate text width from label length
      const labelText = ann.label || `${ann.value_mm.toFixed(2)}`;
      const textWidth = labelText.length * dimFontSize * CHAR_WIDTH_FACTOR;
      const margin = 1.0; // mm padding on each side

      // Compute the interval this annotation occupies
      let intervalStart: number;
      let intervalEnd: number;

      if (isHorizontal) {
        const midX = (ann.x1 + ann.x2) / 2;
        intervalStart = midX - textWidth / 2 - margin;
        intervalEnd = midX + textWidth / 2 + margin;
      } else {
        const midY = (ann.y1 + ann.y2) / 2;
        intervalStart = midY - textWidth / 2 - margin;
        intervalEnd = midY + textWidth / 2 + margin;
      }

      // Find the lowest tier where this interval fits
      let assignedTier = -1;
      for (let tier = 0; tier < tierOccupied.length; tier++) {
        const overlaps = tierOccupied[tier].some(
          (existing) => intervalStart < existing.end && intervalEnd > existing.start
        );
        if (!overlaps) {
          assignedTier = tier;
          break;
        }
      }

      // If no existing tier fits, create a new one
      if (assignedTier === -1) {
        assignedTier = tierOccupied.length;
        tierOccupied.push([]);
      }

      // Record the occupied interval
      tierOccupied[assignedTier].push({ start: intervalStart, end: intervalEnd });

      // Assign tier (1-based for display)
      result.push({
        ...ann,
        offset_tier: assignedTier + 1,
      });
    }
  }

  return result;
}
