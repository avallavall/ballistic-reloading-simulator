'use client';

import { type ReactNode } from 'react';
import { Download, Image, Maximize2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { useChartExport } from '@/hooks/useChartExport';

type DomainColor = 'blue' | 'orange' | 'red' | 'green';

interface ChartTileProps {
  title: string;
  domainColor: DomainColor;
  children: ReactNode;
  data: Record<string, unknown>[];
  csvHeaders: string[];
  csvFilename: string;
  onExpand: () => void;
  badge?: string;
}

const borderColors: Record<DomainColor, string> = {
  blue: 'border-l-blue-500',
  orange: 'border-l-orange-500',
  red: 'border-l-red-500',
  green: 'border-l-green-500',
};

const badgeColors: Record<DomainColor, string> = {
  blue: 'bg-blue-500/20 text-blue-400',
  orange: 'bg-orange-500/20 text-orange-400',
  red: 'bg-red-500/20 text-red-400',
  green: 'bg-green-500/20 text-green-400',
};

export default function ChartTile({
  title,
  domainColor,
  children,
  data,
  csvHeaders,
  csvFilename,
  onExpand,
  badge,
}: ChartTileProps) {
  const { chartRef, exportPng, exportCsv } = useChartExport();

  return (
    <Card className={`border-l-4 ${borderColors[domainColor]}`}>
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-white">{title}</h4>
          {badge && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeColors[domainColor]}`}
            >
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => exportPng(csvFilename)}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
            title="Descargar PNG"
          >
            <Image size={14} />
          </button>
          <button
            onClick={() => exportCsv(data, csvHeaders, csvFilename)}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
            title="Descargar CSV"
          >
            <Download size={14} />
          </button>
          <button
            onClick={onExpand}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
            title="Expandir"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
      <CardContent className="px-4 pb-4">
        <div ref={chartRef}>{children}</div>
      </CardContent>
    </Card>
  );
}
