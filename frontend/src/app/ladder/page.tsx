'use client';

import { useState } from 'react';
import {
  BarChart2,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
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
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { useRifles } from '@/hooks/useRifles';
import { useBullets } from '@/hooks/useBullets';
import { usePowders } from '@/hooks/usePowders';
import { useCartridges } from '@/hooks/useCartridges';
import { useLadderTest } from '@/hooks/useSimulation';
import type { LadderTestInput, SimulationResult } from '@/lib/types';
import { formatNum, psiToMpa } from '@/lib/utils';
import { useUnits } from '@/lib/unit-context';

interface LadderRow {
  charge_grains: number;
  velocity_fps: number;
  pressure_psi: number;
  pressure_mpa: number;
  is_safe: boolean;
}

const emptyForm: LadderTestInput = {
  rifle_id: '',
  powder_id: '',
  bullet_id: '',
  coal_mm: 0,
  seating_depth_mm: 0,
  charge_start_grains: 0,
  charge_end_grains: 0,
  charge_step_grains: 0.3,
};

// Tooltip components are defined inside LadderTestPage to access the unit context

export default function LadderTestPage() {
  const { data: rifles, isLoading: loadingRifles } = useRifles();
  const { data: bullets, isLoading: loadingBullets } = useBullets();
  const { data: powders, isLoading: loadingPowders } = usePowders();
  const { data: cartridges } = useCartridges();
  const ladderMutation = useLadderTest();
  const [form, setForm] = useState<LadderTestInput>(emptyForm);
  const [results, setResults] = useState<LadderRow[] | null>(null);
  const [saamiMaxPsi, setSaamiMaxPsi] = useState<number>(62000);
  const { formatPressure, formatVelocity } = useUnits();

  const isLoadingData = loadingRifles || loadingBullets || loadingPowders;

  const rifleOptions = (rifles || []).map((r) => ({
    value: r.id,
    label: r.name,
  }));

  const bulletOptions = (bullets || []).map((b) => ({
    value: b.id,
    label: `${b.name} - ${b.weight_grains}gr`,
  }));

  const powderOptions = (powders || []).map((p) => ({
    value: p.id,
    label: `${p.name} (${p.manufacturer})`,
  }));

  const handleChange = (field: keyof LadderTestInput, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]:
        field === 'rifle_id' || field === 'powder_id' || field === 'bullet_id'
          ? value
          : Number(value),
    }));

    // Update SAAMI max when rifle changes
    if (field === 'rifle_id' && value) {
      const rifle = rifles?.find((r) => r.id === value);
      if (rifle) {
        const cartridge = cartridges?.find((c) => c.id === rifle.cartridge_id);
        if (cartridge) {
          setSaamiMaxPsi(cartridge.saami_max_pressure_psi);
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ladderMutation.mutate(form, {
      onSuccess: (data: SimulationResult[]) => {
        const rows: LadderRow[] = data.map((sim, i) => ({
          charge_grains: Number((form.charge_start_grains + i * form.charge_step_grains).toFixed(2)),
          velocity_fps: sim.muzzle_velocity_fps,
          pressure_psi: sim.peak_pressure_psi,
          pressure_mpa: psiToMpa(sim.peak_pressure_psi),
          is_safe: sim.is_safe,
        }));
        setResults(rows);
      },
    });
  };

  const saamiDisplay = formatPressure(saamiMaxPsi);
  const pressureUnit = formatPressure(0).unit;
  const velocityUnit = formatVelocity(0).unit;

  // Compute display values for charts
  const chartData = results?.map((row) => ({
    ...row,
    displayVelocity: formatVelocity(row.velocity_fps).value,
    displayPressure: formatPressure(row.pressure_psi).value,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Ladder Test</h2>
        <p className="mt-1 text-sm text-slate-400">
          Simula un rango de cargas para encontrar el nodo optimo de velocidad y presion
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Form */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 size={18} className="text-blue-400" />
                Parametros
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Select
                    label="Rifle"
                    id="rifle_id"
                    value={form.rifle_id}
                    onChange={(e) => handleChange('rifle_id', e.target.value)}
                    options={rifleOptions}
                    placeholder="Seleccionar rifle"
                    required
                  />
                  <Select
                    label="Proyectil"
                    id="bullet_id"
                    value={form.bullet_id}
                    onChange={(e) => handleChange('bullet_id', e.target.value)}
                    options={bulletOptions}
                    placeholder="Seleccionar proyectil"
                    required
                  />
                  <Select
                    label="Polvora"
                    id="powder_id"
                    value={form.powder_id}
                    onChange={(e) => handleChange('powder_id', e.target.value)}
                    options={powderOptions}
                    placeholder="Seleccionar polvora"
                    required
                  />
                  <Input
                    label="COAL"
                    id="coal_mm"
                    type="number"
                    step="any"
                    suffix="mm"
                    value={form.coal_mm || ''}
                    onChange={(e) => handleChange('coal_mm', e.target.value)}
                    required
                  />
                  <Input
                    label="Profundidad Asentamiento"
                    id="seating_depth_mm"
                    type="number"
                    step="any"
                    suffix="mm"
                    value={form.seating_depth_mm || ''}
                    onChange={(e) => handleChange('seating_depth_mm', e.target.value)}
                    required
                  />

                  <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                      Rango de Carga
                    </p>
                    <div className="space-y-3">
                      <Input
                        label="Inicio"
                        id="charge_start_grains"
                        type="number"
                        step="any"
                        suffix="gr"
                        value={form.charge_start_grains || ''}
                        onChange={(e) => handleChange('charge_start_grains', e.target.value)}
                        required
                      />
                      <Input
                        label="Fin"
                        id="charge_end_grains"
                        type="number"
                        step="any"
                        suffix="gr"
                        value={form.charge_end_grains || ''}
                        onChange={(e) => handleChange('charge_end_grains', e.target.value)}
                        required
                      />
                      <Input
                        label="Paso"
                        id="charge_step_grains"
                        type="number"
                        step="any"
                        suffix="gr"
                        value={form.charge_step_grains || ''}
                        onChange={(e) => handleChange('charge_step_grains', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={ladderMutation.isPending}
                  >
                    {ladderMutation.isPending ? (
                      <>
                        <Spinner size="sm" />
                        Simulando...
                      </>
                    ) : (
                      'Ejecutar Ladder Test'
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-6 lg:col-span-8">
          {ladderMutation.isError && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent>
                <div className="flex items-center gap-3">
                  <XCircle size={20} className="text-red-400" />
                  <div>
                    <p className="font-medium text-red-400">Error en el ladder test</p>
                    <p className="text-sm text-slate-400">
                      {ladderMutation.error?.message ||
                        'Error desconocido. Verifica los parametros e intenta de nuevo.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {ladderMutation.isPending && (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12">
                  <Spinner size="lg" />
                  <p className="mt-4 text-sm text-slate-400">
                    Ejecutando ladder test...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {results && !ladderMutation.isPending && (
            <>
              {/* Velocity chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Velocidad vs Carga</CardTitle>
                  <Badge>V(carga)</Badge>
                </CardHeader>
                <CardContent>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                          dataKey="charge_grains"
                          stroke="#94a3b8"
                          fontSize={12}
                          tickFormatter={(v) => formatNum(v, 1)}
                          label={{
                            value: 'Carga (gr)',
                            position: 'insideBottom',
                            offset: -5,
                            fill: '#94a3b8',
                            fontSize: 12,
                          }}
                        />
                        <YAxis
                          dataKey="displayVelocity"
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
                            const v = formatVelocity(point.payload.velocity_fps);
                            return (
                              <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm shadow-lg">
                                <p className="text-slate-400">
                                  Carga: <span className="font-mono text-white">{formatNum(point.payload.charge_grains, 1)} gr</span>
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
                          dataKey="displayVelocity"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ r: 4, fill: '#3b82f6' }}
                          activeDot={{ r: 6, fill: '#3b82f6' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Pressure chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Presion vs Carga</CardTitle>
                  <Badge variant="danger">P(carga)</Badge>
                </CardHeader>
                <CardContent>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                          dataKey="charge_grains"
                          stroke="#94a3b8"
                          fontSize={12}
                          tickFormatter={(v) => formatNum(v, 1)}
                          label={{
                            value: 'Carga (gr)',
                            position: 'insideBottom',
                            offset: -5,
                            fill: '#94a3b8',
                            fontSize: 12,
                          }}
                        />
                        <YAxis
                          dataKey="displayPressure"
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
                            const p = formatPressure(point.payload.pressure_psi);
                            return (
                              <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm shadow-lg">
                                <p className="text-slate-400">
                                  Carga: <span className="font-mono text-white">{formatNum(point.payload.charge_grains, 1)} gr</span>
                                </p>
                                <p className="text-red-400">
                                  Presion: <span className="font-mono text-white">{p.formatted} {p.unit}</span>
                                </p>
                              </div>
                            );
                          }}
                        />
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
                        <Line
                          type="monotone"
                          dataKey="displayPressure"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={{ r: 4, fill: '#ef4444' }}
                          activeDot={{ r: 6, fill: '#ef4444' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Results table */}
              <Card>
                <CardHeader>
                  <CardTitle>Resultados por Carga</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Carga (gr)</TableHead>
                        <TableHead>Velocidad ({velocityUnit})</TableHead>
                        <TableHead>Presion ({pressureUnit})</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((row, i) => {
                        const v = formatVelocity(row.velocity_fps);
                        const p = formatPressure(row.pressure_psi);
                        return (
                          <TableRow key={i}>
                            <TableCell className="font-mono font-medium text-white">
                              {formatNum(row.charge_grains, 1)}
                            </TableCell>
                            <TableCell className="font-mono">
                              {v.formatted}
                            </TableCell>
                            <TableCell className="font-mono">
                              {p.formatted}
                            </TableCell>
                            <TableCell>
                              {row.is_safe ? (
                                <Badge variant="success">
                                  <CheckCircle size={12} className="mr-1" />
                                  Seguro
                                </Badge>
                              ) : (
                                <Badge variant="danger">
                                  <AlertTriangle size={12} className="mr-1" />
                                  Peligro
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* Empty state */}
          {!results && !ladderMutation.isPending && !ladderMutation.isError && (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-slate-800 p-4">
                    <BarChart2 size={32} className="text-slate-500" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-slate-300">
                    Sin resultados
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-slate-500">
                    Configura los parametros en el panel izquierdo y define un rango de
                    carga para ejecutar el ladder test.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
