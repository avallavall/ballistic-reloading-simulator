'use client';

import { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ReferenceLine,
  BarChart,
  Bar,
  Legend,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { useValidation } from '@/hooks/useValidation';
import type { ValidationLoadResult, ValidationResponse } from '@/lib/types';
import { formatNum } from '@/lib/utils';

// Color palette per caliber
const CALIBER_COLORS: Record<string, string> = {
  '.308 Winchester': '#3b82f6',
  '6.5 Creedmoor': '#10b981',
  '.223 Remington': '#f59e0b',
  '.300 Winchester Magnum': '#ef4444',
};

function getCalibreColor(caliber: string): string {
  return CALIBER_COLORS[caliber] || '#6b7280';
}

type SortField = 'error_pct' | 'caliber' | 'published_velocity_fps';
type SortDir = 'asc' | 'desc';

export default function ValidationPage() {
  const { mutate: runValidation, data, isPending, isError, error } = useValidation();
  const [sortField, setSortField] = useState<SortField>('error_pct');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedResults = data
    ? [...data.results].sort((a, b) => {
        const multiplier = sortDir === 'asc' ? 1 : -1;
        if (sortField === 'caliber') {
          return multiplier * a.caliber.localeCompare(b.caliber);
        }
        return multiplier * ((a[sortField] as number) - (b[sortField] as number));
      })
    : [];

  // Scatter data: predicted vs published
  const scatterData = data
    ? data.results.map((r) => ({
        published: r.published_velocity_fps,
        predicted: r.predicted_velocity_fps,
        caliber: r.caliber,
        load_id: r.load_id,
        bullet_desc: r.bullet_desc,
        powder_name: r.powder_name,
        error_pct: r.error_pct,
      }))
    : [];

  // Bar chart data: grouped by load
  const barData = data
    ? data.results.map((r) => ({
        name: r.load_id.replace(/^(308|65cm|223|300wm)-/, ''),
        caliber: r.caliber,
        published: r.published_velocity_fps,
        predicted: r.predicted_velocity_fps,
        error_pct: r.error_pct,
        fill: getCalibreColor(r.caliber),
      }))
    : [];

  // Compute axis range for scatter
  const allVels = scatterData.flatMap((d) => [d.published, d.predicted]);
  const minVel = allVels.length ? Math.floor(Math.min(...allVels) / 100) * 100 - 100 : 2000;
  const maxVel = allVels.length ? Math.ceil(Math.max(...allVels) / 100) * 100 + 100 : 4000;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <ShieldCheck size={28} className="text-blue-400" />
            Validacion del Modelo
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Comparacion contra datos publicados de manuales de recarga
          </p>
        </div>
        <Button
          onClick={() => runValidation()}
          disabled={isPending}
          className="flex items-center gap-2"
        >
          {isPending ? (
            <>
              <Spinner className="h-4 w-4" />
              Ejecutando validacion...
            </>
          ) : (
            <>
              <ShieldCheck size={16} />
              Ejecutar Validacion
            </>
          )}
        </Button>
      </div>

      {/* Error state */}
      {isError && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="text-red-400" size={20} />
            <span className="text-red-400">
              Error al ejecutar la validacion: {(error as Error)?.message || 'Error desconocido'}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isPending && (
        <Card>
          <CardContent className="flex items-center justify-center gap-3 py-12">
            <Spinner className="h-6 w-6" />
            <span className="text-slate-400">Ejecutando 21 simulaciones de referencia...</span>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryCard
              title="Tasa de Acierto"
              value={`${formatNum(data.pass_rate_pct, 1)}%`}
              subtitle={`${data.passing_loads}/${data.total_loads} cargas dentro del 5%`}
              icon={data.pass_rate_pct >= 80 ? CheckCircle : AlertTriangle}
              variant={data.pass_rate_pct >= 80 ? 'success' : 'warning'}
            />
            <SummaryCard
              title="Error Medio"
              value={`${formatNum(data.mean_error_pct, 2)}%`}
              subtitle={data.mean_error_pct < 5 ? 'Dentro del objetivo (<5%)' : 'Por encima del objetivo (>5%)'}
              icon={data.mean_error_pct < 5 ? CheckCircle : XCircle}
              variant={data.mean_error_pct < 5 ? 'success' : 'danger'}
            />
            <SummaryCard
              title="Peor Caso"
              value={`${formatNum(data.max_error_pct, 2)}%`}
              subtitle={data.worst_load_id}
              icon={data.max_error_pct < 8 ? CheckCircle : AlertTriangle}
              variant={data.max_error_pct < 8 ? 'success' : 'warning'}
            />
          </div>

          {/* Scatter plot */}
          <Card>
            <CardHeader>
              <CardTitle className="text-white">
                Velocidad Predicha vs Publicada (FPS)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap gap-4">
                {Object.entries(CALIBER_COLORS).map(([cal, color]) => (
                  <div key={cal} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-slate-400">{cal}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    type="number"
                    dataKey="published"
                    name="Publicada"
                    unit=" FPS"
                    domain={[minVel, maxVel]}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    label={{
                      value: 'Velocidad Publicada (FPS)',
                      position: 'bottom',
                      fill: '#94a3b8',
                      fontSize: 12,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="predicted"
                    name="Predicha"
                    unit=" FPS"
                    domain={[minVel, maxVel]}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    label={{
                      value: 'Velocidad Predicha (FPS)',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#94a3b8',
                      fontSize: 12,
                    }}
                  />
                  <RTooltip
                    content={({ payload }) => {
                      if (!payload || payload.length === 0) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded border border-slate-600 bg-slate-800 p-3 text-sm shadow-lg">
                          <p className="font-medium text-white">{d.load_id}</p>
                          <p className="text-slate-300">{d.bullet_desc} / {d.powder_name}</p>
                          <p className="text-slate-400">
                            Publicada: {d.published} FPS
                          </p>
                          <p className="text-slate-400">
                            Predicha: {d.predicted} FPS
                          </p>
                          <p className={d.error_pct < 5 ? 'text-green-400' : 'text-red-400'}>
                            Error: {formatNum(d.error_pct, 2)}%
                          </p>
                        </div>
                      );
                    }}
                  />
                  {/* 45-degree perfect match line */}
                  <ReferenceLine
                    segment={[
                      { x: minVel, y: minVel },
                      { x: maxVel, y: maxVel },
                    ]}
                    stroke="#475569"
                    strokeDasharray="5 5"
                    label={{
                      value: 'Coincidencia perfecta',
                      position: 'insideBottomRight',
                      fill: '#64748b',
                      fontSize: 11,
                    }}
                  />
                  {/* One scatter per caliber for coloring */}
                  {Object.entries(CALIBER_COLORS).map(([cal, color]) => (
                    <Scatter
                      key={cal}
                      data={scatterData.filter((d) => d.caliber === cal)}
                      fill={color}
                      strokeWidth={1}
                      stroke={color}
                      r={6}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-white">
                Velocidad por Carga: Publicada vs Predicha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={barData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    label={{
                      value: 'Velocidad (FPS)',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#94a3b8',
                      fontSize: 12,
                    }}
                  />
                  <RTooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                    }}
                    labelStyle={{ color: '#f8fafc' }}
                    itemStyle={{ color: '#94a3b8' }}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Bar
                    dataKey="published"
                    name="Publicada"
                    fill="#3b82f6"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="predicted"
                    name="Predicha"
                    radius={[2, 2, 0, 0]}
                  >
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} opacity={0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detail table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Detalle por Carga</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button
                          onClick={() => handleSort('caliber')}
                          className="flex items-center gap-1 text-left"
                        >
                          Calibre
                          <ArrowUpDown size={12} />
                        </button>
                      </TableHead>
                      <TableHead>Proyectil</TableHead>
                      <TableHead>Polvora</TableHead>
                      <TableHead className="text-right">Carga (gr)</TableHead>
                      <TableHead className="text-right">Canon (mm)</TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('published_velocity_fps')}
                          className="flex items-center gap-1 text-left"
                        >
                          Vel. Publicada
                          <ArrowUpDown size={12} />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Vel. Predicha</TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('error_pct')}
                          className="flex items-center gap-1 text-left"
                        >
                          Error %
                          <ArrowUpDown size={12} />
                        </button>
                      </TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedResults.map((r) => (
                      <TableRow
                        key={r.load_id}
                        className={
                          r.is_pass
                            ? 'hover:bg-green-900/10'
                            : 'bg-red-900/10 hover:bg-red-900/20'
                        }
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: getCalibreColor(r.caliber) }}
                            />
                            <span className="text-slate-300">{r.caliber}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">{r.bullet_desc}</TableCell>
                        <TableCell className="text-slate-300">{r.powder_name}</TableCell>
                        <TableCell className="text-right text-slate-300">
                          {formatNum(r.charge_gr, 1)}
                        </TableCell>
                        <TableCell className="text-right text-slate-300">
                          {r.barrel_length_mm}
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-300">
                          {r.published_velocity_fps}
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-300">
                          {formatNum(r.predicted_velocity_fps, 0)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${
                            r.error_pct < 3 ? 'text-green-400' : r.error_pct < 5 ? 'text-yellow-400' : 'text-red-400'
                          }`}
                        >
                          {formatNum(r.error_pct, 2)}%
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.is_pass ? 'success' : 'danger'}>
                            {r.is_pass ? 'OK' : 'FALLO'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Initial state */}
      {!data && !isPending && !isError && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <ShieldCheck size={48} className="text-slate-500" />
            <p className="text-slate-400">
              Haz clic en &quot;Ejecutar Validacion&quot; para comparar las predicciones del simulador
              contra 21 cargas de referencia de manuales de recarga.
            </p>
            <p className="text-sm text-slate-500">
              Se evaluaran 4 calibres: .308 Win, 6.5 Creedmoor, .223 Rem, .300 Win Mag
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// Summary Card component
// ============================================================

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof CheckCircle;
  variant: 'success' | 'warning' | 'danger';
}

function SummaryCard({ title, value, subtitle, icon: Icon, variant }: SummaryCardProps) {
  const variantStyles = {
    success: 'border-green-500/30',
    warning: 'border-yellow-500/30',
    danger: 'border-red-500/30',
  };
  const iconColors = {
    success: 'text-green-400',
    warning: 'text-yellow-400',
    danger: 'text-red-400',
  };

  return (
    <Card className={variantStyles[variant]}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="mt-1 text-2xl font-bold text-white">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>
          <Icon size={32} className={iconColors[variant]} />
        </div>
      </CardContent>
    </Card>
  );
}
