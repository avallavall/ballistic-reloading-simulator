'use client';

/**
 * Cartridge cross-section SVG technical drawing.
 * Shows case wall, primer pocket, powder area, and optional seated bullet
 * with hatching patterns and dual-unit dimension labels.
 */

import React, { forwardRef, useMemo } from 'react';
import { Cartridge, Bullet } from '@/lib/types';
import { DrawingTheme, DimensionAnnotation } from '@/lib/drawings/types';
import { getTheme } from '@/lib/drawings/themes';
import { generateCartridgeProfile } from '@/lib/geometry/cartridge-geometry';
import { generateBulletProfile } from '@/lib/geometry/bullet-geometry';
import { CartridgeDimensions, BulletDimensions } from '@/lib/geometry/types';
import { layoutDimensions } from '@/lib/drawings/dimension-layout';
import { computeTitleBlock, TITLE_BLOCK_WIDTH, TITLE_BLOCK_HEIGHT } from '@/lib/drawings/title-block';
import HatchPatterns from './HatchPatterns';
import DimensionLabel from './DimensionLabel';
import TitleBlock from './TitleBlock';

interface CartridgeCrossSectionProps {
  cartridge: Cartridge;
  bullet?: Bullet;
  style: 'blueprint' | 'modern';
}

/**
 * Map Cartridge entity to CartridgeDimensions for the geometry engine.
 */
function toCartridgeDims(c: Cartridge): CartridgeDimensions {
  return {
    case_length_mm: c.case_length_mm,
    base_diameter_mm: c.base_diameter_mm,
    neck_diameter_mm: c.neck_diameter_mm,
    bore_diameter_mm: c.bore_diameter_mm,
    groove_diameter_mm: c.groove_diameter_mm,
    rim_diameter_mm: c.rim_diameter_mm,
    shoulder_diameter_mm: c.shoulder_diameter_mm,
    shoulder_angle_deg: c.shoulder_angle_deg,
    neck_length_mm: c.neck_length_mm,
    body_length_mm: c.body_length_mm,
    rim_thickness_mm: c.rim_thickness_mm,
    case_type: c.case_type,
  };
}

/**
 * Map Bullet entity to BulletDimensions for the geometry engine.
 */
function toBulletDims(b: Bullet): BulletDimensions {
  return {
    diameter_mm: b.diameter_mm,
    length_mm: b.length_mm,
    weight_grains: b.weight_grains,
    bearing_surface_mm: b.bearing_surface_mm,
    boat_tail_length_mm: b.boat_tail_length_mm,
    meplat_diameter_mm: b.meplat_diameter_mm,
    ogive_type: b.ogive_type,
    material: b.material,
    bullet_type: b.bullet_type,
    base_type: b.base_type,
  };
}

/** Case wall thickness for cross-section visualization (mm) */
const CASE_WALL_THICKNESS = 0.8;

const CartridgeCrossSection = forwardRef<SVGSVGElement, CartridgeCrossSectionProps>(
  function CartridgeCrossSection(
    { cartridge, bullet, style },
    ref
  ) {
    const theme = getTheme(style);

    const result = useMemo(() => {
      const dims = toCartridgeDims(cartridge);
      return generateCartridgeProfile(dims);
    }, [cartridge]);

    const bulletResult = useMemo(() => {
      if (!bullet) return null;
      const dims = toBulletDims(bullet);
      return generateBulletProfile(dims);
    }, [bullet]);

    // If insufficient data, return null (parent handles CompletenessBanner)
    if (result.dataCompleteness === 'insufficient') {
      return null;
    }

    // Drawing dimensions in mm coordinate system
    const caseLength = cartridge.case_length_mm;
    const oal = cartridge.overall_length_mm || caseLength;
    const baseR = (cartridge.base_diameter_mm ?? cartridge.groove_diameter_mm) / 2;
    const neckR = (cartridge.neck_diameter_mm ?? cartridge.bore_diameter_mm) / 2;
    const rimR = (cartridge.rim_diameter_mm ?? cartridge.base_diameter_mm ?? cartridge.groove_diameter_mm) / 2;
    const maxR = Math.max(baseR, rimR, neckR);

    // Padding for dimensions (generous to avoid overlap with labels)
    const padLeft = 45;
    const padRight = 15;
    const padTop = 40;
    const padBottom = 25 + TITLE_BLOCK_HEIGHT;

    // viewBox dimensions (in mm) — title block placed below, not to the right
    const contentWidth = oal + padLeft + padRight;
    const drawingWidth = Math.max(contentWidth, TITLE_BLOCK_WIDTH + padRight);
    const drawingHeight = maxR * 2 + padTop + padBottom;

    // Build dimension annotations
    const annotations = useMemo(() => {
      const dims: DimensionAnnotation[] = [];
      const estimatedSet = new Set(result.estimatedFields);

      // Top side: length dimensions
      // Overall length
      dims.push({
        x1: 0, y1: -maxR,
        x2: oal, y2: -maxR,
        value_mm: oal,
        label: 'Overall Length',
        side: 'top',
        offset_tier: 1,
      });

      // Case length
      dims.push({
        x1: 0, y1: -maxR,
        x2: caseLength, y2: -maxR,
        value_mm: caseLength,
        label: 'Case Length',
        side: 'top',
        offset_tier: 1,
      });

      // Body length (if available)
      if (cartridge.body_length_mm != null) {
        const rimThick = cartridge.rim_thickness_mm ?? 1.3;
        dims.push({
          x1: rimThick, y1: -maxR,
          x2: rimThick + cartridge.body_length_mm, y2: -maxR,
          value_mm: cartridge.body_length_mm,
          label: 'Body Length',
          side: 'top',
          offset_tier: 1,
        });
      }

      // Neck length (if available)
      if (cartridge.neck_length_mm != null) {
        dims.push({
          x1: caseLength - cartridge.neck_length_mm, y1: -maxR,
          x2: caseLength, y2: -maxR,
          value_mm: cartridge.neck_length_mm,
          label: 'Neck Length',
          side: 'top',
          offset_tier: 1,
        });
      }

      // Left side: rim/base diameter
      if (cartridge.rim_diameter_mm != null) {
        dims.push({
          x1: 0, y1: -rimR,
          x2: 0, y2: rimR,
          value_mm: cartridge.rim_diameter_mm,
          label: 'Rim Dia.',
          side: 'left',
          offset_tier: 1,
        });
      }

      if (cartridge.base_diameter_mm != null) {
        const rimThick = cartridge.rim_thickness_mm ?? 1.3;
        dims.push({
          x1: rimThick + 1, y1: -baseR,
          x2: rimThick + 1, y2: baseR,
          value_mm: cartridge.base_diameter_mm,
          label: 'Base Dia.',
          side: 'left',
          offset_tier: 1,
        });
      }

      // Right side: neck/bore diameter
      if (cartridge.neck_diameter_mm != null) {
        dims.push({
          x1: caseLength, y1: -neckR,
          x2: caseLength, y2: neckR,
          value_mm: cartridge.neck_diameter_mm,
          label: 'Neck Dia.',
          side: 'right',
          offset_tier: 1,
        });
      }

      // Mark estimated dimensions
      return dims.map(d => ({
        ...d,
        // If label text (lower case, no spaces) matches an estimated field, mark it
        isEstimated: d.label ? estimatedSet.has(
          d.label.toLowerCase().replace(/[.\s]/g, '_').replace('dia_', 'diameter_') + '_mm'
        ) : false,
      }));
    }, [cartridge, result, maxR, oal, caseLength, baseR, neckR, rimR]);

    const layoutedDims = useMemo(() => {
      return layoutDimensions(
        annotations as DimensionAnnotation[],
        { width: drawingWidth, height: drawingHeight }
      );
    }, [annotations, drawingWidth, drawingHeight]);

    // Title block data
    const titleBlockData = useMemo(() => {
      return computeTitleBlock(cartridge.name);
    }, [cartridge.name]);

    // Build inner case wall path (inset from outer profile)
    const innerWallPath = useMemo(() => {
      const rimThick = cartridge.rim_thickness_mm ?? 1.3;
      const webThickness = CASE_WALL_THICKNESS + 1.5; // thicker at base
      const innerBaseR = baseR - CASE_WALL_THICKNESS;
      const innerNeckR = neckR - CASE_WALL_THICKNESS;
      const innerShoulderR = cartridge.shoulder_diameter_mm != null
        ? (cartridge.shoulder_diameter_mm / 2 - CASE_WALL_THICKNESS)
        : innerBaseR;

      const neckLen = cartridge.neck_length_mm ?? caseLength * 0.15;
      const bodyLen = cartridge.body_length_mm ?? (caseLength - neckLen) * 0.7;
      const bodyEnd = rimThick + bodyLen;
      const shoulderEndX = caseLength - neckLen;

      // Top half inner wall
      const pts = [
        `M ${(rimThick + webThickness).toFixed(2)} ${(-innerBaseR).toFixed(2)}`,
        `L ${bodyEnd.toFixed(2)} ${(-innerBaseR).toFixed(2)}`,
        `L ${shoulderEndX.toFixed(2)} ${(-innerShoulderR).toFixed(2)}`,
        `L ${shoulderEndX.toFixed(2)} ${(-innerNeckR).toFixed(2)}`,
        `L ${caseLength.toFixed(2)} ${(-innerNeckR).toFixed(2)}`,
        // Mirror bottom
        `L ${caseLength.toFixed(2)} ${innerNeckR.toFixed(2)}`,
        `L ${shoulderEndX.toFixed(2)} ${innerNeckR.toFixed(2)}`,
        `L ${shoulderEndX.toFixed(2)} ${innerShoulderR.toFixed(2)}`,
        `L ${bodyEnd.toFixed(2)} ${innerBaseR.toFixed(2)}`,
        `L ${(rimThick + webThickness).toFixed(2)} ${innerBaseR.toFixed(2)}`,
        'Z',
      ];
      return pts.join(' ');
    }, [cartridge, baseR, neckR, caseLength]);

    return (
      <svg
        ref={ref}
        viewBox={`${-padLeft} ${-(maxR + padTop)} ${drawingWidth} ${drawingHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', maxHeight: '70vh' }}
      >
        <defs>
          <HatchPatterns theme={theme} />
        </defs>

        {/* Background */}
        <rect
          x={-padLeft}
          y={-(maxR + padTop)}
          width={drawingWidth}
          height={drawingHeight}
          fill={theme.background}
        />

        {/* Drawing group centered on case centerline */}
        <g transform={`translate(0, 0)`}>
          {/* Case outer profile */}
          <path
            d={result.svgPath}
            fill={theme.caseFill === 'none' ? 'url(#hatch-brass)' : theme.caseFill}
            stroke={theme.outline}
            strokeWidth={theme.outlineStrokeWidth}
          />

          {/* Inner case wall (powder chamber) */}
          <path
            d={innerWallPath}
            fill={theme.powderFill === 'none' ? 'url(#hatch-powder)' : theme.powderFill}
            stroke={theme.hiddenEdge}
            strokeWidth={theme.thinStrokeWidth}
            strokeDasharray="1.5,0.5"
          />

          {/* Primer pocket and flash hole (cross-section view) */}
          {(() => {
            const rimThick = cartridge.rim_thickness_mm ?? 1.3;
            const baseDia = cartridge.base_diameter_mm ?? cartridge.groove_diameter_mm;
            const isLargeRifle = baseDia > 10;
            const pocketR = isLargeRifle ? 2.5 : 2.25;   // ~5.0mm / ~4.5mm diameter
            const pocketDepth = isLargeRifle ? 3.3 : 2.9;
            const flashR = isLargeRifle ? 0.8 : 0.75;     // ~1.6mm / ~1.5mm diameter
            const flashDepth = 1.2; // web thickness beyond pocket
            const pocketX = rimThick - pocketDepth; // pocket opens at case head face
            return (
              <g>
                {/* Primer pocket recess */}
                <rect
                  x={pocketX < 0 ? 0 : pocketX}
                  y={-pocketR}
                  width={pocketDepth - (pocketX < 0 ? -pocketX : 0)}
                  height={pocketR * 2}
                  fill={theme.background}
                  stroke={theme.hiddenEdge}
                  strokeWidth={theme.thinStrokeWidth}
                />
                {/* Flash hole (connects pocket to powder chamber) */}
                <rect
                  x={rimThick}
                  y={-flashR}
                  width={flashDepth}
                  height={flashR * 2}
                  fill={theme.powderFill === 'none' ? 'url(#hatch-powder)' : theme.powderFill}
                  stroke={theme.hiddenEdge}
                  strokeWidth={theme.thinStrokeWidth}
                />
              </g>
            );
          })()}

          {/* Case web thickness line (hidden edge) */}
          <line
            x1={cartridge.rim_thickness_mm ?? 1.3}
            y1={-baseR + CASE_WALL_THICKNESS}
            x2={cartridge.rim_thickness_mm ?? 1.3}
            y2={baseR - CASE_WALL_THICKNESS}
            stroke={theme.hiddenEdge}
            strokeWidth={theme.thinStrokeWidth}
            strokeDasharray="2,1"
          />

          {/* Bullet (if provided and profile is valid) */}
          {bulletResult && bulletResult.dataCompleteness !== 'insufficient' && (
            <g transform={`translate(${caseLength}, 0)`}>
              {/* Bullet lead core (inner, slightly inset) */}
              <path
                d={bulletResult.svgPath}
                fill={theme.leadColor === 'none' ? 'url(#fill-lead)' : theme.leadColor}
                stroke="none"
                transform={`translate(${-(bullet?.length_mm ?? oal - caseLength) * 0.5}, 0)`}
              />
              {/* Bullet copper jacket (outer) */}
              <path
                d={bulletResult.svgPath}
                fill={theme.copperFill === 'none' ? 'url(#hatch-copper)' : theme.copperFill}
                stroke={theme.outline}
                strokeWidth={theme.outlineStrokeWidth}
                opacity={0.85}
                transform={`translate(${-(bullet?.length_mm ?? oal - caseLength) * 0.5}, 0)`}
              />
            </g>
          )}

          {/* Centerline */}
          <line
            x1={-3}
            y1={0}
            x2={oal + 3}
            y2={0}
            stroke={theme.dimColor}
            strokeWidth={0.15}
            strokeDasharray="4,1,1,1"
            opacity={0.5}
          />
        </g>

        {/* Dimension annotations */}
        <g>
          {layoutedDims.map((dim, idx) => (
            <DimensionLabel
              key={idx}
              x1={dim.x1}
              y1={dim.y1}
              x2={dim.x2}
              y2={dim.y2}
              value_mm={dim.value_mm}
              label={dim.label}
              offset_tier={dim.offset_tier}
              side={dim.side}
              theme={theme}
              isEstimated={(dim as DimensionAnnotation & { isEstimated?: boolean }).isEstimated}
            />
          ))}
        </g>

        {/* Title block */}
        <TitleBlock
          x={drawingWidth - padLeft - TITLE_BLOCK_WIDTH}
          y={maxR + padBottom - TITLE_BLOCK_HEIGHT - 3}
          data={titleBlockData}
          theme={theme}
        />
      </svg>
    );
  }
);

export default CartridgeCrossSection;
