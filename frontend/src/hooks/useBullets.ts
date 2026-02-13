import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBullets, getBullet, createBullet, updateBullet, deleteBullet } from '@/lib/api';
import type { BulletCreate } from '@/lib/types';

export function useBullets() {
  return useQuery({
    queryKey: ['bullets'],
    queryFn: getBullets,
  });
}

export function useBullet(id: string) {
  return useQuery({
    queryKey: ['bullets', id],
    queryFn: () => getBullet(id),
    enabled: !!id,
  });
}

export function useCreateBullet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulletCreate) => createBullet(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bullets'] });
    },
  });
}

export function useUpdateBullet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BulletCreate> }) =>
      updateBullet(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bullets'] });
    },
  });
}

export function useDeleteBullet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBullet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bullets'] });
    },
  });
}
