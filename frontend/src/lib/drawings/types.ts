/**
 * Central type definitions for 2D SVG technical drawings.
 * Pure data structures -- no React/framework dependencies.
 */

// ============================================================
// Theme
// ============================================================

export interface DrawingTheme {
  name: string;
  background: string;
  outline: string;
  hiddenEdge: string;
  dimColor: string;
  textColor: string;
  hatchColor: string;
  caseFill: string;
  copperFill: string;
  leadColor: string;
  powderFill: string;
  steelFill: string;
  titleBlockBg: string;
  titleBlockBorder: string;
  fontFamily: string;
  dimFontSize: number;    // SVG user units (mm)
  titleFontSize: number;  // SVG user units (mm)
  outlineStrokeWidth: number;  // Main profile outlines (mm)
  thinStrokeWidth: number;     // Secondary lines: inner walls, hidden edges (mm)
  dimStrokeWidth: number;      // Dimension/extension lines (mm)
}

// ============================================================
// Dimension Annotations
// ============================================================

export interface DimensionAnnotation {
  /** Start point x (mm) */
  x1: number;
  /** Start point y (mm) */
  y1: number;
  /** End point x (mm) */
  x2: number;
  /** End point y (mm) */
  y2: number;
  /** Dimension value in mm */
  value_mm: number;
  /** Display label (e.g., "Case Length") */
  label: string;
  /** Which side of the drawing to place the annotation */
  side: 'top' | 'bottom' | 'left' | 'right';
  /** Stagger tier for non-overlapping layout (1, 2, 3, ...) */
  offset_tier: number;
}

// ============================================================
// Drawing Configuration
// ============================================================

export interface DrawingConfig {
  /** SVG viewport width (mm) */
  width: number;
  /** SVG viewport height (mm) */
  height: number;
  /** Padding around drawing content (mm) */
  padding_mm: number;
  /** Visual style */
  style: 'blueprint' | 'modern';
  /** Whether to show estimated/derived dimensions with dashed lines */
  showEstimated: boolean;
}

// ============================================================
// Chamber Clearances
// ============================================================

export interface ChamberClearances {
  /** Gap between case head and bolt face (mm) */
  headspace_gap_mm: number;
  /** Radial clearance between case neck and chamber neck (mm) */
  neck_clearance_mm: number;
  /** Radial clearance between case body and chamber body (mm) */
  body_clearance_mm: number;
  /** Unrifled lead length before rifling engagement (mm) */
  freebore_mm: number;
  /** Angle of the throat/leade (degrees) */
  throat_angle_deg: number;
  /** Length of bullet engaged with rifling (mm) */
  rifling_engagement_mm: number;
  /** Field names that were estimated rather than from user/DB data */
  estimated_fields: string[];
}

// ============================================================
// Assembly Layout
// ============================================================

export interface AssemblyLayout {
  /** X position of cartridge origin in drawing coords (mm) */
  cartridge_x: number;
  /** Scale factor applied to cartridge geometry */
  cartridge_scale: number;
  /** X position where barrel cylinder starts (mm) */
  barrel_start_x: number;
  /** X position where barrel cylinder ends (mm) */
  barrel_end_x: number;
  /** Barrel outer radius (mm) */
  barrel_outer_r: number;
  /** Barrel bore radius (mm) */
  barrel_bore_r: number;
  /** X position of bullet tip (mm) */
  bullet_tip_x: number;
  /** Total width of the drawing content (mm) */
  total_width_mm: number;
  /** Total height of the drawing content (mm) */
  total_height_mm: number;
}

// ============================================================
// Title Block
// ============================================================

export interface TitleBlockData {
  /** Drawing name (e.g., ".308 Winchester") */
  name: string;
}

// ============================================================
// Export
// ============================================================

export type ExportFormat = 'png' | 'svg' | 'pdf';

// ============================================================
// Drawing Tabs
// ============================================================

export type DrawingTab = 'cross-section' | 'chamber' | 'assembly';
