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
import type { BurnCurvePoint } from '@/lib/types';
import { formatNum } from '@/lib/utils';

interface BurnProgressChartProps {
  data: BurnCurvePoint[];
  syncId?: string;
  expanded?: boolean;
}

function BurnTooltip({ active, payload }: TooltipProps<number, string>) {
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
      <p className="text-orange-400">
        Z:{' '}
        <span className="font-mono text-white">
          {formatNum(point.z, 3)}
        </span>
      </p>
      <p className="text-orange-300">
        dZ/dt:{' '}
        <span className="font-mono text-white">
          {formatNum(point.dz_dt, 0)} s<sup>-1</sup>
        </span>
      </p>
    </div>
  );
}

export default function BurnProgressChart({
  data,
  syncId = 'sim-time',
  expanded = false,
}: BurnProgressChartProps) {
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
            stroke="#f97316"
            fontSize={12}
            domain={[0, 1]}
            tickFormatter={(v) => formatNum(v, 1)}
            label={{
              value: 'Z (fraccion quemada)',
              angle: -90,
              position: 'insideLeft',
              fill: '#f97316',
              fontSize: 11,
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#fdba74"
            fontSize={12}
            tickFormatter={(v) => formatNum(v, 0)}
            label={{
              value: 'dZ/dt (1/s)',
              angle: 90,
              position: 'insideRight',
              fill: '#fdba74',
              fontSize: 11,
            }}
          />
          <Tooltip content={<BurnTooltip />} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="z"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#f97316' }}
            name="Z"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="dz_dt"
            stroke="#fdba74"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 3, fill: '#fdba74' }}
            name="dZ/dt"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
