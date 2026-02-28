'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { psiToMpa, fpsToMs, formatNum } from './utils';

export type UnitSystem = 'metric' | 'imperial';

interface FormattedValue {
  value: number;
  formatted: string;
  unit: string;
}

interface UnitContextValue {
  unitSystem: UnitSystem;
  toggleUnits: () => void;
  setUnitSystem: (system: UnitSystem) => void;
  formatPressure: (psi: number, decimals?: number) => FormattedValue;
  formatVelocity: (fps: number, decimals?: number) => FormattedValue;
  formatLength: (mm: number, decimals?: number) => FormattedValue;
}

const UnitContext = createContext<UnitContextValue | null>(null);

const STORAGE_KEY = 'unit-system';

export function UnitProvider({ children }: { children: ReactNode }) {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'metric' || stored === 'imperial') {
      setUnitSystem(stored);
    }
  }, []);

  const toggleUnits = useCallback(() => {
    setUnitSystem((prev) => {
      const next = prev === 'metric' ? 'imperial' : 'metric';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const setSystem = useCallback((system: UnitSystem) => {
    setUnitSystem(system);
    localStorage.setItem(STORAGE_KEY, system);
  }, []);

  const formatPressure = useCallback(
    (psi: number, decimals?: number): FormattedValue => {
      if (unitSystem === 'imperial') {
        const d = decimals ?? 0;
        return { value: psi, formatted: formatNum(psi, d), unit: 'PSI' };
      }
      const mpa = psiToMpa(psi);
      const d = decimals ?? 1;
      return { value: mpa, formatted: formatNum(mpa, d), unit: 'MPa' };
    },
    [unitSystem]
  );

  const formatVelocity = useCallback(
    (fps: number, decimals?: number): FormattedValue => {
      if (unitSystem === 'imperial') {
        const d = decimals ?? 0;
        return { value: fps, formatted: formatNum(fps, d), unit: 'FPS' };
      }
      const ms = fpsToMs(fps);
      const d = decimals ?? 1;
      return { value: ms, formatted: formatNum(ms, d), unit: 'm/s' };
    },
    [unitSystem]
  );

  const formatLength = useCallback(
    (mm: number, decimals?: number): FormattedValue => {
      if (unitSystem === 'imperial') {
        const inches = mm / 25.4;
        const d = decimals ?? 3;
        return { value: inches, formatted: formatNum(inches, d), unit: 'in' };
      }
      const d = decimals ?? 2;
      return { value: mm, formatted: formatNum(mm, d), unit: 'mm' };
    },
    [unitSystem]
  );

  return (
    <UnitContext.Provider
      value={{ unitSystem, toggleUnits, setUnitSystem: setSystem, formatPressure, formatVelocity, formatLength }}
    >
      {children}
    </UnitContext.Provider>
  );
}

export function useUnits(): UnitContextValue {
  const ctx = useContext(UnitContext);
  if (!ctx) {
    throw new Error('useUnits must be used within a UnitProvider');
  }
  return ctx;
}
