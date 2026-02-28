'use client';

/**
 * Engineering title block SVG group.
 * Renders drawing name, type, scale, date, and style in a bordered box.
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
  const rowH = h / 3;
  const textPad = 1.5; // padding from left edge

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

      {/* Row dividers */}
      <line
        x1={0} y1={rowH} x2={w} y2={rowH}
        stroke={theme.titleBlockBorder}
        strokeWidth={0.3}
      />
      <line
        x1={0} y1={rowH * 2} x2={w} y2={rowH * 2}
        stroke={theme.titleBlockBorder}
        strokeWidth={0.3}
      />

      {/* Row 1: Drawing name (bold) */}
      <text
        x={textPad}
        y={rowH * 0.5}
        dominantBaseline="central"
        fill={theme.textColor}
        fontFamily={theme.fontFamily}
        fontSize={theme.titleFontSize}
        fontWeight="bold"
      >
        {data.name}
      </text>

      {/* Row 2: Drawing type + scale */}
      <text
        x={textPad}
        y={rowH * 1.5}
        dominantBaseline="central"
        fill={theme.textColor}
        fontFamily={theme.fontFamily}
        fontSize={theme.dimFontSize}
      >
        {data.drawingType}
      </text>
      <text
        x={w - textPad}
        y={rowH * 1.5}
        textAnchor="end"
        dominantBaseline="central"
        fill={theme.textColor}
        fontFamily={theme.fontFamily}
        fontSize={theme.dimFontSize}
      >
        {data.scale}
      </text>

      {/* Row 3: Date + style */}
      <text
        x={textPad}
        y={rowH * 2.5}
        dominantBaseline="central"
        fill={theme.textColor}
        fontFamily={theme.fontFamily}
        fontSize={theme.dimFontSize * 0.85}
      >
        {data.date}
      </text>
      <text
        x={w - textPad}
        y={rowH * 2.5}
        textAnchor="end"
        dominantBaseline="central"
        fill={theme.textColor}
        fontFamily={theme.fontFamily}
        fontSize={theme.dimFontSize * 0.85}
      >
        {data.style}
      </text>
    </g>
  );
}
