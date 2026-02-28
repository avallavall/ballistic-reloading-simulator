'use client';

import { useState, useCallback, RefObject } from 'react';
import { ExportFormat } from '@/lib/drawings/types';
import { exportBothStyles } from '@/lib/drawings/export';

/**
 * Hook wrapping SVG export utilities with React loading state.
 * Calls exportBothStyles to generate dual-style outputs (2 files for PNG/SVG, 2-page PDF).
 */
export function useSvgExport() {
  const [exporting, setExporting] = useState(false);

  const exportDrawing = useCallback(
    async (
      format: ExportFormat,
      primaryRef: RefObject<SVGSVGElement | null>,
      altRef: RefObject<SVGSVGElement | null>,
      basename: string
    ) => {
      if (!primaryRef.current || !altRef.current) {
        console.warn('SVG refs not available for export');
        return;
      }

      setExporting(true);
      try {
        await exportBothStyles(
          primaryRef.current,
          altRef.current,
          basename,
          format
        );
      } catch (err) {
        console.error('Export failed:', err);
      } finally {
        setExporting(false);
      }
    },
    []
  );

  return { exporting, exportDrawing };
}
