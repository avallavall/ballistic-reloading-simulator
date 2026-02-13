import { useMutation } from '@tanstack/react-query';
import { runSimulation, runLadderTest } from '@/lib/api';
import type { SimulationInput, LadderTestInput } from '@/lib/types';

export function useSimulation() {
  return useMutation({
    mutationFn: (input: SimulationInput) => runSimulation(input),
  });
}

export function useLadderTest() {
  return useMutation({
    mutationFn: (input: LadderTestInput) => runLadderTest(input),
  });
}
