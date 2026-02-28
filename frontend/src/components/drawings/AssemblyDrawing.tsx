'use client';

/**
 * Assembly SVG technical drawing.
 * Shows barrel cylinder, cartridge, bullet, and optional simulation overlay
 * with OBT harmonic node markers and stress zone coloring.
 */

import React, { forwardRef, useMemo } from 'react';
import { Cartridge, Bullet, Rifle, SimulationResult } from '@/lib/types';
import { DimensionAnnotation } from '@/lib/drawings/types';
import { getTheme } from '@/lib/drawings/themes';
import { generateCartridgeProfile } from '@/lib/geometry/cartridge-geometry';
import { CartridgeDimensions } from '@/lib/geometry/types';
import {
  computeAssemblyLayout,
  getObtNodePositions,
  getStressZone,
} from '@/lib/drawings/assembly-geometry';
import { layoutDimensions } from '@/lib/drawings/dimension-layout';
import { computeTitleBlock, TITLE_BLOCK_HEIGHT } from '@/lib/drawings/title-block';
import HatchPatterns from './HatchPatterns';
import DimensionLabel from './DimensionLabel';
import TitleBlock from './TitleBlock';

interface AssemblyDrawingProps {
  cartridge: Cartridge;
  bullet?: Bullet;
  rifle: Rifle;
  simulation?: SimulationResult;
  style: 'blueprint' | 'modern';
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

/** Stress zone colors */
const STRESS_COLORS: Record<string, string> = {
  safe: 'rgba(34, 197, 94, 0.15)',
  caution: 'rgba(234, 179, 8, 0.2)',
  danger: 'rgba(239, 68, 68, 0.25)',
};

const STRESS_OUTLINE: Record<string, string> = {
  safe: '#22c55e',
  caution: '#eab308',
  danger: '#ef4444',
};

const AssemblyDrawing = forwardRef<SVGSVGElement, AssemblyDrawingProps>(
  function AssemblyDrawing(
    { cartridge, bullet, rifle, simulation, style },
    ref
  ) {
    const theme = getTheme(style);

    // Generate cartridge profile
    const cartridgeResult = useMemo(() => {
      return generateCartridgeProfile(toCartridgeDims(cartridge));
    }, [cartridge]);

    if (cartridgeResult.dataCompleteness === 'insufficient') {
      return null;
    }

    // Compute assembly layout
    const layout = useMemo(() => {
      return computeAssemblyLayout(cartridge, bullet ?? null, rifle);
    }, [cartridge, bullet, rifle]);

    // Simulation overlays
    const obtNodes = useMemo(() => {
      if (!simulation) return [];
      return getObtNodePositions(rifle.barrel_length_mm, simulation);
    }, [simulation, rifle.barrel_length_mm]);

    const stressZone = useMemo(() => {
      if (!simulation) return null;
      return getStressZone(simulation, cartridge.saami_max_pressure_psi);
    }, [simulation, cartridge.saami_max_pressure_psi]);

    // Drawing dimensions
    const padLeft = 15;
    const padRight = 10;
    const padTop = 25;
    const padBottom = 25 + TITLE_BLOCK_HEIGHT;

    const drawingWidth = layout.total_width_mm + padLeft + padRight + 65;
    const drawingHeight = layout.total_height_mm + padTop + padBottom;
    const centerY = 0; // cartridge profile is already centered on y=0

    // Dimension annotations
    const annotations = useMemo(() => {
      const dims: DimensionAnnotation[] = [];

      // Barrel length dimension (top side)
      dims.push({
        x1: layout.barrel_start_x,
        y1: -layout.barrel_outer_r,
        x2: layout.barrel_end_x,
        y2: -layout.barrel_outer_r,
        value_mm: layout.barrel_end_x - layout.barrel_start_x,
        label: 'Visible Barrel',
        side: 'top',
        offset_tier: 1,
      });

      // Overall cartridge length (bottom side)
      dims.push({
        x1: 0,
        y1: layout.barrel_outer_r,
        x2: cartridge.overall_length_mm,
        y2: layout.barrel_outer_r,
        value_mm: cartridge.overall_length_mm,
        label: 'OAL',
        side: 'bottom',
        offset_tier: 1,
      });

      // Case length (bottom side)
      dims.push({
        x1: 0,
        y1: layout.barrel_outer_r,
        x2: cartridge.case_length_mm,
        y2: layout.barrel_outer_r,
        value_mm: cartridge.case_length_mm,
        label: 'Case Length',
        side: 'bottom',
        offset_tier: 1,
      });

      return dims;
    }, [layout, cartridge]);

    const layoutedDims = useMemo(() => {
      return layoutDimensions(annotations, { width: drawingWidth, height: drawingHeight });
    }, [annotations, drawingWidth, drawingHeight]);

    // Title block
    const titleBlockData = useMemo(() => {
      return computeTitleBlock(cartridge.name);
    }, [cartridge.name]);

    return (
      <svg
        ref={ref}
        viewBox={`${-padLeft} ${-(layout.total_height_mm / 2 + padTop)} ${drawingWidth} ${drawingHeight}`}
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
          y={-(layout.total_height_mm / 2 + padTop)}
          width={drawingWidth}
          height={drawingHeight}
          fill={theme.background}
        />

        <g>
          {/* Barrel: outer wall with bore cutout */}
          {/* Top barrel wall */}
          <rect
            x={layout.barrel_start_x}
            y={-layout.barrel_outer_r}
            width={layout.barrel_end_x - layout.barrel_start_x}
            height={layout.barrel_outer_r - layout.barrel_bore_r}
            fill={theme.steelFill === 'none' ? 'url(#hatch-metal)' : theme.steelFill}
            stroke={theme.outline}
            strokeWidth={theme.outlineStrokeWidth}
          />
          {/* Bottom barrel wall */}
          <rect
            x={layout.barrel_start_x}
            y={layout.barrel_bore_r}
            width={layout.barrel_end_x - layout.barrel_start_x}
            height={layout.barrel_outer_r - layout.barrel_bore_r}
            fill={theme.steelFill === 'none' ? 'url(#hatch-metal)' : theme.steelFill}
            stroke={theme.outline}
            strokeWidth={theme.outlineStrokeWidth}
          />

          {/* Bore (empty space between barrel walls) */}
          <rect
            x={layout.barrel_start_x}
            y={-layout.barrel_bore_r}
            width={layout.barrel_end_x - layout.barrel_start_x}
            height={layout.barrel_bore_r * 2}
            fill={theme.background}
          />

          {/* Rifling hash marks at bore entrance */}
          {(() => {
            const rStart = layout.barrel_start_x + 2;
            const boreR = layout.barrel_bore_r;
            const marks = [];
            for (let i = 0; i < 4; i++) {
              const x = rStart + i * 2;
              marks.push(
                <line
                  key={`rif-t-${i}`}
                  x1={x} y1={-boreR}
                  x2={x + 1.5} y2={-boreR + 0.5}
                  stroke={theme.outline}
                  strokeWidth={theme.thinStrokeWidth}
                />,
                <line
                  key={`rif-b-${i}`}
                  x1={x} y1={boreR}
                  x2={x + 1.5} y2={boreR - 0.5}
                  stroke={theme.outline}
                  strokeWidth={theme.thinStrokeWidth}
                />
              );
            }
            return <>{marks}</>;
          })()}

          {/* Stress zone overlay (only with simulation data) */}
          {simulation && stressZone && (
            <rect
              x={layout.cartridge_x}
              y={-layout.barrel_outer_r}
              width={cartridge.case_length_mm}
              height={layout.barrel_outer_r * 2}
              fill={STRESS_COLORS[stressZone.severity]}
              stroke={STRESS_OUTLINE[stressZone.severity]}
              strokeWidth={theme.thinStrokeWidth}
              strokeDasharray="2,1"
            />
          )}

          {/* Cartridge profile */}
          <g transform={`translate(${layout.cartridge_x}, 0)`}>
            <path
              d={cartridgeResult.svgPath}
              fill={theme.caseFill === 'none' ? 'url(#hatch-brass)' : theme.caseFill}
              stroke={theme.outline}
              strokeWidth={theme.outlineStrokeWidth}
            />
          </g>

          {/* Bullet with ogive curve at case mouth to OAL */}
          {bullet && (
            <g>
              {(() => {
                const bulletStartX = cartridge.case_length_mm;
                const bulletEndX = layout.bullet_tip_x;
                const bulletR = cartridge.bore_diameter_mm / 2;
                const meplatR = bulletR * 0.06;
                const bulletLen = bulletEndX - bulletStartX;
                // Bearing surface ~40% of bullet length from base
                const bearingEnd = bulletStartX + bulletLen * 0.4;
                // Ogive curve from bearing end to tip using quadratic bezier
                const cpX = bearingEnd + (bulletEndX - bearingEnd) * 0.55;
                const fmt = (n: number) => n.toFixed(3);
                const d = [
                  `M ${fmt(bulletStartX)} ${fmt(-bulletR)}`,
                  `L ${fmt(bearingEnd)} ${fmt(-bulletR)}`,
                  `Q ${fmt(cpX)} ${fmt(-bulletR)} ${fmt(bulletEndX)} ${fmt(-meplatR)}`,
                  `L ${fmt(bulletEndX)} ${fmt(meplatR)}`,
                  `Q ${fmt(cpX)} ${fmt(bulletR)} ${fmt(bearingEnd)} ${fmt(bulletR)}`,
                  `L ${fmt(bulletStartX)} ${fmt(bulletR)}`,
                  'Z',
                ].join(' ');
                return (
                  <path
                    d={d}
                    fill={theme.copperFill === 'none' ? 'url(#hatch-copper)' : theme.copperFill}
                    stroke={theme.outline}
                    strokeWidth={theme.outlineStrokeWidth}
                  />
                );
              })()}
            </g>
          )}

          {/* Simulation overlay: OBT nodes */}
          {simulation && obtNodes.length > 0 && (
            <g>
              {obtNodes.map((node, idx) => {
                // Scale OBT positions to visible barrel length
                const visibleBarrelLen = layout.barrel_end_x - layout.barrel_start_x;
                const fullBarrelLen = rifle.barrel_length_mm - cartridge.case_length_mm;
                const scaledX = layout.barrel_start_x + (node.x - cartridge.case_length_mm) * (visibleBarrelLen / fullBarrelLen);

                // Only render if within visible area
                if (scaledX < layout.barrel_start_x || scaledX > layout.barrel_end_x) return null;

                const color = node.isNode ? '#22c55e' : '#60a5fa';
                const dash = node.isNode ? '2,1' : undefined;

                return (
                  <g key={idx}>
                    <line
                      x1={scaledX}
                      y1={-(layout.barrel_outer_r + 3)}
                      x2={scaledX}
                      y2={layout.barrel_outer_r + 3}
                      stroke={color}
                      strokeWidth={0.4}
                      strokeDasharray={dash}
                      opacity={0.7}
                    />
                    <text
                      x={scaledX}
                      y={-(layout.barrel_outer_r + 4)}
                      textAnchor="middle"
                      fill={color}
                      fontFamily={theme.fontFamily}
                      fontSize={theme.dimFontSize * 0.85}
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}

              {/* OBT match indicator near muzzle */}
              <text
                x={layout.barrel_end_x + 2}
                y={-(layout.barrel_outer_r + 1)}
                fill={simulation.obt_match ? '#22c55e' : '#ef4444'}
                fontFamily={theme.fontFamily}
                fontSize={theme.dimFontSize}
              >
                {simulation.obt_match ? 'OBT Match' : 'OBT Miss'}
              </text>
            </g>
          )}

          {/* Pressure zone text annotation (with simulation) */}
          {simulation && stressZone && (
            <text
              x={cartridge.case_length_mm / 2}
              y={layout.barrel_outer_r + 4}
              textAnchor="middle"
              fill={STRESS_OUTLINE[stressZone.severity]}
              fontFamily={theme.fontFamily}
              fontSize={theme.dimFontSize}
            >
              {simulation.peak_pressure_psi.toFixed(0)} PSI ({(stressZone.fraction * 100).toFixed(1)}% SAAMI)
            </text>
          )}

          {/* Centerline */}
          <line
            x1={-5}
            y1={0}
            x2={layout.barrel_end_x + 5}
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
          x={layout.barrel_end_x + padRight}
          y={layout.total_height_mm / 2 - TITLE_BLOCK_HEIGHT - 2}
          data={titleBlockData}
          theme={theme}
        />
      </svg>
    );
  }
);

export default AssemblyDrawing;
