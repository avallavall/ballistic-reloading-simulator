'use client';

/**
 * SVG <defs> block rendering hatching patterns and dimension arrow markers.
 * Intended to be placed inside an <svg><defs> block.
 */

import React from 'react';
import { DrawingTheme } from '@/lib/drawings/types';
import { getHatchPatternDefs } from '@/lib/drawings/hatching-patterns';

interface HatchPatternsProps {
  theme: DrawingTheme;
}

export default function HatchPatterns({ theme }: HatchPatternsProps) {
  const patterns = getHatchPatternDefs(theme);

  return (
    <>
      {patterns.map((pat) => (
        <pattern
          key={pat.id}
          id={pat.id}
          width={pat.width}
          height={pat.height}
          patternUnits={pat.patternUnits}
          patternTransform={pat.patternTransform}
        >
          {pat.elements.map((el, idx) => {
            if (el.type === 'line') {
              return (
                <line
                  key={idx}
                  x1={el.attrs.x1 as number}
                  y1={el.attrs.y1 as number}
                  x2={el.attrs.x2 as number}
                  y2={el.attrs.y2 as number}
                  stroke={el.attrs.stroke as string}
                  strokeWidth={el.attrs['stroke-width'] as number}
                />
              );
            }
            if (el.type === 'circle') {
              return (
                <circle
                  key={idx}
                  cx={el.attrs.cx as number}
                  cy={el.attrs.cy as number}
                  r={el.attrs.r as number}
                  fill={el.attrs.fill as string}
                />
              );
            }
            if (el.type === 'rect') {
              return (
                <rect
                  key={idx}
                  x={el.attrs.x as number}
                  y={el.attrs.y as number}
                  width={el.attrs.width as number}
                  height={el.attrs.height as number}
                  fill={el.attrs.fill as string}
                />
              );
            }
            return null;
          })}
        </pattern>
      ))}

      {/* Dimension line arrowhead marker */}
      <marker
        id="dim-arrow"
        viewBox="0 0 3 3"
        refX={3}
        refY={1.5}
        markerWidth={3}
        markerHeight={3}
        orient="auto-start-reverse"
      >
        <polygon points="0,0 3,1.5 0,3" fill={theme.dimColor} />
      </marker>
    </>
  );
}
