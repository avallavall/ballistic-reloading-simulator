/**
 * Drawing theme configurations for 2D SVG technical drawings.
 * Blueprint (dark navy) and Modern (clean white) styles.
 */

import { DrawingTheme } from './types';

/**
 * Blueprint theme: deep navy background, white-blue lines, monospace font.
 * Inspired by traditional engineering blueprint paper.
 * Uses outline-only rendering with hatching patterns for material distinction.
 */
export const blueprintTheme: DrawingTheme = {
  name: 'Blueprint',
  background: '#1a1f3a',
  outline: '#e0e8ff',
  hiddenEdge: '#5566aa',
  dimColor: '#a0c0ff',
  textColor: '#e0e8ff',
  hatchColor: '#7088cc',
  caseFill: 'none',          // Outline only with hatching
  copperFill: 'none',        // Outline only with hatching
  leadColor: '#5566aa',
  powderFill: 'none',        // Dot hatching pattern
  steelFill: 'none',         // Outline only with hatching
  titleBlockBg: '#141830',
  titleBlockBorder: '#7088cc',
  fontFamily: '"Courier New", Courier, monospace',
  dimFontSize: 2.8,
  titleFontSize: 3.0,
};

/**
 * Modern theme: white background, dark outlines, material-colored fills.
 * Clean technical drawing style with color-coded materials.
 */
export const modernTheme: DrawingTheme = {
  name: 'Modern',
  background: '#ffffff',
  outline: '#333333',
  hiddenEdge: '#bbbbbb',
  dimColor: '#444444',
  textColor: '#333333',
  hatchColor: '#999999',
  caseFill: '#d4a94c',       // Gold/amber for brass case
  copperFill: '#b87333',     // Copper tone for jacket
  leadColor: '#4a4a4a',      // Dark gray for lead core
  powderFill: '#8b7355',     // Brown for powder charge
  steelFill: '#a0a0a0',      // Medium gray for steel/barrel
  titleBlockBg: '#f5f5f5',
  titleBlockBorder: '#333333',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  dimFontSize: 2.8,
  titleFontSize: 3.0,
};

/**
 * Get theme by style name.
 */
export function getTheme(style: 'blueprint' | 'modern'): DrawingTheme {
  return style === 'blueprint' ? blueprintTheme : modernTheme;
}
