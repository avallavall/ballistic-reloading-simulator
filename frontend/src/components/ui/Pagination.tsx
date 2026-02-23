'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  size: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];

  if (current > 3) {
    pages.push('...');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('...');
  }

  pages.push(total);

  return pages;
}

export default function Pagination({
  page,
  totalPages,
  size,
  onPageChange,
  onSizeChange,
}: PaginationProps) {
  if (totalPages <= 1 && size === 20) return null;

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span>Mostrar</span>
        <select
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
          className="rounded bg-slate-800 border border-slate-600 text-slate-300 px-2 py-1 text-sm
            focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
        <span>por pagina</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700
            disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Pagina anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageNumbers.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-slate-500">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[2rem] px-2 py-1 rounded text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700
            disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Pagina siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
