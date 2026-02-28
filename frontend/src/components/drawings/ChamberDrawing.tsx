'use client';

/**
 * Chamber SVG technical drawing.
 * Shows cartridge seated inside the chamber outline with headspace gap,
 * neck clearance, body clearance, freebore, and throat angle labeled
 * as computed clearance values.
 */

import React, { forwardRef, useMemo } from 'react';
import { Cartridge, Bullet, Rifle } from '@/lib/types';
import { DimensionAnnotation } from '@/lib/drawings/types';
import { getTheme } from '@/lib/drawings/themes';
import { generateCartridgeProfile } from '@/lib/geometry/cartridge-geometry';
import { CartridgeDimensions } from '@/lib/geometry/types';
import {
  computeChamberClearances,
  computeChamberProfile,
} from '@/lib/drawings/chamber-geometry';
import { layoutDimensions } from '@/lib/drawings/dimension-layout';
import { computeTitleBlock, TITLE_BLOCK_HEIGHT } from '@/lib/drawings/title-block';
import HatchPatterns from './HatchPatterns';
import DimensionLabel from './DimensionLabel';
import TitleBlock from './TitleBlock';

interface ChamberDrawingProps {
  cartridge: Cartridge;
  bullet?: Bullet;
  rifle: Rifle;
  style: 'blueprint' | 'modern';
  width?: number;
  height?: number;
}

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
 * Convert ProfilePoint array to SVG path (top half only, for chamber outline).
 */
function profilePointsToPath(
  points: { x: number; y: number }[],
  close: boolean = false
): string {
  if (points.length < 2) return '';
  const parts: string[] = [];
  parts.push(`M ${points[0].x.toFixed(3)} ${(-points[0].y).toFixed(3)}`);
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${points[i].x.toFixed(3)} ${(-points[i].y).toFixed(3)}`);
  }
  // Mirror bottom half (right to left)
  for (let i = points.length - 1; i >= 0; i--) {
    parts.push(`L ${points[i].x.toFixed(3)} ${points[i].y.toFixed(3)}`);
  }
  if (close) parts.push('Z');
  return parts.join(' ');
}

const ChamberDrawing = forwardRef<SVGSVGElement, ChamberDrawingProps>(
  function ChamberDrawing(
    { cartridge, bullet, rifle, style, width = 900, height = 500 },
    ref
  ) {
    const theme = getTheme(style);

    // Generate cartridge profile
    const cartridgeResult = useMemo(() => {
      return generateCartridgeProfile(toCartridgeDims(cartridge));
    }, [cartridge]);

    // If insufficient data, return null
    if (cartridgeResult.dataCompleteness === 'insufficient') {
      return null;
    }

    // Compute chamber clearances
    const clearances = useMemo(() => {
      return computeChamberClearances(cartridge, bullet ?? null, {
        freebore_mm: rifle.freebore_mm,
        throat_angle_deg: rifle.throat_angle_deg,
        headspace_mm: rifle.headspace_mm,
      });
    }, [cartridge, bullet, rifle]);

    // Compute chamber profile
    const chamberProfile = useMemo(() => {
      return computeChamberProfile(cartridge, clearances);
    }, [cartridge, clearances]);

    const chamberPath = useMemo(() => {
      return profilePointsToPath(chamberProfile, true);
    }, [chamberProfile]);

    // Drawing dimensions
    const caseLength = cartridge.case_length_mm;
    const baseR = (cartridge.base_diameter_mm ?? cartridge.groove_diameter_mm) / 2;
    const chamberMaxR = chamberProfile.reduce((max, p) => Math.max(max, p.y), 0);
    const chamberEndX = chamberProfile[chamberProfile.length - 1]?.x ?? caseLength + 10;

    const padLeft = 15;
    const padRight = 5;
    const padTop = 22;
    const padBottom = 22 + TITLE_BLOCK_HEIGHT;
    const drawingWidth = chamberEndX + padLeft + padRight + 65;
    const drawingHeight = chamberMaxR * 2 + padTop + padBottom;

    // Build dimension annotations for clearances
    const estimatedSet = new Set(clearances.estimated_fields);

    const annotations = useMemo(() => {
      const dims: DimensionAnnotation[] = [];

      // Headspace gap (bottom side, at case head)
      dims.push({
        x1: -clearances.headspace_gap_mm,
        y1: baseR,
        x2: 0,
        y2: baseR,
        value_mm: clearances.headspace_gap_mm,
        label: 'Headspace',
        side: 'bottom',
        offset_tier: 1,
      });

      // Freebore (top side)
      dims.push({
        x1: caseLength,
        y1: -chamberMaxR,
        x2: caseLength + clearances.freebore_mm,
        y2: -chamberMaxR,
        value_mm: clearances.freebore_mm,
        label: 'Freebore',
        side: 'top',
        offset_tier: 1,
      });

      // Body clearance (right side, at body region)
      const bodyX = caseLength * 0.4;
      dims.push({
        x1: bodyX,
        y1: -baseR,
        x2: bodyX,
        y2: -(baseR + clearances.body_clearance_mm),
        value_mm: clearances.body_clearance_mm,
        label: 'Body Clearance',
        side: 'right',
        offset_tier: 1,
      });

      // Neck clearance (right side, at neck region)
      const neckR = (cartridge.neck_diameter_mm ?? cartridge.bore_diameter_mm) / 2;
      const neckX = caseLength - 2;
      dims.push({
        x1: neckX,
        y1: -neckR,
        x2: neckX,
        y2: -(neckR + clearances.neck_clearance_mm),
        value_mm: clearances.neck_clearance_mm,
        label: 'Neck Clearance',
        side: 'right',
        offset_tier: 1,
      });

      // Rifling engagement (top side, if bullet provided)
      if (bullet) {
        dims.push({
          x1: caseLength + clearances.freebore_mm,
          y1: -chamberMaxR,
          x2: caseLength + clearances.freebore_mm + clearances.rifling_engagement_mm,
          y2: -chamberMaxR,
          value_mm: clearances.rifling_engagement_mm,
          label: 'Rifling Eng.',
          side: 'top',
          offset_tier: 1,
        });
      }

      return dims;
    }, [clearances, cartridge, bullet, baseR, caseLength, chamberMaxR]);

    const layoutedDims = useMemo(() => {
      return layoutDimensions(annotations, { width: drawingWidth, height: drawingHeight });
    }, [annotations, drawingWidth, drawingHeight]);

    // Title block
    const titleBlockData = useMemo(() => {
      const scale = Math.round(width / drawingWidth);
      return computeTitleBlock(
        cartridge.name,
        'Cartridge in Chamber',
        Math.max(scale, 1),
        style
      );
    }, [cartridge.name, width, drawingWidth, style]);

    return (
      <svg
        ref={ref}
        width={width}
        height={height}
        viewBox={`${-padLeft} ${-padTop} ${drawingWidth} ${drawingHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        <defs>
          <HatchPatterns theme={theme} />
        </defs>

        {/* Background */}
        <rect
          x={-padLeft}
          y={-padTop}
          width={drawingWidth}
          height={drawingHeight}
          fill={theme.background}
        />

        <g>
          {/* Chamber outline (steel) */}
          <path
            d={chamberPath}
            fill={theme.steelFill === 'none' ? 'url(#hatch-metal)' : theme.steelFill}
            stroke={theme.outline}
            strokeWidth={0.7}
          />

          {/* Cartridge inside chamber (offset by headspace gap) */}
          <path
            d={cartridgeResult.svgPath}
            fill={theme.caseFill === 'none' ? 'url(#hatch-brass)' : theme.caseFill}
            stroke={theme.outline}
            strokeWidth={0.5}
          />

          {/* Clearance gap visualization -- thin colored regions */}
          {/* Headspace gap indicator */}
          <rect
            x={-clearances.headspace_gap_mm}
            y={-baseR * 0.5}
            width={clearances.headspace_gap_mm}
            height={baseR}
            fill={theme.dimColor}
            opacity={0.15}
          />

          {/* Freebore zone */}
          {(() => {
            const boreR = cartridge.bore_diameter_mm / 2;
            return (
              <rect
                x={caseLength}
                y={-boreR}
                width={clearances.freebore_mm}
                height={boreR * 2}
                fill={theme.dimColor}
                opacity={0.1}
                stroke={theme.hiddenEdge}
                strokeWidth={0.2}
                strokeDasharray="1,0.5"
              />
            );
          })()}

          {/* Throat/leade angle indicator */}
          {(() => {
            const boreR = cartridge.bore_diameter_mm / 2;
            const neckR = (cartridge.neck_diameter_mm ?? cartridge.bore_diameter_mm) / 2;
            const freeboreEnd = caseLength + clearances.freebore_mm;
            const throatLength = (neckR - boreR) / Math.tan((clearances.throat_angle_deg * Math.PI) / 180);
            const throatEnd = freeboreEnd + Math.abs(throatLength);
            return (
              <g>
                {/* Throat taper lines (dashed) */}
                <line
                  x1={freeboreEnd}
                  y1={-(boreR + clearances.neck_clearance_mm)}
                  x2={throatEnd}
                  y2={-boreR}
                  stroke={theme.hiddenEdge}
                  strokeWidth={0.4}
                  strokeDasharray="2,1"
                />
                <line
                  x1={freeboreEnd}
                  y1={boreR + clearances.neck_clearance_mm}
                  x2={throatEnd}
                  y2={boreR}
                  stroke={theme.hiddenEdge}
                  strokeWidth={0.4}
                  strokeDasharray="2,1"
                />

                {/* Rifling start indicator (crossed lines) */}
                <g transform={`translate(${throatEnd + 1}, 0)`}>
                  <line x1={0} y1={-boreR} x2={1} y2={-boreR + 0.5} stroke={theme.outline} strokeWidth={0.2} />
                  <line x1={0.5} y1={-boreR} x2={1.5} y2={-boreR + 0.5} stroke={theme.outline} strokeWidth={0.2} />
                  <line x1={0} y1={boreR} x2={1} y2={boreR - 0.5} stroke={theme.outline} strokeWidth={0.2} />
                  <line x1={0.5} y1={boreR} x2={1.5} y2={boreR - 0.5} stroke={theme.outline} strokeWidth={0.2} />
                </g>

                {/* Throat angle text */}
                <text
                  x={freeboreEnd + throatLength / 2}
                  y={-(boreR + clearances.neck_clearance_mm + 2)}
                  textAnchor="middle"
                  fill={theme.dimColor}
                  fontFamily={theme.fontFamily}
                  fontSize={theme.dimFontSize * 0.85}
                >
                  {clearances.throat_angle_deg.toFixed(1)}{estimatedSet.has('throat_angle_deg') ? ' (est)' : ''}
                </text>
              </g>
            );
          })()}

          {/* Centerline */}
          <line
            x1={-clearances.headspace_gap_mm - 3}
            y1={0}
            x2={chamberEndX + 3}
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
              isEstimated={estimatedSet.has(
                dim.label.toLowerCase().replace(/[\s.]/g, '_') + '_mm'
              )}
            />
          ))}
        </g>

        {/* Title block */}
        <TitleBlock
          x={chamberEndX + padRight}
          y={chamberMaxR + 5}
          data={titleBlockData}
          theme={theme}
        />
      </svg>
    );
  }
);

export default ChamberDrawing;
