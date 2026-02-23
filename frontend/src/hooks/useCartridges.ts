import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getCartridges, getCartridge, createCartridge, updateCartridge, deleteCartridge } from '@/lib/api';
import type { ListParams } from '@/lib/api';
import type { CartridgeCreate } from '@/lib/types';

export function useCartridges() {
  return useQuery({
    queryKey: ['cartridges'],
    queryFn: () => getCartridges(),
    select: (data) => data.items,
  });
}

export function useCartridgesPaginated(params: ListParams = {}) {
  const { page = 1, size = 20, q } = params;
  return useQuery({
    queryKey: ['cartridges', 'list', { page, size, q }],
    queryFn: () => getCartridges({ page, size, q }),
    placeholderData: keepPreviousData,
  });
}

export function useCartridge(id: string) {
  return useQuery({
    queryKey: ['cartridges', id],
    queryFn: () => getCartridge(id),
    enabled: !!id,
  });
}

export function useCreateCartridge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CartridgeCreate) => createCartridge(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartridges'] });
    },
  });
}

export function useUpdateCartridge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CartridgeCreate> }) =>
      updateCartridge(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartridges'] });
    },
  });
}

export function useDeleteCartridge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCartridge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartridges'] });
    },
  });
}
