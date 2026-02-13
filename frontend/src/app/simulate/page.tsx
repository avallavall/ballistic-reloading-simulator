'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Activity, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import SimulationForm from '@/components/forms/SimulationForm';
import PressureTimeChart from '@/components/charts/PressureTimeChart';
import VelocityDistanceChart from '@/components/charts/VelocityDistanceChart';
import HarmonicsChart from '@/components/charts/HarmonicsChart';
import { useRifles } from '@/hooks/useRifles';
import { useBullets } from '@/hooks/useBullets';
import { usePowders } from '@/hooks/usePowders';
import { useSimulation } from '@/hooks/useSimulation';
import type { SimulationInput, SimulationResult } from '@/lib/types';
import {
  formatNum,
  psiToMpa,
  fpsToMs,
  ftLbsToJoules,
  getRecoilLevel,
  getPressureSafetyLevel,
  getSafetyColor,
  getSafetyBgColor,
} from '@/lib/utils';
import { useUnits } from '@/lib/unit-context';

function SafetyIndicator({
  result,
  saamiMaxPsi,
}: {
  result: SimulationResult;
  saamiMaxPsi: number;
}) {
  const { formatPressure } = useUnits();
  const level = getPressureSafetyLevel(result.peak_pressure_psi, saamiMaxPsi);
  const ratio = (result.peak_pressure_psi / saamiMaxPsi) * 100;
  const saami = formatPressure(saamiMaxPsi);

  const icons = {
    safe: <CheckCircle size={20} />,
    warning: <AlertTriangle size={20} />,
    danger: <XCircle size={20} />,
  };

  const labels = {
    safe: 'SEGURO',
    warning: 'PRECAUCION',
    danger: 'PELIGRO - EXCEDE SAAMI',
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-4 ${getSafetyBgColor(level)}`}
    >
      <span className={getSafetyColor(level)}>{icons[level]}</span>
      <div>
        <p className={`font-semibold ${getSafetyColor(level)}`}>
          {labels[level]}
        </p>
        <p className="text-sm text-slate-400">
          {formatNum(ratio, 1)}% de la presion maxima SAAMI ({saami.formatted} {saami.unit})
        </p>
      </div>
    </div>
  );
}

function ResultCards({ result }: { result: SimulationResult }) {
  const { unitSystem, formatPressure, formatVelocity } = useUnits();
  const pressure = formatPressure(result.peak_pressure_psi);
  const velocity = formatVelocity(result.muzzle_velocity_fps);

  // Secondary values in the alternate system
  const pressureAlt = unitSystem === 'metric'
    ? `${formatNum(result.peak_pressure_psi, 0)} PSI`
    : `${formatNum(psiToMpa(result.peak_pressure_psi), 1)} MPa`;
  const velocityAlt = unitSystem === 'metric'
    ? `${formatNum(result.muzzle_velocity_fps, 0)} FPS`
    : `${formatNum(fpsToMs(result.muzzle_velocity_fps), 1)} m/s`;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="text-center">
        <CardContent>
          <p className="text-sm text-slate-400">Presion pico</p>
          <p className="mt-1 font-mono text-2xl font-bold text-red-400">
            {pressure.formatted}
            <span className="ml-1 text-sm font-normal text-slate-400">{pressure.unit}</span>
          </p>
          <p className="mt-0.5 font-mono text-sm text-slate-500">
            {pressureAlt}
          </p>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent>
          <p className="text-sm text-slate-400">Velocidad en boca</p>
          <p className="mt-1 font-mono text-2xl font-bold text-blue-400">
            {velocity.formatted}
            <span className="ml-1 text-sm font-normal text-slate-400">{velocity.unit}</span>
          </p>
          <p className="mt-0.5 font-mono text-sm text-slate-500">
            {velocityAlt}
          </p>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent>
          <p className="text-sm text-slate-400">Tiempo en canon</p>
          <p className="mt-1 font-mono text-2xl font-bold text-green-400">
            {formatNum(result.barrel_time_ms, 3)}
            <span className="ml-1 text-sm font-normal text-slate-400">ms</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StructuralCards({ result }: { result: SimulationResult }) {
  const { unitSystem } = useUnits();

  // hoop_stress_mpa comes from API in MPa; convert to PSI for imperial
  const hoopValue = unitSystem === 'imperial'
    ? formatNum(result.hoop_stress_mpa / 0.00689476, 0)
    : formatNum(result.hoop_stress_mpa, 1);
  const hoopUnit = unitSystem === 'imperial' ? 'PSI' : 'MPa';

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="text-center">
        <CardContent>
          <p className="text-sm text-slate-400">Hoop Stress</p>
          <p className="mt-1 font-mono text-xl font-bold text-orange-400">
            {hoopValue}
            <span className="ml-1 text-sm font-normal text-slate-400">{hoopUnit}</span>
          </p>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent>
          <p className="text-sm text-slate-400">Expansion Vaina</p>
          <p className="mt-1 font-mono text-xl font-bold text-yellow-400">
            {formatNum(result.case_expansion_mm * 1000, 1)}
            <span className="ml-1 text-sm font-normal text-slate-400">um</span>
          </p>
          <p className="mt-0.5 font-mono text-xs text-slate-500">
            {formatNum(result.case_expansion_mm, 4)} mm
          </p>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent>
          <p className="text-sm text-slate-400">Erosion/Disparo</p>
          <p className="mt-1 font-mono text-xl font-bold text-purple-400">
            {formatNum(result.erosion_per_shot_mm * 1000, 2)}
            <span className="ml-1 text-sm font-normal text-slate-400">um</span>
          </p>
          <p className="mt-0.5 font-mono text-xs text-slate-500">
            {formatNum(result.erosion_per_shot_mm, 5)} mm
          </p>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent>
          <p className="text-sm text-slate-400">OBT Match</p>
          <p className="mt-1">
            {result.obt_match ? (
              <Badge variant="success">En nodo optimo</Badge>
            ) : (
              <Badge variant="warning">Fuera de nodo</Badge>
            )}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500">
            Freq: {formatNum(result.barrel_frequency_hz, 0)} Hz
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function RecoilCards({ result }: { result: SimulationResult }) {
  const { unitSystem, formatVelocity: fmtVel } = useUnits();
  const level = getRecoilLevel(result.recoil_energy_ft_lbs);
  const energyJ = ftLbsToJoules(result.recoil_energy_ft_lbs);
  const recoilVel = fmtVel(result.recoil_velocity_fps);
  const recoilVelAlt = unitSystem === 'metric'
    ? `${formatNum(result.recoil_velocity_fps, 1)} FPS`
    : `${formatNum(fpsToMs(result.recoil_velocity_fps), 2)} m/s`;

  const levelLabels: Record<string, string> = {
    light: 'Ligero',
    moderate: 'Moderado',
    heavy: 'Fuerte',
    very_heavy: 'Muy Fuerte',
  };

  const levelVariants: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
    light: 'success',
    moderate: 'default',
    heavy: 'warning',
    very_heavy: 'danger',
  };

  const levelColors: Record<string, string> = {
    light: 'text-green-400',
    moderate: 'text-blue-400',
    heavy: 'text-orange-400',
    very_heavy: 'text-red-400',
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="text-center">
        <CardContent>
          <p className="text-sm text-slate-400">Energia de Retroceso</p>
          <p className={`mt-1 font-mono text-xl font-bold ${levelColors[level]}`}>
            {formatNum(result.recoil_energy_ft_lbs, 1)}
            <span className="ml-1 text-sm font-normal text-slate-400">ft-lbs</span>
          </p>
          <p className="mt-0.5 font-mono text-xs text-slate-500">
            {formatNum(energyJ, 1)} J
          </p>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent>
          <p className="text-sm text-slate-400">Impulso de Retroceso</p>
          <p className="mt-1 font-mono text-xl font-bold text-cyan-400">
            {formatNum(result.recoil_impulse_ns, 2)}
            <span className="ml-1 text-sm font-normal text-slate-400">N-s</span>
          </p>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent>
          <p className="text-sm text-slate-400">Velocidad de Retroceso</p>
          <p className="mt-1 font-mono text-xl font-bold text-teal-400">
            {recoilVel.formatted}
            <span className="ml-1 text-sm font-normal text-slate-400">{recoilVel.unit}</span>
          </p>
          <p className="mt-0.5 font-mono text-xs text-slate-500">
            {recoilVelAlt}
          </p>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent>
          <p className="text-sm text-slate-400">Clasificacion</p>
          <p className="mt-1">
            <Badge variant={levelVariants[level]}>
              {levelLabels[level]}
            </Badge>
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500">
            {'<'}10 ligero | 10-15 moderado | 15-25 fuerte
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function exportCsv(result: SimulationResult) {
  // CSV always exports both unit systems for maximum utility
  const lines: string[] = [];

  // Pressure curve
  lines.push('# Pressure Curve');
  lines.push('time_ms,pressure_psi,pressure_mpa');
  for (const p of result.pressure_curve) {
    lines.push(`${p.t_ms},${p.p_psi},${psiToMpa(p.p_psi).toFixed(2)}`);
  }

  lines.push('');

  // Velocity curve
  lines.push('# Velocity Curve');
  lines.push('distance_mm,velocity_fps,velocity_ms');
  for (const v of result.velocity_curve) {
    lines.push(`${v.x_mm},${v.v_fps},${fpsToMs(v.v_fps).toFixed(2)}`);
  }

  lines.push('');

  // Summary
  lines.push('# Summary');
  lines.push(`peak_pressure_psi,${result.peak_pressure_psi}`);
  lines.push(`peak_pressure_mpa,${psiToMpa(result.peak_pressure_psi).toFixed(1)}`);
  lines.push(`muzzle_velocity_fps,${result.muzzle_velocity_fps}`);
  lines.push(`muzzle_velocity_ms,${fpsToMs(result.muzzle_velocity_fps).toFixed(1)}`);
  lines.push(`barrel_time_ms,${result.barrel_time_ms}`);
  lines.push(`is_safe,${result.is_safe}`);
  lines.push(`hoop_stress_mpa,${result.hoop_stress_mpa}`);
  lines.push(`case_expansion_mm,${result.case_expansion_mm}`);
  lines.push(`erosion_per_shot_mm,${result.erosion_per_shot_mm}`);
  lines.push(`barrel_frequency_hz,${result.barrel_frequency_hz}`);
  lines.push(`obt_match,${result.obt_match}`);
  lines.push(`recoil_energy_ft_lbs,${result.recoil_energy_ft_lbs}`);
  lines.push(`recoil_energy_j,${ftLbsToJoules(result.recoil_energy_ft_lbs).toFixed(1)}`);
  lines.push(`recoil_impulse_ns,${result.recoil_impulse_ns}`);
  lines.push(`recoil_velocity_fps,${result.recoil_velocity_fps}`);

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `simulacion_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function SimulatePage() {
  const { data: rifles, isLoading: loadingRifles } = useRifles();
  const { data: bullets, isLoading: loadingBullets } = useBullets();
  const { data: powders, isLoading: loadingPowders } = usePowders();
  const simulation = useSimulation();
  const [result, setResult] = useState<SimulationResult | null>(null);

  const isLoadingData = loadingRifles || loadingBullets || loadingPowders;

  const handleSimulate = (input: SimulationInput) => {
    simulation.mutate(input, {
      onSuccess: (data) => setResult(data),
    });
  };

  // Try to get SAAMI max pressure from the selected rifle's cartridge
  const selectedRifle = result?.load?.rifle;
  const saamiMaxPsi =
    selectedRifle?.cartridge?.saami_max_pressure_psi || 62000;

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h2 className="text-2xl font-bold text-white">Simulacion</h2>
        <p className="mt-1 text-sm text-slate-400">
          Configura los parametros y ejecuta una simulacion de balistica interna
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left column: Form */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity size={18} className="text-blue-400" />
                Parametros
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : (
                <SimulationForm
                  rifles={rifles || []}
                  bullets={bullets || []}
                  powders={powders || []}
                  isLoading={simulation.isPending}
                  onSubmit={handleSimulate}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Results */}
        <div className="space-y-6 lg:col-span-8">
          {simulation.isError && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent>
                <div className="flex items-center gap-3">
                  <XCircle size={20} className="text-red-400" />
                  <div>
                    <p className="font-medium text-red-400">
                      Error en la simulacion
                    </p>
                    <p className="text-sm text-slate-400">
                      {simulation.error?.message ||
                        'Error desconocido. Verifica los parametros e intenta de nuevo.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {simulation.isPending && (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12">
                  <Spinner size="lg" />
                  <p className="mt-4 text-sm text-slate-400">
                    Ejecutando simulacion...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {result && !simulation.isPending && (
            <>
              {/* Safety indicator + CSV export */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <SafetyIndicator result={result} saamiMaxPsi={saamiMaxPsi} />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => exportCsv(result)}
                >
                  <Download size={14} />
                  Exportar CSV
                </Button>
              </div>

              {/* Key values */}
              <ResultCards result={result} />

              {/* Structural / Harmonics cards */}
              <StructuralCards result={result} />

              {/* Recoil cards */}
              <RecoilCards result={result} />

              {/* Warnings */}
              {result.warnings && result.warnings.length > 0 && (
                <Card className="border-yellow-500/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-400">
                      <AlertTriangle size={18} />
                      Advertencias
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.warnings.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Badge variant="warning">!</Badge>
                          <span className="text-slate-300">{w}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Pressure chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Presion vs Tiempo</CardTitle>
                  <Badge variant="danger">P(t)</Badge>
                </CardHeader>
                <CardContent>
                  <PressureTimeChart
                    data={result.pressure_curve}
                    saamiMaxPsi={saamiMaxPsi}
                  />
                </CardContent>
              </Card>

              {/* Velocity chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Velocidad vs Distancia en Canon</CardTitle>
                  <Badge>V(x)</Badge>
                </CardHeader>
                <CardContent>
                  <VelocityDistanceChart data={result.velocity_curve} />
                </CardContent>
              </Card>

              {/* Harmonics chart */}
              {result.optimal_barrel_times && result.optimal_barrel_times.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Armonicos del Canon (OBT)</CardTitle>
                    <Badge variant={result.obt_match ? 'success' : 'warning'}>
                      {result.obt_match ? 'En nodo' : 'Fuera de nodo'}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <HarmonicsChart
                      data={result.pressure_curve}
                      barrelTimeMs={result.barrel_time_ms}
                      optimalBarrelTimes={result.optimal_barrel_times}
                      obtMatch={result.obt_match}
                    />
                    <div className="mt-3 text-xs text-slate-500">
                      <p>
                        Lineas verdes punteadas = tiempos optimos de salida (OBT).
                        Linea solida = tiempo de salida real del proyectil.
                      </p>
                      <p className="mt-1">
                        Frecuencia dominante (modo 2): {formatNum(result.barrel_frequency_hz, 0)} Hz
                        {' | '}OBTs:{' '}
                        {result.optimal_barrel_times.map((t) => formatNum(t, 3)).join(', ')} ms
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Empty state */}
          {!result && !simulation.isPending && !simulation.isError && (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-slate-800 p-4">
                    <Activity size={32} className="text-slate-500" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-slate-300">
                    Sin resultados
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-slate-500">
                    Configura los parametros en el panel izquierdo y pulsa
                    &quot;Simular&quot; para ver los resultados de balistica interna.
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
