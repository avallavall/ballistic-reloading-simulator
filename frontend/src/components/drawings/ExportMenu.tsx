'use client';

/**
 * Export dropdown menu for technical drawings.
 * Offers PNG (600 DPI), SVG (vector), and PDF (print) formats.
 * Both styles are always exported.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { ExportFormat } from '@/lib/drawings/types';

interface ExportMenuProps {
  onExport: (format: ExportFormat) => void;
  exporting: boolean;
}

const EXPORT_OPTIONS: { format: ExportFormat; label: string }[] = [
  { format: 'png', label: 'PNG (600 DPI)' },
  { format: 'svg', label: 'SVG (vector)' },
  { format: 'pdf', label: 'PDF (print)' },
];

export default function ExportMenu({ onExport, exporting }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        disabled={exporting}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded bg-slate-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exporting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Download size={14} />
        )}
        Exportar
      </button>

      {open && !exporting && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded border border-slate-600 bg-slate-800 shadow-lg">
          {EXPORT_OPTIONS.map((opt) => (
            <button
              key={opt.format}
              type="button"
              onClick={() => {
                onExport(opt.format);
                setOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 first:rounded-t last:rounded-b transition-colors"
            >
              {opt.label}
            </button>
          ))}
          <div className="border-t border-slate-700 px-4 py-2">
            <p className="text-xs text-slate-500">Se exportan ambos estilos</p>
          </div>
        </div>
      )}
    </div>
  );
}
