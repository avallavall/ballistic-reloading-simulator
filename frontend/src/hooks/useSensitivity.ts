'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { runSimulation, runSensitivity } from '@/lib/api';
import type { SimulationResult, SensitivityResponse } from '@/lib/types';

interface UseSensitivityOptions {
  originalParams: {
    powder_id: string;
    bullet_id: string;
    rifle_id: string;
    powder_charge_grains: number;
    coal_mm: number;
    seating_depth_mm: number;
  };
  originalResult: SimulationResult;
  enabled: boolean;
}

interface Deltas {
  pressure_psi: number;
  velocity_fps: number;
  barrel_time_ms: number;
}

interface UseSensitivityReturn {
  // Slider values
  chargeGrains: number;
  setChargeGrains: (v: number) => void;
  seatingDepthMm: number;
  setSeatingDepthMm: (v: number) => void;
  barrelLengthMm: number;
  setBarrelLengthMm: (v: number) => void;
  // Current result (from re-simulation)
  currentResult: SimulationResult | null;
  // Error band data
  sensitivityData: SensitivityResponse | null;
  // Loading state
  isSimulating: boolean;
  // Delta values for badges
  deltas: Deltas | null;
  // Show bands toggle
  showBands: boolean;
  setShowBands: (v: boolean) => void;
  // Reset to original
  reset: () => void;
}

const DEBOUNCE_MS = 300;
const DEFAULT_CHARGE_DELTA = 0.3;

export function useSensitivity({
  originalParams,
  originalResult,
  enabled,
}: UseSensitivityOptions): UseSensitivityReturn {
  // Slider state
  const [chargeGrains, setChargeGrains] = useState(originalParams.powder_charge_grains);
  const [seatingDepthMm, setSeatingDepthMm] = useState(originalParams.seating_depth_mm);
  const [barrelLengthMm, setBarrelLengthMm] = useState(0); // Display only - initialized from rifle

  // Band toggle
  const [showBands, setShowBands] = useState(true);

  // Result state
  const [currentResult, setCurrentResult] = useState<SimulationResult | null>(null);
  const [sensitivityData, setSensitivityData] = useState<SensitivityResponse | null>(null);

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track original params for comparison
  const origRef = useRef(originalParams);

  // Reset slider values when original params change (new simulation run)
  useEffect(() => {
    origRef.current = originalParams;
    setChargeGrains(originalParams.powder_charge_grains);
    setSeatingDepthMm(originalParams.seating_depth_mm);
    setCurrentResult(null);
    setSensitivityData(null);
  }, [
    originalParams.powder_id,
    originalParams.bullet_id,
    originalParams.rifle_id,
    originalParams.powder_charge_grains,
    originalParams.coal_mm,
    originalParams.seating_depth_mm,
  ]);

  // Simulation mutation
  const simMutation = useMutation({
    mutationFn: (params: {
      powder_id: string;
      bullet_id: string;
      rifle_id: string;
      powder_charge_grains: number;
      coal_mm: number;
      seating_depth_mm: number;
    }) => runSimulation(params),
    onSuccess: (data) => setCurrentResult(data),
  });

  // Sensitivity mutation (for error bands)
  const sensMutation = useMutation({
    mutationFn: (params: {
      powder_id: string;
      bullet_id: string;
      rifle_id: string;
      powder_charge_grains: number;
      coal_mm: number;
      seating_depth_mm: number;
      charge_delta_grains: number;
    }) => runSensitivity(params),
    onSuccess: (data) => setSensitivityData(data),
  });

  // Check if values differ from original
  const hasChanged = useCallback(() => {
    const orig = origRef.current;
    return (
      chargeGrains !== orig.powder_charge_grains ||
      seatingDepthMm !== orig.seating_depth_mm
    );
  }, [chargeGrains, seatingDepthMm]);

  // Debounced re-simulation effect
  useEffect(() => {
    if (!enabled) return;

    // Clear any existing timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't fire if values equal original
    if (!hasChanged()) {
      setCurrentResult(null);
      // Still run sensitivity for error bands around original center
      const sensParams = {
        powder_id: origRef.current.powder_id,
        bullet_id: origRef.current.bullet_id,
        rifle_id: origRef.current.rifle_id,
        powder_charge_grains: origRef.current.powder_charge_grains,
        coal_mm: origRef.current.coal_mm,
        seating_depth_mm: origRef.current.seating_depth_mm,
        charge_delta_grains: DEFAULT_CHARGE_DELTA,
      };
      sensMutation.mutate(sensParams);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const params = {
        powder_id: origRef.current.powder_id,
        bullet_id: origRef.current.bullet_id,
        rifle_id: origRef.current.rifle_id,
        powder_charge_grains: chargeGrains,
        coal_mm: origRef.current.coal_mm,
        seating_depth_mm: seatingDepthMm,
      };

      simMutation.mutate(params);

      // Sensitivity around the new center
      sensMutation.mutate({
        ...params,
        charge_delta_grains: DEFAULT_CHARGE_DELTA,
      });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargeGrains, seatingDepthMm, enabled]);

  // Compute deltas
  const deltas = useMemo<Deltas | null>(() => {
    const active = currentResult;
    if (!active) return null;

    return {
      pressure_psi: active.peak_pressure_psi - originalResult.peak_pressure_psi,
      velocity_fps: active.muzzle_velocity_fps - originalResult.muzzle_velocity_fps,
      barrel_time_ms: active.barrel_time_ms - originalResult.barrel_time_ms,
    };
  }, [currentResult, originalResult]);

  const reset = useCallback(() => {
    const orig = origRef.current;
    setChargeGrains(orig.powder_charge_grains);
    setSeatingDepthMm(orig.seating_depth_mm);
    setCurrentResult(null);
  }, []);

  const isSimulating = simMutation.isPending || sensMutation.isPending;

  return {
    chargeGrains,
    setChargeGrains,
    seatingDepthMm,
    setSeatingDepthMm,
    barrelLengthMm,
    setBarrelLengthMm,
    currentResult,
    sensitivityData,
    isSimulating,
    deltas,
    showBands,
    setShowBands,
    reset,
  };
}
