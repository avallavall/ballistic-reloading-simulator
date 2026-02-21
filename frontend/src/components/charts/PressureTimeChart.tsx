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
  ReferenceLine,
  type TooltipProps,
} from 'recharts';
import type { CurvePoint } from '@/lib/types';
import { formatNum } from '@/lib/utils';
import { useUnits } from '@/lib/unit-context';

interface PressureTimeChartProps {
  data: CurvePoint[];
  saamiMaxPsi?: number;
  syncId?: string;
  expanded?: boolean;
  upperData?: CurvePoint[];
  lowerData?: CurvePoint[];
  showBands?: boolean;
}

export default function PressureTimeChart({
  data,
  saamiMaxPsi,
  syncId,
  expanded = false,
  upperData,
  lowerData,
  showBands = true,
}: PressureTimeChartProps) {
  const { formatPressure } = useUnits();

  const hasBands = showBands && upperData && lowerData && upperData.length > 0 && lowerData.length > 0;

  const pressureUnit = formatPressure(0).unit;
  const saamiDisplay = saamiMaxPsi ? formatPressure(saamiMaxPsi) : undefined;

  // Build chart data: merge center + band data
  const chartData = data.map((p, i) => {
    const displayP = formatPressure(p.p_psi).value;
    const base: Record<string, number> = {
      t: p.t_ms,
      psi: p.p_psi,
      displayP,
    };
    if (hasBands) {
      const upperP = formatPressure(upperData[i]?.p_psi ?? p.p_psi).value;
      const lowerP = formatPressure(lowerData[i]?.p_psi ?? p.p_psi).value;
      base.p_upper = upperP;
      base.p_lower = lowerP;
      base.p_band = upperP - lowerP;
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
            dataKey="t"
            stroke="#94a3b8"
            fontSize={12}
            tickFormatter={(v) => formatNum(v, 2)}
            label={{
              value: 'Tiempo (ms)',
              position: 'insideBottom',
              offset: -5,
              fill: '#94a3b8',
              fontSize: 12,
            }}
          />
          <YAxis
            dataKey="displayP"
            stroke="#94a3b8"
            fontSize={12}
            tickFormatter={(v) => formatNum(v, 0)}
            label={{
              value: `Presion (${pressureUnit})`,
              angle: -90,
              position: 'insideLeft',
              fill: '#94a3b8',
              fontSize: 12,
            }}
          />
          <Tooltip
            content={({ active, payload }: TooltipProps<number, string>) => {
              if (!active || !payload || !payload.length) return null;
              const point = payload.find((p) => p.dataKey === 'displayP')?.payload ?? payload[0]?.payload;
              if (!point) return null;
              const p = formatPressure(point.psi);
              return (
                <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm shadow-lg">
                  <p className="text-slate-400">
                    Tiempo: <span className="font-mono text-white">{formatNum(point.t, 3)} ms</span>
                  </p>
                  <p className="text-red-400">
                    Presion: <span className="font-mono text-white">{p.formatted} {p.unit}</span>
                  </p>
                  {hasBands && point.p_upper !== undefined && (
                    <p className="text-blue-400 text-xs mt-1">
                      Banda: {formatNum(point.p_lower, 0)} - {formatNum(point.p_upper, 0)} {pressureUnit}
                    </p>
                  )}
                </div>
              );
            }}
          />
          {saamiDisplay && (
            <ReferenceLine
              y={saamiDisplay.value}
              stroke="#ef4444"
              strokeDasharray="8 4"
              strokeWidth={2}
              label={{
                value: `SAAMI Max: ${saamiDisplay.formatted} ${saamiDisplay.unit}`,
                fill: '#ef4444',
                fontSize: 11,
                position: 'right',
              }}
            />
          )}

          {/* Error bands (only when showBands && band data exists) */}
          {hasBands && (
            <>
              {/* Invisible lower bound */}
              <Area
                type="monotone"
                dataKey="p_lower"
                stackId="error"
                stroke="none"
                fill="transparent"
                fillOpacity={0}
                isAnimationActive={false}
              />
              {/* Visible band delta */}
              <Area
                type="monotone"
                dataKey="p_band"
                stackId="error"
                stroke="none"
                fill="#ef4444"
                fillOpacity={0.15}
                isAnimationActive={false}
              />
              {/* Dashed boundary lines */}
              <Line
                type="monotone"
                dataKey="p_upper"
                stroke="#ef4444"
                strokeDasharray="4 4"
                dot={false}
                strokeWidth={1}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="p_lower"
                stroke="#ef4444"
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
            dataKey="displayP"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#ef4444' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
