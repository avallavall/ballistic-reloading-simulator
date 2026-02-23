'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { useDebounce } from '@/hooks/useDebounce';
import type { ListParams } from '@/lib/api';
import type { PaginatedResponse } from '@/lib/types';

interface ComponentPickerProps<T> {
  open: boolean;
  onClose: () => void;
  onSelect: (item: T) => void;
  title: string;
  fetchFn: (params: ListParams) => Promise<PaginatedResponse<T>>;
  renderItem: (item: T) => React.ReactNode;
  getId: (item: T) => string;
  selectedId?: string;
}

export default function ComponentPicker<T>({
  open,
  onClose,
  onSelect,
  title,
  fetchFn,
  renderItem,
  getId,
  selectedId,
}: ComponentPickerProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedQuery = useDebounce(searchTerm, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset search term when modal opens
  useEffect(() => {
    if (open) {
      setSearchTerm('');
    }
  }, [open]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      // Small delay to ensure the DOM is painted
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [open]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  // Data fetching with TanStack Query
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [title, { q: debouncedQuery.length >= 3 ? debouncedQuery : undefined, page: 1, size: 20 }],
    queryFn: () =>
      fetchFn({
        page: 1,
        size: 20,
        q: debouncedQuery.length >= 3 ? debouncedQuery : undefined,
      }),
    enabled: open,
  });

  const handleSelect = (item: T) => {
    onSelect(item);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open) return null;

  const items = data?.items ?? [];
  const showSpinner = isLoading || isFetching;
  const showEmpty = !showSpinner && items.length === 0 && debouncedQuery.length >= 3;
  const showDefaultEmpty = !showSpinner && items.length === 0 && debouncedQuery.length < 3;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="flex max-h-[70vh] w-full max-w-lg flex-col rounded-xl bg-slate-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search input */}
        <div className="relative border-b border-slate-700 px-4 py-3">
          <Search size={16} className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Escribe para buscar..."
            className="w-full rounded-lg border border-slate-600 bg-slate-900 py-2 pl-9 pr-9 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-7 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto">
          {showSpinner && (
            <div className="flex items-center justify-center py-12">
              <Spinner size="md" />
            </div>
          )}

          {showEmpty && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <p className="text-sm text-slate-400">
                No se encontraron resultados.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Intenta ajustar tu busqueda.
              </p>
            </div>
          )}

          {showDefaultEmpty && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <p className="text-sm text-slate-500">
                No hay registros disponibles.
              </p>
            </div>
          )}

          {!showSpinner && items.length > 0 && (
            <ul>
              {items.map((item) => {
                const id = getId(item);
                const isSelected = id === selectedId;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`w-full cursor-pointer border-b border-slate-700/50 px-4 py-3 text-left transition-colors hover:bg-slate-700 ${
                        isSelected
                          ? 'border-l-2 border-l-blue-500 bg-blue-600/20'
                          : ''
                      }`}
                    >
                      {renderItem(item)}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
