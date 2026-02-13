'use client';

import { useState, useEffect } from 'react';
import { Settings2, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import Tooltip from '@/components/ui/Tooltip';
import type { Rifle, Bullet, Powder, SimulationInput } from '@/lib/types';

const STORAGE_KEY = 'sim-form-mode';

function useFormMode() {
  const [isAdvanced, setIsAdvanced] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'advanced') setIsAdvanced(true);
  }, []);

  const toggle = () => {
    setIsAdvanced((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? 'advanced' : 'simple');
      return next;
    });
  };

  return { isAdvanced, toggle };
}

interface SimulationFormProps {
  rifles: Rifle[];
  bullets: Bullet[];
  powders: Powder[];
  isLoading: boolean;
  onSubmit: (input: SimulationInput) => void;
}

export default function SimulationForm({
  rifles,
  bullets,
  powders,
  isLoading,
  onSubmit,
}: SimulationFormProps) {
  const { isAdvanced, toggle } = useFormMode();
  const [rifleId, setRifleId] = useState('');
  const [bulletId, setBulletId] = useState('');
  const [powderId, setPowderId] = useState('');
  const [chargeGrains, setChargeGrains] = useState(42);
  const [coalMm, setCoalMm] = useState(71.0);
  const [seatingDepthMm, setSeatingDepthMm] = useState(8.0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      rifle_id: rifleId,
      bullet_id: bulletId,
      powder_id: powderId,
      powder_charge_grains: chargeGrains,
      coal_mm: coalMm,
      seating_depth_mm: seatingDepthMm,
    });
  };

  const canSubmit = rifleId && bulletId && powderId && chargeGrains > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-2">
        <button
          type="button"
          onClick={!isAdvanced ? undefined : toggle}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            !isAdvanced
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap size={13} />
          Modo Simple
        </button>
        <button
          type="button"
          onClick={isAdvanced ? undefined : toggle}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            isAdvanced
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings2 size={13} />
          Modo Avanzado
        </button>
      </div>

      {/* Section 1: Rifle Selection */}
      <div className="space-y-4">
        <h3 className="flex items-center text-sm font-semibold uppercase tracking-wider text-slate-400">
          1. Rifle
          <Tooltip text="Selecciona el rifle. El largo del canon y la recamara afectan la presion y velocidad." />
        </h3>
        <Select
          id="rifle"
          label="Seleccionar rifle"
          placeholder="-- Seleccionar rifle --"
          value={rifleId}
          onChange={(e) => setRifleId(e.target.value)}
          options={rifles.map((r) => ({
            value: r.id,
            label: `${r.name} (${r.barrel_length_mm}mm)`,
          }))}
        />
      </div>

      {/* Section 2: Bullet Selection */}
      <div className="space-y-4">
        <h3 className="flex items-center text-sm font-semibold uppercase tracking-wider text-slate-400">
          2. Proyectil
          <Tooltip text="Selecciona el proyectil. El peso y coeficiente balistico determinan la aceleracion." />
        </h3>
        <Select
          id="bullet"
          label="Seleccionar proyectil"
          placeholder="-- Seleccionar proyectil --"
          value={bulletId}
          onChange={(e) => setBulletId(e.target.value)}
          options={bullets.map((b) => ({
            value: b.id,
            label: `${b.name} - ${b.weight_grains}gr (BC G7: ${b.bc_g7})`,
          }))}
        />
      </div>

      {/* Section 3: Powder Selection */}
      <div className="space-y-4">
        <h3 className="flex items-center text-sm font-semibold uppercase tracking-wider text-slate-400">
          3. Polvora
          <Tooltip text="Selecciona la polvora. La tasa de combustion y energia determinan la curva de presion." />
        </h3>
        <Select
          id="powder"
          label="Seleccionar polvora"
          placeholder="-- Seleccionar polvora --"
          value={powderId}
          onChange={(e) => setPowderId(e.target.value)}
          options={powders.map((p) => ({
            value: p.id,
            label: `${p.name} (${p.manufacturer})`,
          }))}
        />
      </div>

      {/* Section 4: Load Data */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          4. Datos de Carga
        </h3>

        <div>
          <label
            htmlFor="charge-slider"
            className="mb-1.5 flex items-center text-sm font-medium text-slate-300"
          >
            Carga de polvora
            <Tooltip text="Peso de polvora en grains. Mas carga = mas presion y velocidad. No exceder la carga maxima SAAMI." />
          </label>
          <div className="flex items-center gap-4">
            <input
              id="charge-slider"
              type="range"
              min={20}
              max={70}
              step={0.1}
              value={chargeGrains}
              onChange={(e) => setChargeGrains(parseFloat(e.target.value))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-700 accent-blue-500"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={chargeGrains}
                onChange={(e) => setChargeGrains(parseFloat(e.target.value) || 0)}
                className="input-field w-24 text-center font-mono"
              />
              <span className="text-xs text-slate-400">gr</span>
            </div>
          </div>
        </div>

        <Input
          id="coal"
          label="COAL"
          labelExtra={<Tooltip text="Cartridge Overall Length. Distancia total del cartucho cargado. Afecta la profundidad de asentado y el volumen libre." />}
          type="number"
          step={0.01}
          value={coalMm}
          onChange={(e) => setCoalMm(parseFloat(e.target.value) || 0)}
          suffix="mm"
        />

        {/* Advanced-only fields */}
        {isAdvanced && (
          <Input
            id="seating-depth"
            label="Profundidad asentado"
            labelExtra={<Tooltip text="Distancia que el proyectil se introduce en la vaina. Afecta la presion inicial y el espacio libre (freebore)." />}
            type="number"
            step={0.01}
            value={seatingDepthMm}
            onChange={(e) =>
              setSeatingDepthMm(parseFloat(e.target.value) || 0)
            }
            suffix="mm"
          />
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={!canSubmit || isLoading}
      >
        {isLoading ? (
          <>
            <Spinner size="sm" className="text-white" />
            Simulando...
          </>
        ) : (
          'Simular'
        )}
      </Button>
    </form>
  );
}
