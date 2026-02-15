import { useMutation } from '@tanstack/react-query';
import { runParametricSearch } from '@/lib/api';
import type { ParametricSearchInput } from '@/lib/types';

export function useParametricSearch() {
  return useMutation({
    mutationFn: (input: ParametricSearchInput) => runParametricSearch(input),
  });
}
