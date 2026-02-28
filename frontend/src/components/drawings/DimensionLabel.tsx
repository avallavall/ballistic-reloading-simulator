'use client';

/**
 * Reusable SVG dimension annotation with extension lines, arrows, and dual-unit text.
 * Follows ISO technical drawing conventions for dimension lines.
 */

import React from 'react';
import { DrawingTheme } from '@/lib/drawings/types';
import { BASE_OFFSET_MM, TIER_SPACING_MM } from '@/lib/drawings/dimension-layout';

interface DimensionLabelProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  value_mm: number;
  label?: string;
  offset_tier: number;
  side: 'top' | 'bottom' | 'left' | 'right';
  theme: DrawingTheme;
  isEstimated?: boolean;
}

/**
 * Format mm value with appropriate precision.
 * If value has no decimal part, use .1f; otherwise match original precision up to 3 decimals.
 */
function formatMm(value: number): string {
  const str = String(value);
  const dotIdx = str.indexOf('.');
  if (dotIdx === -1) {
    return value.toFixed(1);
  }
  const decimals = Math.min(str.length - dotIdx - 1, 3);
  return value.toFixed(decimals);
}

function formatInch(valueMm: number): string {
  const valueIn = valueMm / 25.4;
  return valueIn.toFixed(3);
}

export default function DimensionLabel({
  x1, y1, x2, y2,
  value_mm,
  label,
  offset_tier,
  side,
  theme,
  isEstimated = false,
}: DimensionLabelProps) {
  const isHorizontal = side === 'top' || side === 'bottom';
  const tierOffset = BASE_OFFSET_MM + (offset_tier - 1) * TIER_SPACING_MM;
  const dimDash = isEstimated ? '1,0.5' : undefined;
  const estSuffix = isEstimated ? ' (est)' : '';

  const dualText = `${formatMm(value_mm)} mm / ${formatInch(value_mm)} in${estSuffix}`;

  if (isHorizontal) {
    // Horizontal dimension line: extension lines go vertical
    const sign = side === 'top' ? -1 : 1;
    const dimY = (side === 'top' ? Math.min(y1, y2) : Math.max(y1, y2)) + sign * tierOffset;

    // Extension lines (from feature to dimension line)
    const ext1StartY = y1;
    const ext2StartY = y2;
    const extEndY = dimY + sign * 1; // extend 1mm past the dim line

    // Text position centered on the dimension line
    const textX = (x1 + x2) / 2;
    const textY = dimY + sign * 2;

    return (
      <g>
        {/* Extension lines */}
        <line
          x1={x1} y1={ext1StartY} x2={x1} y2={extEndY}
          stroke={theme.dimColor}
          strokeWidth={0.25}
          strokeDasharray="2,1"
        />
        <line
          x1={x2} y1={ext2StartY} x2={x2} y2={extEndY}
          stroke={theme.dimColor}
          strokeWidth={0.25}
          strokeDasharray="2,1"
        />

        {/* Dimension line with arrows */}
        <line
          x1={x1} y1={dimY} x2={x2} y2={dimY}
          stroke={theme.dimColor}
          strokeWidth={0.5}
          markerStart="url(#dim-arrow)"
          markerEnd="url(#dim-arrow)"
          strokeDasharray={dimDash}
        />

        {/* Dual-unit text */}
        <text
          x={textX}
          y={textY}
          textAnchor="middle"
          dominantBaseline={side === 'top' ? 'auto' : 'hanging'}
          fill={theme.dimColor}
          fontFamily={theme.fontFamily}
          fontSize={theme.dimFontSize}
        >
          {dualText}
        </text>

        {/* Optional label below/above the value */}
        {label && (
          <text
            x={textX}
            y={textY + sign * (theme.dimFontSize * 1.2)}
            textAnchor="middle"
            dominantBaseline={side === 'top' ? 'auto' : 'hanging'}
            fill={theme.dimColor}
            fontFamily={theme.fontFamily}
            fontSize={theme.dimFontSize * 0.75}
            opacity={0.8}
          >
            {label}
          </text>
        )}
      </g>
    );
  }

  // Vertical dimension line: extension lines go horizontal
  const sign = side === 'left' ? -1 : 1;
  const dimX = (side === 'left' ? Math.min(x1, x2) : Math.max(x1, x2)) + sign * tierOffset;

  const ext1StartX = x1;
  const ext2StartX = x2;
  const extEndX = dimX + sign * 1;

  const textX = dimX + sign * 2;
  const textY = (y1 + y2) / 2;

  return (
    <g>
      {/* Extension lines */}
      <line
        x1={ext1StartX} y1={y1} x2={extEndX} y2={y1}
        stroke={theme.dimColor}
        strokeWidth={0.25}
        strokeDasharray="2,1"
      />
      <line
        x1={ext2StartX} y1={y2} x2={extEndX} y2={y2}
        stroke={theme.dimColor}
        strokeWidth={0.25}
        strokeDasharray="2,1"
      />

      {/* Dimension line with arrows */}
      <line
        x1={dimX} y1={y1} x2={dimX} y2={y2}
        stroke={theme.dimColor}
        strokeWidth={0.5}
        markerStart="url(#dim-arrow)"
        markerEnd="url(#dim-arrow)"
        strokeDasharray={dimDash}
      />

      {/* Dual-unit text (rotated for vertical dimensions) */}
      <text
        x={textX}
        y={textY}
        textAnchor="middle"
        dominantBaseline="central"
        fill={theme.dimColor}
        fontFamily={theme.fontFamily}
        fontSize={theme.dimFontSize}
        transform={`rotate(-90, ${textX}, ${textY})`}
      >
        {dualText}
      </text>

      {/* Optional label */}
      {label && (
        <text
          x={textX + sign * (theme.dimFontSize * 1.2)}
          y={textY}
          textAnchor="middle"
          dominantBaseline="central"
          fill={theme.dimColor}
          fontFamily={theme.fontFamily}
          fontSize={theme.dimFontSize * 0.75}
          opacity={0.8}
          transform={`rotate(-90, ${textX + sign * (theme.dimFontSize * 1.2)}, ${textY})`}
        >
          {label}
        </text>
      )}
    </g>
  );
}
