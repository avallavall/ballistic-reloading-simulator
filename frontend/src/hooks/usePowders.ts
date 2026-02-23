import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getPowders, getPowder, createPowder, updatePowder, deletePowder, importGrtPowders } from '@/lib/api';
import type { ListParams } from '@/lib/api';
import type { PowderCreate } from '@/lib/types';

export function usePowders() {
  return useQuery({
    queryKey: ['powders'],
    queryFn: () => getPowders(),
    select: (data) => data.items,
  });
}

export function usePowdersPaginated(params: ListParams = {}) {
  const { page = 1, size = 20, q } = params;
  return useQuery({
    queryKey: ['powders', 'list', { page, size, q }],
    queryFn: () => getPowders({ page, size, q }),
    placeholderData: keepPreviousData,
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

export function useImportGrtPowders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => importGrtPowders(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['powders'] });
    },
  });
}
