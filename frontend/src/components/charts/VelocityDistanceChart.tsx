'use client';

import {
  ResponsiveContainer,
  LineChart,
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
}

export default function VelocityDistanceChart({
  data,
}: VelocityDistanceChartProps) {
  const { formatVelocity } = useUnits();

  const chartData = data.map((p) => ({
    x_mm: p.x_mm,
    fps: p.v_fps,
    displayV: formatVelocity(p.v_fps).value,
  }));

  const velocityUnit = formatVelocity(0).unit;

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
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
              const point = payload[0];
              const v = formatVelocity(point.payload.fps);
              return (
                <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm shadow-lg">
                  <p className="text-slate-400">
                    Distancia: <span className="font-mono text-white">{formatNum(point.payload.x_mm, 1)} mm</span>
                  </p>
                  <p className="text-blue-400">
                    Velocidad: <span className="font-mono text-white">{v.formatted} {v.unit}</span>
                  </p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="displayV"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
