'use client';

import Badge from '@/components/ui/Badge';

interface QualityBadgeProps {
  score?: number;
  level?: string;
  tooltip?: string;
}

const DOT_COLORS: Record<string, string> = {
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  danger: 'bg-red-400',
  default: 'bg-slate-500',
};

const LEVEL_LABELS: Record<string, string> = {
  success: 'Completo',
  warning: 'Parcial',
  danger: 'Minimo',
  default: 'N/D',
};

export default function QualityBadge({ score, level, tooltip }: QualityBadgeProps) {
  const resolvedLevel = level && level in DOT_COLORS ? level : 'default';
  const variant = (resolvedLevel === 'default' ? 'default' : resolvedLevel) as
    | 'default'
    | 'success'
    | 'warning'
    | 'danger';
  const dotColor = DOT_COLORS[resolvedLevel];
  const label = score != null ? `${score} - ${LEVEL_LABELS[resolvedLevel]}` : LEVEL_LABELS[resolvedLevel];
  const tooltipText = tooltip || (score != null ? `Calidad: ${score}/100` : 'Sin datos de calidad');

  return (
    <span className="group relative inline-flex items-center cursor-default">
      <Badge variant={variant}>
        <span className={`inline-block h-2 w-2 rounded-full ${dotColor} mr-1.5`} />
        {label}
      </Badge>
      <span
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          whitespace-nowrap rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-200
          opacity-0 transition-opacity group-hover:opacity-100 border border-slate-600 shadow-lg z-10"
      >
        {tooltipText}
      </span>
    </span>
  );
}
