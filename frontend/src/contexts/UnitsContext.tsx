'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

export type UnitSystem = 'metric' | 'imperial';

interface UnitsContextValue {
  system: UnitSystem;
  toggle: () => void;
  /** Convert pressure from PSI (backend) to display unit */
  pressure: (psi: number) => number;
  /** Pressure unit label */
  pressureUnit: string;
  /** Convert velocity from FPS (backend) to display unit */
  velocity: (fps: number) => number;
  /** Velocity unit label */
  velocityUnit: string;
  /** Convert mass from grains (backend) to display unit */
  mass: (grains: number) => number;
  /** Mass unit label */
  massUnit: string;
}

const UnitsContext = createContext<UnitsContextValue | null>(null);

const STORAGE_KEY = 'balistica-units';

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [system, setSystem] = useState<UnitSystem>('metric');
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'imperial' || stored === 'metric') {
      setSystem(stored);
    }
    setMounted(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, system);
    }
  }, [system, mounted]);

  const toggle = useCallback(() => {
    setSystem((prev) => (prev === 'metric' ? 'imperial' : 'metric'));
  }, []);

  const pressure = useCallback(
    (psi: number) => (system === 'imperial' ? psi : psi * 0.00689476),
    [system]
  );

  const velocity = useCallback(
    (fps: number) => (system === 'imperial' ? fps : fps * 0.3048),
    [system]
  );

  const mass = useCallback(
    (grains: number) => (system === 'imperial' ? grains : grains * 0.0647989),
    [system]
  );

  const value: UnitsContextValue = {
    system,
    toggle,
    pressure,
    pressureUnit: system === 'imperial' ? 'PSI' : 'MPa',
    velocity,
    velocityUnit: system === 'imperial' ? 'fps' : 'm/s',
    mass,
    massUnit: system === 'imperial' ? 'gr' : 'g',
  };

  return (
    <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>
  );
}

export function useUnits(): UnitsContextValue {
  const ctx = useContext(UnitsContext);
  if (!ctx) {
    throw new Error('useUnits must be used within a UnitsProvider');
  }
  return ctx;
}
