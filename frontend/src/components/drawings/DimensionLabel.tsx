'use client';

/**
 * Reusable SVG dimension annotation with extension lines, arrows, and dual-unit text.
 * Follows ISO 129 technical drawing conventions:
 * - Value text centered ON the dimension line (breaking it)
 * - Label text below/beside the value
 * - Extension lines with gap from feature to dim line
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
  const estSuffix = isEstimated ? ' *' : '';

  const valueText = `${formatMm(value_mm)} mm / ${formatInch(value_mm)} in${estSuffix}`;

  if (isHorizontal) {
    const sign = side === 'top' ? -1 : 1;
    const dimY = (side === 'top' ? Math.min(y1, y2) : Math.max(y1, y2)) + sign * tierOffset;

    const ext1StartY = y1;
    const ext2StartY = y2;
    const extEndY = dimY + sign * 1;

    // Text centered ON the dimension line
    const textX = (x1 + x2) / 2;
    const textY = dimY;

    // Estimate text width for background mask
    const charW = theme.dimFontSize * 0.55;
    const textW = valueText.length * charW;
    const maskPad = 1;

    return (
      <g>
        {/* Extension lines */}
        <line
          x1={x1} y1={ext1StartY} x2={x1} y2={extEndY}
          stroke={theme.dimColor} strokeWidth={theme.thinStrokeWidth} strokeDasharray="2,1"
        />
        <line
          x1={x2} y1={ext2StartY} x2={x2} y2={extEndY}
          stroke={theme.dimColor} strokeWidth={theme.thinStrokeWidth} strokeDasharray="2,1"
        />

        {/* Dimension line (two segments, broken at text) */}
        <line
          x1={x1} y1={dimY} x2={textX - textW / 2 - maskPad} y2={dimY}
          stroke={theme.dimColor} strokeWidth={theme.dimStrokeWidth}
          markerStart="url(#dim-arrow)"
          strokeDasharray={dimDash}
        />
        <line
          x1={textX + textW / 2 + maskPad} y1={dimY} x2={x2} y2={dimY}
          stroke={theme.dimColor} strokeWidth={theme.dimStrokeWidth}
          markerEnd="url(#dim-arrow)"
          strokeDasharray={dimDash}
        />

        {/* Value text ON the dimension line */}
        <text
          x={textX} y={textY}
          textAnchor="middle" dominantBaseline="central"
          fill={theme.dimColor} fontFamily={theme.fontFamily}
          fontSize={theme.dimFontSize} fontWeight="500"
        >
          {valueText}
        </text>

        {/* Label below/above the value */}
        {label && (
          <text
            x={textX}
            y={textY + sign * (theme.dimFontSize * 1.4)}
            textAnchor="middle"
            dominantBaseline="central"
            fill={theme.dimColor} fontFamily={theme.fontFamily}
            fontSize={theme.dimFontSize * 0.75}
            opacity={0.7} fontStyle="italic"
          >
            {label}
          </text>
        )}
      </g>
    );
  }

  // ── Vertical dimension (left / right) ──
  const sign = side === 'left' ? -1 : 1;
  const dimX = (side === 'left' ? Math.min(x1, x2) : Math.max(x1, x2)) + sign * tierOffset;

  const ext1StartX = x1;
  const ext2StartX = x2;
  const extEndX = dimX + sign * 1;

  // Text centered ON the dimension line, rotated -90°
  const textX = dimX;
  const textY = (y1 + y2) / 2;

  // Estimate text height (becomes width when rotated) for line break
  const charW = theme.dimFontSize * 0.55;
  const textW = valueText.length * charW;
  const maskPad = 1;

  return (
    <g>
      {/* Extension lines */}
      <line
        x1={ext1StartX} y1={y1} x2={extEndX} y2={y1}
        stroke={theme.dimColor} strokeWidth={theme.thinStrokeWidth} strokeDasharray="2,1"
      />
      <line
        x1={ext2StartX} y1={y2} x2={extEndX} y2={y2}
        stroke={theme.dimColor} strokeWidth={theme.thinStrokeWidth} strokeDasharray="2,1"
      />

      {/* Dimension line (two segments, broken at text) */}
      <line
        x1={dimX} y1={y1} x2={dimX} y2={textY - textW / 2 - maskPad}
        stroke={theme.dimColor} strokeWidth={theme.dimStrokeWidth}
        markerStart="url(#dim-arrow)"
        strokeDasharray={dimDash}
      />
      <line
        x1={dimX} y1={textY + textW / 2 + maskPad} x2={dimX} y2={y2}
        stroke={theme.dimColor} strokeWidth={theme.dimStrokeWidth}
        markerEnd="url(#dim-arrow)"
        strokeDasharray={dimDash}
      />

      {/* Value text ON the dimension line (rotated) */}
      <text
        x={textX} y={textY}
        textAnchor="middle" dominantBaseline="central"
        fill={theme.dimColor} fontFamily={theme.fontFamily}
        fontSize={theme.dimFontSize} fontWeight="500"
        transform={`rotate(-90, ${textX}, ${textY})`}
      >
        {valueText}
      </text>

      {/* Label beside the value (rotated, slightly offset outward) */}
      {label && (
        <text
          x={textX + sign * (theme.dimFontSize * 1.4)}
          y={textY}
          textAnchor="middle" dominantBaseline="central"
          fill={theme.dimColor} fontFamily={theme.fontFamily}
          fontSize={theme.dimFontSize * 0.75}
          opacity={0.7} fontStyle="italic"
          transform={`rotate(-90, ${textX + sign * (theme.dimFontSize * 1.4)}, ${textY})`}
        >
          {label}
        </text>
      )}
    </g>
  );
}
