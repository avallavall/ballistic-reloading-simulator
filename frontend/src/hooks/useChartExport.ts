'use client';

import { useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

export function useChartExport() {
  const chartRef = useRef<HTMLDivElement>(null);

  const exportPng = useCallback(async (filename: string) => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
      });
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, filename + '.png');
        }
      });
    } catch (err) {
      console.error('PNG export failed:', err);
    }
  }, []);

  const exportCsv = useCallback(
    (data: Record<string, unknown>[], headers: string[], filename: string) => {
      if (!data || data.length === 0) return;

      const csvLines: string[] = [];
      csvLines.push(headers.join(','));

      for (const row of data) {
        const values = headers.map((h) => {
          const val = row[h];
          if (val == null) return '';
          return String(val);
        });
        csvLines.push(values.join(','));
      }

      const csvString = csvLines.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, filename + '.csv');
    },
    []
  );

  return { chartRef, exportPng, exportCsv };
}
