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
import type { EnergyCurvePoint, RecoilCurvePoint } from '@/lib/types';
import { formatNum } from '@/lib/utils';

interface EnergyRecoilChartProps {
  energyData: EnergyCurvePoint[];
  recoilData: RecoilCurvePoint[];
  expanded?: boolean;
}

function EnergyTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm shadow-lg">
      <p className="text-slate-400">
        Distancia:{' '}
        <span className="font-mono text-white">
          {formatNum(point.x_mm, 1)} mm
        </span>
      </p>
      <p className="text-green-400">
        KE:{' '}
        <span className="font-mono text-white">
          {formatNum(point.ke_ft_lbs, 0)} ft-lbs
        </span>
      </p>
      <p className="text-green-300">
        KE:{' '}
        <span className="font-mono text-white">
          {formatNum(point.ke_j, 0)} J
        </span>
      </p>
    </div>
  );
}

function RecoilTooltip({ active, payload }: TooltipProps<number, string>) {
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
      <p className="text-green-400">
        Impulso:{' '}
        <span className="font-mono text-white">
          {formatNum(point.impulse_ns, 2)} N-s
        </span>
      </p>
    </div>
  );
}

export default function EnergyRecoilChart({
  energyData,
  recoilData,
  expanded = false,
}: EnergyRecoilChartProps) {
  const subHeight = expanded ? 'h-56' : 'h-32';

  return (
    <div className="flex w-full flex-col gap-2">
      {/* Top: Kinetic Energy vs Distance */}
      <div className={`${subHeight} w-full`}>
        <ResponsiveContainer width="100%" height="100%" key={expanded ? 'ke-expanded' : 'ke-tile'}>
          <LineChart
            data={energyData}
            syncId="sim-distance"
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis
              dataKey="x_mm"
              stroke="#94a3b8"
              fontSize={11}
              tickFormatter={(v) => formatNum(v, 0)}
              label={{
                value: 'Distancia (mm)',
                position: 'insideBottom',
                offset: -3,
                fill: '#94a3b8',
                fontSize: 10,
              }}
            />
            <YAxis
              stroke="#22c55e"
              fontSize={11}
              tickFormatter={(v) => formatNum(v, 0)}
              label={{
                value: 'KE (ft-lbs)',
                angle: -90,
                position: 'insideLeft',
                fill: '#22c55e',
                fontSize: 10,
              }}
            />
            <Tooltip content={<EnergyTooltip />} />
            <Line
              type="monotone"
              dataKey="ke_ft_lbs"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: '#22c55e' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom: Recoil Impulse vs Time */}
      <div className={`${subHeight} w-full`}>
        <ResponsiveContainer width="100%" height="100%" key={expanded ? 'recoil-expanded' : 'recoil-tile'}>
          <LineChart
            data={recoilData}
            syncId="sim-time"
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis
              dataKey="t_ms"
              stroke="#94a3b8"
              fontSize={11}
              tickFormatter={(v) => formatNum(v, 2)}
              label={{
                value: 'Tiempo (ms)',
                position: 'insideBottom',
                offset: -3,
                fill: '#94a3b8',
                fontSize: 10,
              }}
            />
            <YAxis
              stroke="#4ade80"
              fontSize={11}
              tickFormatter={(v) => formatNum(v, 1)}
              label={{
                value: 'Impulso (N-s)',
                angle: -90,
                position: 'insideLeft',
                fill: '#4ade80',
                fontSize: 10,
              }}
            />
            <Tooltip content={<RecoilTooltip />} />
            <Line
              type="monotone"
              dataKey="impulse_ns"
              stroke="#4ade80"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: '#4ade80' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
