'use client';

import { useState } from 'react';
import { getPowderAliases } from '@/lib/api';
import type { Powder } from '@/lib/types';

interface AliasBadgeProps {
  powderId: string;
  aliasGroup: string;
}

export default function AliasBadge({ powderId, aliasGroup }: AliasBadgeProps) {
  const [hovered, setHovered] = useState(false);
  const [aliases, setAliases] = useState<Powder[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleMouseEnter = async () => {
    setHovered(true);
    if (aliases !== null || loading) return;
    setLoading(true);
    try {
      const data = await getPowderAliases(powderId);
      setAliases(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
  };

  const badgeText = aliases ? `${aliases.length} aliases` : aliasGroup;

  return (
    <span
      className="group/alias relative inline-flex items-center cursor-default"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="inline-flex items-center rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 text-xs font-medium">
        {badgeText}
      </span>
      {hovered && (
        <span
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
            whitespace-pre-line max-w-xs rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-200
            opacity-0 transition-opacity group-hover/alias:opacity-100 border border-slate-600 shadow-lg z-10"
        >
          {loading && 'Cargando...'}
          {error && 'Sin datos'}
          {aliases && aliases.length > 0 && aliases.map((a) => `${a.name} (${a.manufacturer})`).join('\n')}
          {aliases && aliases.length === 0 && 'Sin aliases vinculados'}
        </span>
      )}
    </span>
  );
}
