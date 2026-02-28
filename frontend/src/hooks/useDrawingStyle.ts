'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'drawing-style';

/**
 * Hook managing blueprint/modern style toggle with localStorage persistence.
 * Hydration-safe: SSR initial state is 'blueprint', updated on client mount.
 */
export function useDrawingStyle() {
  const [style, setStyle] = useState<'blueprint' | 'modern'>('blueprint');

  // Read from localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'modern' || stored === 'blueprint') {
        setStyle(stored);
      }
    } catch {
      // localStorage unavailable (SSR, privacy mode, etc.)
    }
  }, []);

  const toggleStyle = () => {
    setStyle((prev) => {
      const next = prev === 'blueprint' ? 'modern' : 'blueprint';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore write failures
      }
      return next;
    });
  };

  return { style, toggleStyle };
}
