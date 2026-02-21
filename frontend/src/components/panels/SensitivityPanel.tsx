'use client';

import { ChevronLeft, ChevronRight, RotateCcw, Loader2 } from 'lucide-react';
import { formatNum } from '@/lib/utils';

interface SensitivityPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  // Slider values
  chargeGrains: number;
  onChargeChange: (v: number) => void;
  seatingDepthMm: number;
  onSeatingDepthChange: (v: number) => void;
  barrelLengthMm: number;
  onBarrelLengthChange: (v: number) => void;
  // Original values (for range and delta)
  originalCharge: number;
  originalSeatingDepth: number;
  originalBarrelLength: number;
  // Error band toggle
  showBands: boolean;
  onShowBandsChange: (v: boolean) => void;
  // Deltas
  deltas: {
    pressure_psi: number;
    velocity_fps: number;
    barrel_time_ms: number;
  } | null;
  // Loading
  isSimulating: boolean;
  // Reset
  onReset: () => void;
}

function DeltaBadge({ value, unit, invert = false }: { value: number; unit: string; invert?: boolean }) {
  if (Math.abs(value) < 0.01) return null;
  const positive = value > 0;
  // For pressure, positive = bad (amber). For velocity, positive = good (green).
  // invert=true means positive is bad
  const color = invert
    ? (positive ? 'text-amber-400' : 'text-green-400')
    : (positive ? 'text-green-400' : 'text-amber-400');
  const arrow = positive ? '+' : '';
  return (
    <span className={`ml-2 text-xs font-mono ${color}`}>
      ({arrow}{formatNum(value, 1)} {unit})
    </span>
  );
}

export default function SensitivityPanel({
  isOpen,
  onToggle,
  chargeGrains,
  onChargeChange,
  seatingDepthMm,
  onSeatingDepthChange,
  barrelLengthMm,
  onBarrelLengthChange,
  originalCharge,
  originalSeatingDepth,
  originalBarrelLength,
  showBands,
  onShowBandsChange,
  deltas,
  isSimulating,
  onReset,
}: SensitivityPanelProps) {
  // Slider ranges
  const chargeMin = Math.max(1, originalCharge - 5);
  const chargeMax = originalCharge + 5;
  const seatingMin = Math.max(0.5, originalSeatingDepth - 2);
  const seatingMax = originalSeatingDepth + 2;
  const barrelMin = Math.max(100, originalBarrelLength - 100);
  const barrelMax = originalBarrelLength + 100;

  const chargeDelta = chargeGrains - originalCharge;
  const seatingDelta = seatingDepthMm - originalSeatingDepth;

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 z-30 -translate-y-1/2 rounded-l-xl border-2 border-r-0 border-blue-500/50 bg-gradient-to-l from-blue-600 to-blue-700 px-3 py-5 text-sm font-medium text-white shadow-xl shadow-blue-900/30 transition-all hover:from-blue-500 hover:to-blue-600 hover:shadow-blue-800/40 hover:pr-4"
        title="Abrir explorador de sensibilidad"
      >
        <ChevronLeft size={16} className="mb-1.5" />
        <span className="whitespace-nowrap" style={{ writingMode: 'vertical-rl' }}>
          Explorador
        </span>
      </button>
    );
  }

  return (
    <div className="w-72 shrink-0 rounded-lg border border-slate-700 bg-slate-800/95 p-4 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Explorador de Sensibilidad
        </h3>
        <div className="flex items-center gap-1">
          {isSimulating && (
            <Loader2 size={14} className="animate-spin text-blue-400" />
          )}
          <button
            onClick={onToggle}
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            title="Cerrar panel"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Charge Weight Slider */}
        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-300">
            <span>Carga (gr)</span>
            <span className="font-mono text-white">
              {formatNum(chargeGrains, 1)}
              {Math.abs(chargeDelta) >= 0.05 && (
                <DeltaBadge value={chargeDelta} unit="gr" invert />
              )}
            </span>
          </label>
          <input
            type="range"
            min={chargeMin}
            max={chargeMax}
            step={0.1}
            value={chargeGrains}
            onChange={(e) => onChargeChange(parseFloat(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-blue-500"
          />
          <div className="mt-0.5 flex justify-between text-[10px] text-slate-500">
            <span>{formatNum(chargeMin, 1)}</span>
            <span className="text-slate-400">{formatNum(originalCharge, 1)}</span>
            <span>{formatNum(chargeMax, 1)}</span>
          </div>
        </div>

        {/* Seating Depth Slider */}
        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-300">
            <span>Prof. Asentamiento (mm)</span>
            <span className="font-mono text-white">
              {formatNum(seatingDepthMm, 1)}
              {Math.abs(seatingDelta) >= 0.05 && (
                <DeltaBadge value={seatingDelta} unit="mm" invert />
              )}
            </span>
          </label>
          <input
            type="range"
            min={seatingMin}
            max={seatingMax}
            step={0.1}
            value={seatingDepthMm}
            onChange={(e) => onSeatingDepthChange(parseFloat(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-blue-500"
          />
          <div className="mt-0.5 flex justify-between text-[10px] text-slate-500">
            <span>{formatNum(seatingMin, 1)}</span>
            <span className="text-slate-400">{formatNum(originalSeatingDepth, 1)}</span>
            <span>{formatNum(seatingMax, 1)}</span>
          </div>
        </div>

        {/* Barrel Length Slider */}
        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-300">
            <span>Largo Canon (mm)</span>
            <span className="font-mono text-white">
              {formatNum(barrelLengthMm, 0)}
              {Math.abs(barrelLengthMm - originalBarrelLength) >= 1 && (
                <DeltaBadge value={barrelLengthMm - originalBarrelLength} unit="mm" />
              )}
            </span>
          </label>
          <input
            type="range"
            min={barrelMin}
            max={barrelMax}
            step={10}
            value={barrelLengthMm}
            onChange={(e) => onBarrelLengthChange(parseFloat(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-blue-500"
          />
          <div className="mt-0.5 flex justify-between text-[10px] text-slate-500">
            <span>{formatNum(barrelMin, 0)}</span>
            <span className="text-slate-400">{formatNum(originalBarrelLength, 0)}</span>
            <span>{formatNum(barrelMax, 0)}</span>
          </div>
        </div>

        {/* Separator */}
        <hr className="border-slate-700" />

        {/* Error Band Toggle */}
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showBands}
            onChange={(e) => onShowBandsChange(e.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
          />
          <span>Mostrar bandas de error (+/- 0.3 gr)</span>
        </label>

        {/* Delta Summary */}
        {deltas && (
          <div className="rounded-md border border-slate-700 bg-slate-900/50 p-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Variacion vs original
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Presion:</span>
              <span className="font-mono">
                <DeltaBadge value={deltas.pressure_psi} unit="PSI" invert />
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Velocidad:</span>
              <span className="font-mono">
                <DeltaBadge value={deltas.velocity_fps} unit="FPS" />
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Barrel Time:</span>
              <span className="font-mono">
                <DeltaBadge value={deltas.barrel_time_ms} unit="ms" />
              </span>
            </div>
          </div>
        )}

        {/* Reset Button */}
        <button
          onClick={onReset}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-600 hover:text-white"
        >
          <RotateCcw size={12} />
          Restablecer
        </button>
      </div>
    </div>
  );
}
