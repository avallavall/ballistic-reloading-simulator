import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRifles, getRifle, createRifle, updateRifle, deleteRifle } from '@/lib/api';
import type { RifleCreate } from '@/lib/types';

export function useRifles() {
  return useQuery({
    queryKey: ['rifles'],
    queryFn: getRifles,
  });
}

export function useRifle(id: string) {
  return useQuery({
    queryKey: ['rifles', id],
    queryFn: () => getRifle(id),
    enabled: !!id,
  });
}

export function useCreateRifle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RifleCreate) => createRifle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rifles'] });
    },
  });
}

export function useUpdateRifle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RifleCreate> }) =>
      updateRifle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rifles'] });
    },
  });
}

export function useDeleteRifle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRifle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rifles'] });
    },
  });
}
