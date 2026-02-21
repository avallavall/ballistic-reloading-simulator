'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  type TooltipProps,
} from 'recharts';
import type { CurvePoint } from '@/lib/types';
import { formatNum, psiToMpa } from '@/lib/utils';

interface HarmonicsChartProps {
  data: CurvePoint[];
  barrelTimeMs: number;
  optimalBarrelTimes: number[];
  obtMatch: boolean;
  syncId?: string;
  expanded?: boolean;
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0];
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm shadow-lg">
      <p className="text-slate-400">
        Tiempo: <span className="font-mono text-white">{formatNum(point.payload.t, 3)} ms</span>
      </p>
      <p className="text-red-400">
        Presion: <span className="font-mono text-white">{formatNum(point.payload.valueMpa, 1)} MPa</span>
      </p>
    </div>
  );
}

export default function HarmonicsChart({
  data,
  barrelTimeMs,
  optimalBarrelTimes,
  obtMatch,
  syncId,
  expanded = false,
}: HarmonicsChartProps) {
  const chartData = data.map((p) => ({
    t: p.t_ms,
    value: p.p_psi,
    valueMpa: psiToMpa(p.p_psi),
  }));

  // Filter OBT lines to only show those within the chart time range
  const maxTime = chartData.length > 0 ? chartData[chartData.length - 1].t : 0;
  const visibleObts = optimalBarrelTimes.filter((t) => t <= maxTime * 1.1);

  const height = expanded ? 'h-[30rem]' : 'h-64';

  return (
    <div className={`${height} w-full`}>
      <ResponsiveContainer width="100%" height="100%" key={expanded ? 'expanded' : 'tile'}>
        <LineChart
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
            dataKey="valueMpa"
            stroke="#94a3b8"
            fontSize={12}
            tickFormatter={(v) => formatNum(v, 0)}
            label={{
              value: 'Presion (MPa)',
              angle: -90,
              position: 'insideLeft',
              fill: '#94a3b8',
              fontSize: 12,
            }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* OBT vertical lines (nodes) */}
          {visibleObts.map((obtMs, i) => (
            <ReferenceLine
              key={`obt-${i}`}
              x={obtMs}
              stroke="#22c55e"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={
                i === 0
                  ? {
                      value: 'OBT',
                      fill: '#22c55e',
                      fontSize: 10,
                      position: 'top',
                    }
                  : undefined
              }
            />
          ))}

          {/* Barrel time vertical line */}
          <ReferenceLine
            x={barrelTimeMs}
            stroke={obtMatch ? '#22c55e' : '#f59e0b'}
            strokeWidth={2}
            label={{
              value: `Salida: ${formatNum(barrelTimeMs, 3)} ms`,
              fill: obtMatch ? '#22c55e' : '#f59e0b',
              fontSize: 11,
              position: 'top',
            }}
          />

          <Line
            type="monotone"
            dataKey="valueMpa"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#ef4444' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
