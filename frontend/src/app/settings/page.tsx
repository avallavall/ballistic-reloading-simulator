'use client';

import { Settings, Ruler, Gauge, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useUnits, type UnitSystem } from '@/lib/unit-context';

const unitOptions: {
  value: UnitSystem;
  label: string;
  description: string;
  units: { icon: typeof Gauge; dimension: string; unit: string }[];
}[] = [
  {
    value: 'metric',
    label: 'Metrico',
    description: 'Sistema Internacional (SI)',
    units: [
      { icon: Gauge, dimension: 'Presion', unit: 'MPa' },
      { icon: Zap, dimension: 'Velocidad', unit: 'm/s' },
      { icon: Ruler, dimension: 'Longitud', unit: 'mm' },
    ],
  },
  {
    value: 'imperial',
    label: 'Imperial',
    description: 'Sistema angloamericano',
    units: [
      { icon: Gauge, dimension: 'Presion', unit: 'PSI' },
      { icon: Zap, dimension: 'Velocidad', unit: 'FPS' },
      { icon: Ruler, dimension: 'Longitud', unit: 'in' },
    ],
  },
];

export default function SettingsPage() {
  const { unitSystem, setUnitSystem } = useUnits();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Configuracion</h2>
        <p className="mt-1 text-sm text-slate-400">
          Preferencias de unidades y visualizacion
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings size={18} className="text-blue-400" />
            Sistema de Unidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {unitOptions.map((option) => {
              const isSelected = unitSystem === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setUnitSystem(option.value)}
                  className={`rounded-lg border-2 p-5 text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-lg font-semibold ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                        {option.label}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {option.description}
                      </p>
                    </div>
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-blue-500' : 'border-slate-600'
                      }`}
                    >
                      {isSelected && (
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      )}
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {option.units.map((u) => {
                      const Icon = u.icon;
                      return (
                        <div key={u.dimension} className="flex items-center gap-2 text-sm">
                          <Icon size={14} className="text-slate-500" />
                          <span className="text-slate-400">{u.dimension}:</span>
                          <span className={isSelected ? 'text-blue-300 font-medium' : 'text-slate-300'}>
                            {u.unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler size={18} className="text-blue-400" />
            Resumen de Unidades Activas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="pb-2 text-left font-medium text-slate-400">Dimension</th>
                  <th className="pb-2 text-left font-medium text-slate-400">Unidad</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-700/50">
                  <td className="py-2">Presion</td>
                  <td className="py-2 font-mono">{unitSystem === 'metric' ? 'MPa' : 'PSI'}</td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-2">Velocidad</td>
                  <td className="py-2 font-mono">{unitSystem === 'metric' ? 'm/s' : 'FPS'}</td>
                </tr>
                <tr>
                  <td className="py-2">Longitud</td>
                  <td className="py-2 font-mono">{unitSystem === 'metric' ? 'mm' : 'in (pulgadas)'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
