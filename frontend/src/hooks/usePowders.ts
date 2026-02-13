import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPowders, getPowder, createPowder, updatePowder, deletePowder } from '@/lib/api';
import type { PowderCreate } from '@/lib/types';

export function usePowders() {
  return useQuery({
    queryKey: ['powders'],
    queryFn: getPowders,
  });
}

export function usePowder(id: string) {
  return useQuery({
    queryKey: ['powders', id],
    queryFn: () => getPowder(id),
    enabled: !!id,
  });
}

export function useCreatePowder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PowderCreate) => createPowder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['powders'] });
    },
  });
}

export function useUpdatePowder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PowderCreate> }) =>
      updatePowder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['powders'] });
    },
  });
}

export function useDeletePowder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePowder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['powders'] });
    },
  });
}
