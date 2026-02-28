'use client';

/**
 * Tab navigation for technical drawings.
 * Desktop: horizontal tab bar. Mobile: dropdown select.
 * Manages 3 tabs: Cross-Section, Chamber, Assembly.
 */

import React from 'react';
import { Box } from 'lucide-react';
import { DrawingTab } from '@/lib/drawings/types';

interface DrawingTabsProps {
  activeTab: DrawingTab;
  onTabChange: (tab: DrawingTab) => void;
  hasSimulation: boolean;
  hasRifle: boolean;
}

const TABS: { key: DrawingTab; label: string; requiresRifle: boolean }[] = [
  { key: 'cross-section', label: 'Seccion Transversal', requiresRifle: false },
  { key: 'chamber', label: 'Recamara', requiresRifle: true },
  { key: 'assembly', label: 'Conjunto', requiresRifle: false },
  { key: '3d', label: 'Vista 3D', requiresRifle: false },
];

export default function DrawingTabs({
  activeTab,
  onTabChange,
  hasSimulation,
  hasRifle,
}: DrawingTabsProps) {
  return (
    <>
      {/* Desktop: horizontal tabs */}
      <div className="hidden md:flex items-center gap-1">
        {TABS.map((tab) => {
          const disabled = tab.requiresRifle && !hasRifle;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onTabChange(tab.key)}
              className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : disabled
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={disabled ? 'Selecciona un rifle para ver este dibujo' : undefined}
            >
              <span className="flex items-center gap-2">
                {tab.key === '3d' && <Box size={14} />}
                {tab.label}
                {tab.key === 'assembly' && hasSimulation && (
                  <span className="h-2 w-2 rounded-full bg-green-500" title="Datos de simulacion disponibles" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile: dropdown */}
      <div className="md:hidden">
        <select
          value={activeTab}
          onChange={(e) => onTabChange(e.target.value as DrawingTab)}
          className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          {TABS.map((tab) => (
            <option
              key={tab.key}
              value={tab.key}
              disabled={tab.requiresRifle && !hasRifle}
            >
              {tab.label}
              {tab.key === 'assembly' && hasSimulation ? ' (sim)' : ''}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
