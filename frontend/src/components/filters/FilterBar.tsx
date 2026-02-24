'use client';

import { Search, X } from 'lucide-react';

const QUALITY_OPTIONS = [
  { value: '', label: 'Todas las calidades' },
  { value: 'success', label: 'Alta (70-100)' },
  { value: 'warning', label: 'Media (40-69)' },
  { value: 'danger', label: 'Baja (0-39)' },
];

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  manufacturers?: string[];
  selectedManufacturer?: string;
  onManufacturerChange?: (value: string) => void;

  caliberFamilies?: string[];
  selectedCaliberFamily?: string;
  onCaliberFamilyChange?: (value: string) => void;

  selectedQualityLevel?: string;
  onQualityLevelChange?: (value: string) => void;

  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar por nombre...',
  manufacturers,
  selectedManufacturer,
  onManufacturerChange,
  caliberFamilies,
  selectedCaliberFamily,
  onCaliberFamilyChange,
  selectedQualityLevel,
  onQualityLevelChange,
  hasActiveFilters,
  onClearFilters,
}: FilterBarProps) {
  const selectClass =
    'bg-slate-800 border border-slate-600 text-slate-300 text-sm rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-500';

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
      {/* Manufacturer dropdown */}
      {manufacturers && onManufacturerChange && (
        <select
          value={selectedManufacturer ?? ''}
          onChange={(e) => onManufacturerChange(e.target.value)}
          className={selectClass}
        >
          <option value="">Todos los fabricantes</option>
          {manufacturers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      )}

      {/* Caliber family dropdown */}
      {caliberFamilies && onCaliberFamilyChange && (
        <select
          value={selectedCaliberFamily ?? ''}
          onChange={(e) => onCaliberFamilyChange(e.target.value)}
          className={selectClass}
        >
          <option value="">Todas las familias</option>
          {caliberFamilies.map((cf) => (
            <option key={cf} value={cf}>
              {cf}
            </option>
          ))}
        </select>
      )}

      {/* Quality level dropdown */}
      {onQualityLevelChange && (
        <select
          value={selectedQualityLevel ?? ''}
          onChange={(e) => onQualityLevelChange(e.target.value)}
          className={selectClass}
        >
          {QUALITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* Clear filters link */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          Limpiar filtros
        </button>
      )}

      {/* Search input - right aligned */}
      <div className="relative ml-auto">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-56 rounded-md border border-slate-600 bg-slate-800 py-1.5 pl-8 pr-8 text-sm text-slate-300 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
