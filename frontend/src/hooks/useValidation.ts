'use client';

import { useMutation } from '@tanstack/react-query';
import { runValidation } from '@/lib/api';

export function useValidation() {
  return useMutation({
    mutationFn: runValidation,
  });
}
