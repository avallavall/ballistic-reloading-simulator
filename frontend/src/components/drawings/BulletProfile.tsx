'use client';

/**
 * Bullet profile SVG technical drawing.
 * Renders a standalone bullet silhouette with dimension annotations.
 */

import React, { forwardRef, useMemo } from 'react';
import { Bullet } from '@/lib/types';
import { DimensionAnnotation } from '@/lib/drawings/types';
import { getTheme } from '@/lib/drawings/themes';
import { generateBulletProfile } from '@/lib/geometry/bullet-geometry';
import { BulletDimensions } from '@/lib/geometry/types';
import { layoutDimensions } from '@/lib/drawings/dimension-layout';
import { computeTitleBlock, TITLE_BLOCK_WIDTH, TITLE_BLOCK_HEIGHT } from '@/lib/drawings/title-block';
import HatchPatterns from './HatchPatterns';
import DimensionLabel from './DimensionLabel';
import TitleBlock from './TitleBlock';

interface BulletProfileProps {
  bullet: Bullet;
  style: 'blueprint' | 'modern';
}

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

const BulletProfile = forwardRef<SVGSVGElement, BulletProfileProps>(
  function BulletProfile({ bullet, style }, ref) {
    const theme = getTheme(style);

    const result = useMemo(() => {
      return generateBulletProfile(toBulletDims(bullet));
    }, [bullet]);

    if (result.dataCompleteness === 'insufficient') {
      return null;
    }

    const bodyR = bullet.diameter_mm / 2;
    const totalLength = bullet.length_mm ?? bodyR * 4; // fallback
    const btLength = bullet.boat_tail_length_mm ?? 0;
    const bearingSurface = bullet.bearing_surface_mm ?? totalLength * 0.45;

    const padLeft = 25;
    const padRight = 10;
    const padTop = 25;
    const padBottom = 20 + TITLE_BLOCK_HEIGHT;

    const contentWidth = totalLength + padLeft + padRight;
    const drawingWidth = Math.max(contentWidth, TITLE_BLOCK_WIDTH + padRight);
    const drawingHeight = bodyR * 2 + padTop + padBottom;

    // Build dimension annotations
    const annotations = useMemo(() => {
      const dims: DimensionAnnotation[] = [];

      // Total length (top)
      dims.push({
        x1: 0, y1: -bodyR,
        x2: totalLength, y2: -bodyR,
        value_mm: totalLength,
        label: 'Total Length',
        side: 'top',
        offset_tier: 1,
      });

      // Diameter (left)
      dims.push({
        x1: btLength > 0 ? btLength + 1 : 1, y1: -bodyR,
        x2: btLength > 0 ? btLength + 1 : 1, y2: bodyR,
        value_mm: bullet.diameter_mm,
        label: 'Diameter',
        side: 'left',
        offset_tier: 1,
      });

      // Bearing surface (bottom)
      if (bearingSurface > 0) {
        const bearingStart = btLength > 0 ? btLength : 0;
        dims.push({
          x1: bearingStart, y1: bodyR,
          x2: bearingStart + bearingSurface, y2: bodyR,
          value_mm: bearingSurface,
          label: 'Bearing',
          side: 'bottom',
          offset_tier: 1,
        });
      }

      // Boat tail length (bottom)
      if (btLength > 0) {
        dims.push({
          x1: 0, y1: bodyR,
          x2: btLength, y2: bodyR,
          value_mm: btLength,
          label: 'Boat Tail',
          side: 'bottom',
          offset_tier: 1,
        });
      }

      return dims;
    }, [bullet, bodyR, totalLength, btLength, bearingSurface]);

    const layoutedDims = useMemo(() => {
      return layoutDimensions(annotations, { width: drawingWidth, height: drawingHeight });
    }, [annotations, drawingWidth, drawingHeight]);

    const titleBlockData = useMemo(() => {
      return computeTitleBlock(bullet.name);
    }, [bullet.name]);

    return (
      <svg
        ref={ref}
        viewBox={`${-padLeft} ${-(bodyR + padTop)} ${drawingWidth} ${drawingHeight}`}
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
          y={-(bodyR + padTop)}
          width={drawingWidth}
          height={drawingHeight}
          fill={theme.background}
        />

        <g>
          {/* Bullet profile */}
          <path
            d={result.svgPath}
            fill={theme.copperFill === 'none' ? 'url(#hatch-copper)' : theme.copperFill}
            stroke={theme.outline}
            strokeWidth={theme.outlineStrokeWidth}
          />

          {/* Centerline */}
          <line
            x1={-3}
            y1={0}
            x2={totalLength + 3}
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
            />
          ))}
        </g>

        {/* Title block */}
        <TitleBlock
          x={drawingWidth - padLeft - TITLE_BLOCK_WIDTH}
          y={bodyR + padBottom - TITLE_BLOCK_HEIGHT - 3}
          data={titleBlockData}
          theme={theme}
        />
      </svg>
    );
  }
);

export default BulletProfile;
