'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipProps,
} from 'recharts';
import type { DistanceCurvePoint } from '@/lib/types';
import { formatNum } from '@/lib/utils';
import { useUnits } from '@/lib/unit-context';

interface VelocityDistanceChartProps {
  data: DistanceCurvePoint[];
  syncId?: string;
  expanded?: boolean;
  upperData?: DistanceCurvePoint[];
  lowerData?: DistanceCurvePoint[];
  showBands?: boolean;
}

export default function VelocityDistanceChart({
  data,
  syncId,
  expanded = false,
  upperData,
  lowerData,
  showBands = true,
}: VelocityDistanceChartProps) {
  const { formatVelocity } = useUnits();

  const hasBands = showBands && upperData && lowerData && upperData.length > 0 && lowerData.length > 0;

  const velocityUnit = formatVelocity(0).unit;

  // Build chart data: merge center + band data
  const chartData = data.map((p, i) => {
    const displayV = formatVelocity(p.v_fps).value;
    const base: Record<string, number> = {
      x_mm: p.x_mm,
      fps: p.v_fps,
      displayV,
    };
    if (hasBands) {
      const upperV = formatVelocity(upperData[i]?.v_fps ?? p.v_fps).value;
      const lowerV = formatVelocity(lowerData[i]?.v_fps ?? p.v_fps).value;
      base.v_upper = upperV;
      base.v_lower = lowerV;
      base.v_band = upperV - lowerV;
    }
    return base;
  });

  const height = expanded ? 'h-[30rem]' : 'h-80';

  return (
    <div className={`${height} w-full`}>
      <ResponsiveContainer width="100%" height="100%" key={expanded ? 'expanded' : 'tile'}>
        <ComposedChart
          data={chartData}
          syncId={syncId}
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="x_mm"
            stroke="#94a3b8"
            fontSize={12}
            tickFormatter={(v) => formatNum(v, 0)}
            label={{
              value: 'Distancia en canon (mm)',
              position: 'insideBottom',
              offset: -5,
              fill: '#94a3b8',
              fontSize: 12,
            }}
          />
          <YAxis
            dataKey="displayV"
            stroke="#94a3b8"
            fontSize={12}
            tickFormatter={(v) => formatNum(v, 0)}
            label={{
              value: `Velocidad (${velocityUnit})`,
              angle: -90,
              position: 'insideLeft',
              fill: '#94a3b8',
              fontSize: 12,
            }}
          />
          <Tooltip
            content={({ active, payload }: TooltipProps<number, string>) => {
              if (!active || !payload || !payload.length) return null;
              const point = payload.find((p) => p.dataKey === 'displayV')?.payload ?? payload[0]?.payload;
              if (!point) return null;
              const v = formatVelocity(point.fps);
              return (
                <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm shadow-lg">
                  <p className="text-slate-400">
                    Distancia: <span className="font-mono text-white">{formatNum(point.x_mm, 1)} mm</span>
                  </p>
                  <p className="text-blue-400">
                    Velocidad: <span className="font-mono text-white">{v.formatted} {v.unit}</span>
                  </p>
                  {hasBands && point.v_upper !== undefined && (
                    <p className="text-blue-400 text-xs mt-1">
                      Banda: {formatNum(point.v_lower, 0)} - {formatNum(point.v_upper, 0)} {velocityUnit}
                    </p>
                  )}
                </div>
              );
            }}
          />

          {/* Error bands (only when showBands && band data exists) */}
          {hasBands && (
            <>
              {/* Invisible lower bound */}
              <Area
                type="monotone"
                dataKey="v_lower"
                stackId="error"
                stroke="none"
                fill="transparent"
                fillOpacity={0}
                isAnimationActive={false}
              />
              {/* Visible band delta */}
              <Area
                type="monotone"
                dataKey="v_band"
                stackId="error"
                stroke="none"
                fill="#3b82f6"
                fillOpacity={0.15}
                isAnimationActive={false}
              />
              {/* Dashed boundary lines */}
              <Line
                type="monotone"
                dataKey="v_upper"
                stroke="#3b82f6"
                strokeDasharray="4 4"
                dot={false}
                strokeWidth={1}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="v_lower"
                stroke="#3b82f6"
                strokeDasharray="4 4"
                dot={false}
                strokeWidth={1}
                isAnimationActive={false}
              />
            </>
          )}

          {/* Main center line */}
          <Line
            type="monotone"
            dataKey="displayV"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
