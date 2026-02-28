'use client';

/**
 * Engineering title block SVG group.
 * Renders only the drawing/cartridge/bullet name in a compact bordered box.
 */

import React from 'react';
import { DrawingTheme, TitleBlockData } from '@/lib/drawings/types';
import { TITLE_BLOCK_WIDTH, TITLE_BLOCK_HEIGHT } from '@/lib/drawings/title-block';

interface TitleBlockProps {
  x: number;
  y: number;
  data: TitleBlockData;
  theme: DrawingTheme;
}

export default function TitleBlock({ x, y, data, theme }: TitleBlockProps) {
  const w = TITLE_BLOCK_WIDTH;
  const h = TITLE_BLOCK_HEIGHT;

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Outer rectangle */}
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        fill={theme.titleBlockBg}
        stroke={theme.titleBlockBorder}
        strokeWidth={0.5}
      />

      {/* Name (bold, vertically centered) */}
      <text
        x={w / 2}
        y={h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={theme.textColor}
        fontFamily={theme.fontFamily}
        fontSize={theme.titleFontSize}
        fontWeight="bold"
      >
        {data.name}
      </text>
    </g>
  );
}
