'use client';

/**
 * Data completeness feedback component.
 * Shows warnings when drawing data is incomplete or insufficient.
 * Regular HTML component (not SVG), rendered above the drawing.
 */

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, XCircle } from 'lucide-react';

interface CompletenessBannerProps {
  completeness: 'full' | 'basic' | 'insufficient';
  estimatedFields: string[];
  totalFields: number;
  entityType: 'cartridge' | 'rifle';
  entityId: string;
}

export default function CompletenessBanner({
  completeness,
  estimatedFields,
  totalFields,
  entityType,
  entityId,
}: CompletenessBannerProps) {
  if (completeness === 'full') {
    return null;
  }

  const available = totalFields - estimatedFields.length;
  const editPath = entityType === 'cartridge' ? '/cartridges' : '/rifles';
  const entityLabel = entityType === 'cartridge' ? 'cartucho' : 'rifle';

  if (completeness === 'insufficient') {
    return (
      <div className="flex items-center gap-3 rounded border border-red-600 bg-red-900/30 px-4 py-3 text-red-200">
        <XCircle className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            No hay suficientes dimensiones para dibujar este {entityLabel}
          </p>
          <p className="mt-1 text-xs text-red-300">
            Campos estimados: {estimatedFields.join(', ')}
          </p>
        </div>
        <Link
          href={editPath}
          className="rounded bg-red-800 px-3 py-1 text-xs font-medium text-red-100 hover:bg-red-700 transition-colors"
        >
          Completar datos
        </Link>
      </div>
    );
  }

  // completeness === 'basic'
  return (
    <div className="flex items-center gap-3 rounded border border-amber-600 bg-amber-900/30 px-4 py-3 text-amber-200">
      <AlertTriangle className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium">
          Vista basica &mdash; {available} de {totalFields} dimensiones disponibles
        </p>
        <p className="mt-1 text-xs text-amber-300">
          Estimados: {estimatedFields.join(', ')}
        </p>
      </div>
      <Link
        href={editPath}
        className="rounded bg-amber-800 px-3 py-1 text-xs font-medium text-amber-100 hover:bg-amber-700 transition-colors"
      >
        Completar datos
      </Link>
    </div>
  );
}
