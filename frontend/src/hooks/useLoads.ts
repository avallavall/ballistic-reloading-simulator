import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLoads, getLoad, createLoad, updateLoad, deleteLoad } from '@/lib/api';
import type { LoadCreate } from '@/lib/types';

export function useLoads() {
  return useQuery({
    queryKey: ['loads'],
    queryFn: getLoads,
  });
}

export function useLoad(id: string) {
  return useQuery({
    queryKey: ['loads', id],
    queryFn: () => getLoad(id),
    enabled: !!id,
  });
}

export function useCreateLoad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LoadCreate) => createLoad(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    },
  });
}

export function useUpdateLoad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LoadCreate> }) =>
      updateLoad(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    },
  });
}

export function useDeleteLoad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLoad(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    },
  });
}
