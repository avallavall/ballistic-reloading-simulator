import { useQuery } from '@tanstack/react-query';
import {
  getPowderManufacturers,
  getBulletManufacturers,
  getBulletCaliberFamilies,
  getCartridgeCaliberFamilies,
} from '@/lib/api';

export function useManufacturers(entity: 'powders' | 'bullets') {
  const fetchFn = entity === 'powders' ? getPowderManufacturers : getBulletManufacturers;
  return useQuery({
    queryKey: [entity, 'manufacturers'],
    queryFn: fetchFn,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCaliberFamilies(entity: 'bullets' | 'cartridges') {
  const fetchFn = entity === 'bullets' ? getBulletCaliberFamilies : getCartridgeCaliberFamilies;
  return useQuery({
    queryKey: [entity, 'caliber-families'],
    queryFn: fetchFn,
    staleTime: 5 * 60 * 1000,
  });
}
