/**
 * SVG hatching pattern definitions for material cross-sections.
 * Returns pure data objects that React components can render as <pattern> elements.
 * No React or DOM dependencies.
 */

import { DrawingTheme } from './types';

// ============================================================
// Types
// ============================================================

export interface HatchPatternElement {
  type: 'line' | 'circle' | 'rect';
  attrs: Record<string, string | number>;
}

export interface HatchPatternDef {
  /** Pattern ID for use in fill="url(#id)" */
  id: string;
  /** Pattern tile width */
  width: number;
  /** Pattern tile height */
  height: number;
  /** SVG patternUnits attribute */
  patternUnits: string;
  /** Optional pattern rotation/transform */
  patternTransform?: string;
  /** SVG elements composing the pattern tile */
  elements: HatchPatternElement[];
}

// ============================================================
// Pattern Generator
// ============================================================

/**
 * Generate hatching pattern definitions for all material types.
 * All patterns use userSpaceOnUse for correct scaling with transforms.
 *
 * @param theme - Current drawing theme (colors adapt to theme)
 * @returns Array of pattern definitions ready for SVG <defs>
 */
export function getHatchPatternDefs(theme: DrawingTheme): HatchPatternDef[] {
  const strokeColor = theme.hatchColor;

  return [
    // Metal hatching: 45-degree diagonal lines (ISO standard for metals)
    {
      id: 'hatch-metal',
      width: 6,
      height: 6,
      patternUnits: 'userSpaceOnUse',
      patternTransform: 'rotate(45)',
      elements: [
        {
          type: 'line',
          attrs: {
            x1: 0, y1: 0, x2: 0, y2: 6,
            stroke: strokeColor,
            'stroke-width': 0.25,
          },
        },
      ],
    },

    // Brass hatching: 45-degree diagonal lines (slightly tighter spacing)
    {
      id: 'hatch-brass',
      width: 5,
      height: 5,
      patternUnits: 'userSpaceOnUse',
      patternTransform: 'rotate(45)',
      elements: [
        {
          type: 'line',
          attrs: {
            x1: 0, y1: 0, x2: 0, y2: 5,
            stroke: theme.caseFill === 'none' ? strokeColor : theme.caseFill,
            'stroke-width': 0.25,
          },
        },
      ],
    },

    // Powder fill: dot/stipple pattern
    {
      id: 'hatch-powder',
      width: 4,
      height: 4,
      patternUnits: 'userSpaceOnUse',
      elements: [
        {
          type: 'circle',
          attrs: {
            cx: 2, cy: 2, r: 0.5,
            fill: theme.powderFill === 'none' ? strokeColor : theme.powderFill,
          },
        },
      ],
    },

    // Lead fill: solid fill rectangle
    {
      id: 'fill-lead',
      width: 4,
      height: 4,
      patternUnits: 'userSpaceOnUse',
      elements: [
        {
          type: 'rect',
          attrs: {
            x: 0, y: 0, width: 4, height: 4,
            fill: theme.leadColor,
          },
        },
      ],
    },

    // Copper hatching: 30-degree diagonal lines
    {
      id: 'hatch-copper',
      width: 5,
      height: 5,
      patternUnits: 'userSpaceOnUse',
      patternTransform: 'rotate(30)',
      elements: [
        {
          type: 'line',
          attrs: {
            x1: 0, y1: 0, x2: 0, y2: 5,
            stroke: theme.copperFill === 'none' ? strokeColor : theme.copperFill,
            'stroke-width': 0.25,
          },
        },
      ],
    },
  ];
}
