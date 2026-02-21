'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipProps,
} from 'recharts';
import type { TemperatureCurvePoint } from '@/lib/types';
import { formatNum } from '@/lib/utils';

interface TemperatureChartProps {
  data: TemperatureCurvePoint[];
  syncId?: string;
  expanded?: boolean;
}

function TempTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm shadow-lg">
      <p className="text-slate-400">
        Tiempo:{' '}
        <span className="font-mono text-white">
          {formatNum(point.t_ms, 3)} ms
        </span>
      </p>
      <p className="text-red-400">
        T gas:{' '}
        <span className="font-mono text-white">
          {formatNum(point.t_gas_k, 0)} K
        </span>
      </p>
      <p className="text-red-300">
        Q perdido:{' '}
        <span className="font-mono text-white">
          {formatNum(point.q_loss_j, 1)} J
        </span>
      </p>
    </div>
  );
}

export default function TemperatureChart({
  data,
  syncId = 'sim-time',
  expanded = false,
}: TemperatureChartProps) {
  const height = expanded ? 'h-[30rem]' : 'h-64';

  return (
    <div className={`${height} w-full`}>
      <ResponsiveContainer width="100%" height="100%" key={expanded ? 'expanded' : 'tile'}>
        <ComposedChart
          data={data}
          syncId={syncId}
          margin={{ top: 10, right: 50, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
          <XAxis
            dataKey="t_ms"
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
            yAxisId="left"
            stroke="#ef4444"
            fontSize={12}
            tickFormatter={(v) => formatNum(v, 0)}
            label={{
              value: 'T gas (K)',
              angle: -90,
              position: 'insideLeft',
              fill: '#ef4444',
              fontSize: 11,
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#fca5a5"
            fontSize={12}
            tickFormatter={(v) => formatNum(v, 0)}
            label={{
              value: 'Q perdido (J)',
              angle: 90,
              position: 'insideRight',
              fill: '#fca5a5',
              fontSize: 11,
            }}
          />
          <Tooltip content={<TempTooltip />} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="t_gas_k"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#ef4444' }}
            name="T gas"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="q_loss_j"
            stroke="#fca5a5"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 3, fill: '#fca5a5' }}
            name="Q perdido"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
