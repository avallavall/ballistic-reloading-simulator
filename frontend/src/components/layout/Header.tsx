'use client';

import { Crosshair } from 'lucide-react';
import { useUnits } from '@/lib/unit-context';

interface HeaderProps {
  sidebarCollapsed: boolean;
}

export default function Header({ sidebarCollapsed }: HeaderProps) {
  const { unitSystem, toggleUnits } = useUnits();

  return (
    <header
      className={`fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-700 bg-slate-900/80 px-6 backdrop-blur-sm transition-all duration-300 ${
        sidebarCollapsed ? 'left-16' : 'left-60'
      }`}
    >
      <div className="flex items-center gap-3">
        <Crosshair size={22} className="text-blue-400" />
        <h1 className="text-lg font-semibold text-white">
          Simulador de Balistica de Precision
        </h1>
      </div>
      <button
        onClick={toggleUnits}
        className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-blue-500 hover:text-white"
        title={unitSystem === 'metric' ? 'Cambiar a imperial (PSI / FPS)' : 'Cambiar a metrico (MPa / m/s)'}
      >
        {unitSystem === 'metric' ? 'MPa / m/s' : 'PSI / FPS'}
      </button>
    </header>
  );
}
