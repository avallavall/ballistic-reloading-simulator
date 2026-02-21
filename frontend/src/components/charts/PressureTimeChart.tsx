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
import { formatNum } from '@/lib/utils';
import { useUnits } from '@/lib/unit-context';

interface PressureTimeChartProps {
  data: CurvePoint[];
  saamiMaxPsi?: number;
  syncId?: string;
  expanded?: boolean;
}

export default function PressureTimeChart({
  data,
  saamiMaxPsi,
  syncId,
  expanded = false,
}: PressureTimeChartProps) {
  const { formatPressure } = useUnits();

  const chartData = data.map((p) => ({
    t: p.t_ms,
    psi: p.p_psi,
    displayP: formatPressure(p.p_psi).value,
  }));

  const pressureUnit = formatPressure(0).unit;
  const saamiDisplay = saamiMaxPsi ? formatPressure(saamiMaxPsi) : undefined;

  const height = expanded ? 'h-[30rem]' : 'h-80';

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
              const point = payload[0];
              const p = formatPressure(point.payload.psi);
              return (
                <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm shadow-lg">
                  <p className="text-slate-400">
                    Tiempo: <span className="font-mono text-white">{formatNum(point.payload.t, 3)} ms</span>
                  </p>
                  <p className="text-red-400">
                    Presion: <span className="font-mono text-white">{p.formatted} {p.unit}</span>
                  </p>
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
          <Line
            type="monotone"
            dataKey="displayP"
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
