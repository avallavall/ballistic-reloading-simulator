'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronUp,
  ChevronDown,
  FlaskConical,
  ArrowRight,
  Settings2,
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
import { useCartridges } from '@/hooks/useCartridges';
import { useParametricSearch } from '@/hooks/useParametricSearch';
import type {
  ParametricSearchInput,
  ParametricSearchResponse,
  PowderSearchResult,
} from '@/lib/types';
import { formatNum, ftLbsToJoules } from '@/lib/utils';
import { useUnits } from '@/lib/unit-context';

type SortField =
  | 'muzzle_velocity_fps'
  | 'peak_pressure_psi'
  | 'pressure_percent'
  | 'optimal_charge_grains'
  | 'recoil_energy_ft_lbs'
  | 'efficiency'
  | 'barrel_time_ms';
type SortDir = 'asc' | 'desc';

function PressureBadge({ percent }: { percent: number }) {
  if (percent > 100) return <Badge variant="danger">{formatNum(percent, 1)}%</Badge>;
  if (percent >= 95) return <Badge variant="warning">{formatNum(percent, 1)}%</Badge>;
  if (percent >= 85) return <Badge variant="warning">{formatNum(percent, 1)}%</Badge>;
  return <Badge variant="success">{formatNum(percent, 1)}%</Badge>;
}

function PressureBar({ percent }: { percent: number }) {
  const clamped = Math.min(percent, 110);
  const color =
    percent > 100
      ? 'bg-red-500'
      : percent >= 95
        ? 'bg-yellow-500'
        : percent >= 85
          ? 'bg-yellow-500/70'
          : 'bg-green-500';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${(clamped / 110) * 100}%` }}
        />
      </div>
    </div>
  );
}

function ExpandedRow({
  result,
  saamiMaxPsi,
  formState,
}: {
  result: PowderSearchResult;
  saamiMaxPsi: number;
  formState: ParametricSearchInput;
}) {
  const { formatPressure, formatVelocity } = useUnits();
  const router = useRouter();

  const pressureUnit = formatPressure(0).unit;
  const velocityUnit = formatVelocity(0).unit;
  const saamiDisplay = formatPressure(saamiMaxPsi);

  const chartData = result.all_results.map((r) => ({
    charge: r.charge_grains,
    displayPressure: formatPressure(r.peak_pressure_psi).value,
    displayVelocity: formatVelocity(r.muzzle_velocity_fps).value,
    pressure_psi: r.peak_pressure_psi,
    velocity_fps: r.muzzle_velocity_fps,
    is_safe: r.is_safe,
  }));

  const optP = formatPressure(result.peak_pressure_psi);
  const optV = formatVelocity(result.muzzle_velocity_fps);

  const handleSimulate = () => {
    const params = new URLSearchParams({
      rifle_id: formState.rifle_id,
      bullet_id: formState.bullet_id,
      powder_id: result.powder_id,
      charge: String(result.optimal_charge_grains),
      coal: String(formState.coal_mm),
    });
    if (formState.seating_depth_mm) {
      params.set('seating_depth', String(formState.seating_depth_mm));
    }
    router.push(`/simulate?${params.toString()}`);
  };

  return (
    <tr>
      <td colSpan={10} className="border-t border-slate-700/30 bg-slate-800/30 px-4 py-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Pressure vs Charge */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Presion vs Carga
              </p>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="charge"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickFormatter={(v) => formatNum(v, 1)}
                    />
                    <YAxis
                      dataKey="displayPressure"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickFormatter={(v) => formatNum(v, 0)}
                    />
                    <Tooltip
                      content={({ active, payload }: TooltipProps<number, string>) => {
                        if (!active || !payload || !payload.length) return null;
                        const pt = payload[0].payload;
                        const p = formatPressure(pt.pressure_psi);
                        return (
                          <div className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs shadow-lg">
                            <p className="text-slate-400">Carga: {formatNum(pt.charge, 1)} gr</p>
                            <p className="text-red-400">Presion: {p.formatted} {p.unit}</p>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine
                      y={saamiDisplay.value}
                      stroke="#ef4444"
                      strokeDasharray="6 3"
                      strokeWidth={1.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="displayPressure"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#ef4444' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Velocity vs Charge */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Velocidad vs Carga
              </p>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="charge"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickFormatter={(v) => formatNum(v, 1)}
                    />
                    <YAxis
                      dataKey="displayVelocity"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickFormatter={(v) => formatNum(v, 0)}
                    />
                    <Tooltip
                      content={({ active, payload }: TooltipProps<number, string>) => {
                        if (!active || !payload || !payload.length) return null;
                        const pt = payload[0].payload;
                        const v = formatVelocity(pt.velocity_fps);
                        return (
                          <div className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs shadow-lg">
                            <p className="text-slate-400">Carga: {formatNum(pt.charge, 1)} gr</p>
                            <p className="text-blue-400">Velocidad: {v.formatted} {v.unit}</p>
                          </div>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="displayVelocity"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#3b82f6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-300">
              Carga optima:{' '}
              <span className="font-mono font-semibold text-white">
                {result.optimal_charge_grains != null ? formatNum(result.optimal_charge_grains, 1) : '—'} gr
              </span>
              {' → '}
              <span className="font-mono text-blue-400">
                {optV.formatted} {optV.unit}
              </span>
              {' @ '}
              <span className="font-mono text-red-400">
                {optP.formatted} {optP.unit}
              </span>
              {' ('}
              <span className="font-mono">{formatNum(result.pressure_percent, 1)}% SAAMI</span>
              {')'}
            </p>
            <Button size="sm" onClick={handleSimulate}>
              Simular con esta polvora
              <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function ParametricSearchPage() {
  const { data: rifles, isLoading: loadingRifles } = useRifles();
  const { data: bullets, isLoading: loadingBullets } = useBullets();
  const { data: cartridges, isLoading: loadingCartridges } = useCartridges();
  const searchMutation = useParametricSearch();
  const { formatPressure, formatVelocity, unitSystem } = useUnits();

  const [form, setForm] = useState<ParametricSearchInput>({
    rifle_id: '',
    bullet_id: '',
    cartridge_id: '',
    coal_mm: 0,
  });
  const [advancedMode, setAdvancedMode] = useState(false);
  const [advancedFields, setAdvancedFields] = useState({
    seating_depth_mm: 0,
    charge_percent_min: 70,
    charge_percent_max: 100,
    charge_steps: 5,
  });
  const [results, setResults] = useState<ParametricSearchResponse | null>(null);
  const [sortField, setSortField] = useState<SortField>('muzzle_velocity_fps');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isLoadingData = loadingRifles || loadingBullets || loadingCartridges;

  const rifleOptions = (rifles || []).map((r) => ({
    value: r.id,
    label: r.name,
  }));
  const bulletOptions = (bullets || []).map((b) => ({
    value: b.id,
    label: `${b.name} - ${b.weight_grains}gr`,
  }));
  const cartridgeOptions = (cartridges || []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const canSubmit =
    form.rifle_id && form.bullet_id && form.cartridge_id && form.coal_mm > 0;

  const handleChange = (field: keyof ParametricSearchInput, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]:
        field === 'rifle_id' || field === 'bullet_id' || field === 'cartridge_id'
          ? value
          : Number(value),
    }));
  };

  const handleAdvancedChange = (field: string, value: string) => {
    setAdvancedFields((prev) => ({
      ...prev,
      [field]: Number(value),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: ParametricSearchInput = { ...form };
    if (advancedMode) {
      if (advancedFields.seating_depth_mm > 0)
        input.seating_depth_mm = advancedFields.seating_depth_mm;
      input.charge_percent_min = advancedFields.charge_percent_min;
      input.charge_percent_max = advancedFields.charge_percent_max;
      input.charge_steps = advancedFields.charge_steps;
    }
    setExpandedId(null);
    searchMutation.mutate(input, {
      onSuccess: (data) => setResults(data),
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedResults = useMemo(() => {
    if (!results) return [];
    const sorted = [...results.results].sort((a, b) => {
      // Non-viable always at the bottom
      if (a.is_viable !== b.is_viable) return a.is_viable ? -1 : 1;
      const aVal = a[sortField];
      const bVal = b[sortField];
      const diff = (aVal as number) - (bVal as number);
      return sortDir === 'asc' ? diff : -diff;
    });
    return sorted;
  }, [results, sortField, sortDir]);

  const SortHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer select-none hover:text-slate-200"
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field &&
          (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </span>
    </TableHead>
  );

  const pressureUnit = formatPressure(0).unit;
  const velocityUnit = formatVelocity(0).unit;
  const recoilUnit = unitSystem === 'metric' ? 'J' : 'ft-lbs';

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h2 className="text-2xl font-bold text-white">Busqueda Parametrica de Polvoras</h2>
        <p className="mt-1 text-sm text-slate-400">
          Simula todas las polvoras disponibles para tu configuracion y encuentra la optima
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search size={18} className="text-blue-400" />
            Parametros de Busqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  label="Cartucho"
                  id="cartridge_id"
                  value={form.cartridge_id}
                  onChange={(e) => handleChange('cartridge_id', e.target.value)}
                  options={cartridgeOptions}
                  placeholder="Seleccionar cartucho"
                  required
                />
                <Input
                  label="COAL"
                  id="coal_mm"
                  type="number"
                  step="0.1"
                  suffix="mm"
                  value={form.coal_mm || ''}
                  onChange={(e) => handleChange('coal_mm', e.target.value)}
                  required
                />
              </div>

              {/* Advanced mode toggle */}
              <div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
                  onClick={() => setAdvancedMode(!advancedMode)}
                >
                  <Settings2 size={14} />
                  Modo avanzado
                  {advancedMode ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {advancedMode && (
                  <div className="mt-3 grid grid-cols-1 gap-4 rounded-lg border border-slate-700 bg-slate-800/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Input
                      label="Prof. Asentado"
                      id="seating_depth_mm"
                      type="number"
                      step="0.01"
                      suffix="mm"
                      value={advancedFields.seating_depth_mm || ''}
                      onChange={(e) => handleAdvancedChange('seating_depth_mm', e.target.value)}
                    />
                    <Input
                      label="% Carga Min"
                      id="charge_percent_min"
                      type="number"
                      min={50}
                      max={90}
                      suffix="%"
                      value={advancedFields.charge_percent_min}
                      onChange={(e) => handleAdvancedChange('charge_percent_min', e.target.value)}
                    />
                    <Input
                      label="% Carga Max"
                      id="charge_percent_max"
                      type="number"
                      min={80}
                      max={110}
                      suffix="%"
                      value={advancedFields.charge_percent_max}
                      onChange={(e) => handleAdvancedChange('charge_percent_max', e.target.value)}
                    />
                    <Input
                      label="Pasos por Polvora"
                      id="charge_steps"
                      type="number"
                      min={3}
                      max={10}
                      value={advancedFields.charge_steps}
                      onChange={(e) => handleAdvancedChange('charge_steps', e.target.value)}
                    />
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={!canSubmit || searchMutation.isPending}
              >
                {searchMutation.isPending ? (
                  <>
                    <Spinner size="sm" />
                    Simulando polvoras...
                  </>
                ) : (
                  <>
                    <FlaskConical size={16} />
                    Buscar Polvora Optima
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {searchMutation.isError && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent>
            <p className="font-medium text-red-400">Error en la busqueda parametrica</p>
            <p className="mt-1 text-sm text-slate-400">
              {searchMutation.error?.message || 'Error desconocido. Verifica los parametros.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {searchMutation.isPending && (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12">
              <Spinner size="lg" />
              <p className="mt-4 text-sm text-slate-400">
                Simulando todas las polvoras disponibles...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && !searchMutation.isPending && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="text-center">
              <CardContent>
                <p className="text-sm text-slate-400">Polvoras Analizadas</p>
                <p className="mt-1 font-mono text-2xl font-bold text-white">
                  {results.total_powders_tested}
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent>
                <p className="text-sm text-slate-400">Polvoras Viables</p>
                <p className="mt-1 font-mono text-2xl font-bold text-green-400">
                  {results.viable_powders}
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent>
                <p className="text-sm text-slate-400">Tiempo de Analisis</p>
                <p className="mt-1 font-mono text-2xl font-bold text-blue-400">
                  {results.total_time_ms < 1000
                    ? `${formatNum(results.total_time_ms, 0)} ms`
                    : `${formatNum(results.total_time_ms / 1000, 1)} s`}
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent>
                <p className="text-sm text-slate-400">SAAMI Max</p>
                <p className="mt-1 font-mono text-2xl font-bold text-red-400">
                  {formatPressure(results.saami_max_psi).formatted}
                  <span className="ml-1 text-sm font-normal text-slate-400">
                    {formatPressure(results.saami_max_psi).unit}
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ranking info */}
          <Card>
            <CardHeader>
              <CardTitle>
                Ranking de Polvoras
              </CardTitle>
              <Badge>{sortedResults.length} resultados</Badge>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Polvora</TableHead>
                      <SortHeader field="optimal_charge_grains">Carga (gr)</SortHeader>
                      <SortHeader field="muzzle_velocity_fps">Velocidad ({velocityUnit})</SortHeader>
                      <SortHeader field="peak_pressure_psi">Presion ({pressureUnit})</SortHeader>
                      <SortHeader field="pressure_percent">% SAAMI</SortHeader>
                      <SortHeader field="recoil_energy_ft_lbs">Retroceso ({recoilUnit})</SortHeader>
                      <SortHeader field="efficiency">Eficiencia</SortHeader>
                      <SortHeader field="barrel_time_ms">Barrel Time</SortHeader>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedResults.map((r, idx) => {
                      const vel = formatVelocity(r.muzzle_velocity_fps);
                      const pres = formatPressure(r.peak_pressure_psi);
                      const recoilVal =
                        unitSystem === 'metric'
                          ? formatNum(ftLbsToJoules(r.recoil_energy_ft_lbs), 1)
                          : formatNum(r.recoil_energy_ft_lbs, 1);
                      const isExpanded = expandedId === r.powder_id;

                      return (
                        <RowGroup key={r.powder_id}>
                          <TableRow
                            className={`cursor-pointer ${!r.is_viable ? 'opacity-40' : ''} ${isExpanded ? 'bg-slate-800/70' : ''}`}
                            onClick={() =>
                              setExpandedId(isExpanded ? null : r.powder_id)
                            }
                          >
                            <TableCell className="font-mono text-slate-500">
                              {idx + 1}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-white">{r.powder_name}</p>
                                <p className="text-xs text-slate-500">{r.manufacturer}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">
                              {r.optimal_charge_grains != null ? formatNum(r.optimal_charge_grains, 1) : '—'}
                            </TableCell>
                            <TableCell className="font-mono text-blue-400">
                              {vel.formatted}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <span className="font-mono text-slate-300">{pres.formatted}</span>
                                <PressureBar percent={r.pressure_percent} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <PressureBadge percent={r.pressure_percent} />
                            </TableCell>
                            <TableCell className="font-mono">
                              {recoilVal}
                            </TableCell>
                            <TableCell className="font-mono text-cyan-400">
                              {formatNum(r.efficiency, 2)}
                            </TableCell>
                            <TableCell className="font-mono">
                              {formatNum(r.barrel_time_ms, 3)}
                            </TableCell>
                            <TableCell>
                              {r.is_viable ? (
                                <Badge variant="success">Viable</Badge>
                              ) : (
                                <Badge variant="danger">No apta</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <ExpandedRow
                              result={r}
                              saamiMaxPsi={results.saami_max_psi}
                              formState={form}
                            />
                          )}
                        </RowGroup>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state */}
      {!results && !searchMutation.isPending && !searchMutation.isError && (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-slate-800 p-4">
                <FlaskConical size={32} className="text-slate-500" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-slate-300">
                Sin resultados
              </h3>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Selecciona un rifle, proyectil, cartucho y COAL, luego pulsa
                &quot;Buscar Polvora Optima&quot; para comparar todas las polvoras.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
