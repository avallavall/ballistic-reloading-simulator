'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Flame, ArrowLeft, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { usePowders } from '@/hooks/usePowders';
import { cn } from '@/lib/utils';
import type { Powder } from '@/lib/types';

type SortBy = 'burn_rate' | 'name';

interface PropertyRow {
  label: string;
  key: keyof Powder;
  format: (value: number | string) => string;
  unit?: string;
  bestFn?: 'min' | 'max';
}

const PROPERTIES: PropertyRow[] = [
  {
    label: 'Nombre',
    key: 'name',
    format: (v) => String(v),
  },
  {
    label: 'Fabricante',
    key: 'manufacturer',
    format: (v) => String(v),
  },
  {
    label: 'Burn Rate Relativo',
    key: 'burn_rate_relative',
    format: (v) => String(Number(v).toFixed(2)),
  },
  {
    label: 'Fuerza',
    key: 'force_constant_j_kg',
    format: (v) => Number(v).toLocaleString(),
    unit: 'J/kg',
    bestFn: 'max',
  },
  {
    label: 'Covolumen',
    key: 'covolume_m3_kg',
    format: (v) => Number(v).toFixed(6),
    unit: 'm\u00B3/kg',
  },
  {
    label: 'Temp. Llama',
    key: 'flame_temp_k',
    format: (v) => Number(v).toLocaleString(),
    unit: 'K',
    bestFn: 'min',
  },
  {
    label: 'Gamma',
    key: 'gamma',
    format: (v) => Number(v).toFixed(3),
  },
  {
    label: 'Densidad',
    key: 'density_g_cm3',
    format: (v) => Number(v).toFixed(3),
    unit: 'g/cm\u00B3',
    bestFn: 'max',
  },
  {
    label: 'Coef. Combustion',
    key: 'burn_rate_coeff',
    format: (v) => Number(v).toExponential(3),
  },
  {
    label: 'Exp. Combustion',
    key: 'burn_rate_exp',
    format: (v) => Number(v).toFixed(3),
  },
];

function BurnRateBar({ value, min, max }: { value: number; min: number; max: number }) {
  const range = max - min;
  const pct = range > 0 ? ((value - min) / range) * 100 : 50;

  // Gradient: blue (slow) -> yellow (medium) -> red (fast)
  let barColor: string;
  if (pct < 33) {
    barColor = 'bg-blue-500';
  } else if (pct < 66) {
    barColor = 'bg-yellow-500';
  } else {
    barColor = 'bg-red-500';
  }

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-slate-700">
        <div
          className={cn('h-2 rounded-full', barColor)}
          style={{ width: `${Math.max(5, pct)}%` }}
        />
      </div>
    </div>
  );
}

export default function PowderComparePage() {
  const { data: powders, isLoading, isError } = usePowders();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortBy>('burn_rate');

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 5) {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (!powders) return;
    if (selectedIds.size === powders.length || selectedIds.size >= 5) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(powders.slice(0, 5).map((p) => p.id)));
    }
  };

  const selectedPowders = useMemo(() => {
    if (!powders) return [];
    const selected = powders.filter((p) => selectedIds.has(p.id));
    return selected.sort((a, b) => {
      if (sortBy === 'burn_rate') return a.burn_rate_relative - b.burn_rate_relative;
      return a.name.localeCompare(b.name);
    });
  }, [powders, selectedIds, sortBy]);

  const burnRateRange = useMemo(() => {
    if (!selectedPowders.length) return { min: 0, max: 100 };
    const rates = selectedPowders.map((p) => p.burn_rate_relative);
    return { min: Math.min(...rates), max: Math.max(...rates) };
  }, [selectedPowders]);

  const bestValues = useMemo(() => {
    if (selectedPowders.length < 2) return new Map<string, number | string>();
    const bests = new Map<string, number | string>();

    for (const prop of PROPERTIES) {
      if (!prop.bestFn) continue;
      const values = selectedPowders.map((p) => Number(p[prop.key]));
      const best = prop.bestFn === 'min' ? Math.min(...values) : Math.max(...values);
      bests.set(prop.key, best);
    }

    return bests;
  }, [selectedPowders]);

  const isBestValue = (prop: PropertyRow, powder: Powder): boolean => {
    if (!prop.bestFn || selectedPowders.length < 2) return false;
    const best = bestValues.get(prop.key);
    return best !== undefined && Number(powder[prop.key]) === best;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/powders">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} />
              Volver
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-white">Comparar Polvoras</h2>
            <p className="mt-1 text-sm text-slate-400">
              Selecciona 2-5 polvoras para comparar sus propiedades
            </p>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {isError && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent>
            <p className="text-red-400">
              Error al cargar las polvoras. Verifica la conexion con el servidor.
            </p>
          </CardContent>
        </Card>
      )}

      {powders && powders.length > 0 && (
        <>
          {/* Selection panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame size={18} className="text-orange-400" />
                Seleccionar Polvoras ({selectedIds.size}/5)
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedIds.size > 0 ? 'Deseleccionar todo' : 'Seleccionar primeras 5'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {powders.map((powder) => {
                  const isSelected = selectedIds.has(powder.id);
                  const isDisabled = !isSelected && selectedIds.size >= 5;
                  return (
                    <button
                      key={powder.id}
                      onClick={() => !isDisabled && toggleSelection(powder.id)}
                      disabled={isDisabled}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all',
                        isSelected
                          ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                          : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300',
                        isDisabled && 'cursor-not-allowed opacity-40'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded border',
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-slate-600'
                        )}
                      >
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                      <span className="font-medium">{powder.name}</span>
                      <span className="text-xs text-slate-500">{powder.manufacturer}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Comparison table */}
          {selectedPowders.length >= 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Tabla Comparativa</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Ordenar columnas:</span>
                  <Button
                    variant={sortBy === 'burn_rate' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setSortBy('burn_rate')}
                  >
                    Burn Rate
                  </Button>
                  <Button
                    variant={sortBy === 'name' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setSortBy('name')}
                  >
                    Nombre
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Propiedad</TableHead>
                    {selectedPowders.map((powder) => (
                      <TableHead key={powder.id}>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-white">{powder.name}</span>
                          <span className="text-[10px] font-normal normal-case text-slate-500">
                            {powder.manufacturer}
                          </span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PROPERTIES.map((prop) => (
                    <TableRow key={prop.key}>
                      <TableCell className="font-medium text-slate-400">
                        <div className="flex items-center gap-1">
                          {prop.label}
                          {prop.unit && (
                            <span className="text-xs text-slate-600">({prop.unit})</span>
                          )}
                        </div>
                      </TableCell>
                      {selectedPowders.map((powder) => {
                        const value = powder[prop.key];
                        const best = isBestValue(prop, powder);

                        return (
                          <TableCell
                            key={powder.id}
                            className={cn(
                              'font-mono',
                              best && 'bg-green-500/10'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn(best && 'font-semibold text-green-400')}>
                                {prop.format(value)}
                              </span>
                              {best && (
                                <Badge variant="success">mejor</Badge>
                              )}
                              {prop.key === 'burn_rate_relative' && (
                                <BurnRateBar
                                  value={Number(value)}
                                  min={burnRateRange.min}
                                  max={burnRateRange.max}
                                />
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded bg-green-500/20 border border-green-500/30" />
                  Mejor valor en la propiedad
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-6 rounded-full bg-blue-500" />
                  Lenta
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-6 rounded-full bg-yellow-500" />
                  Media
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-6 rounded-full bg-red-500" />
                  Rapida
                </div>
              </div>
            </div>
          )}

          {selectedPowders.length === 1 && (
            <Card>
              <CardContent>
                <p className="py-8 text-center text-slate-500">
                  Selecciona al menos una polvora mas para ver la comparativa.
                </p>
              </CardContent>
            </Card>
          )}

          {selectedPowders.length === 0 && (
            <Card>
              <CardContent>
                <p className="py-8 text-center text-slate-500">
                  Selecciona entre 2 y 5 polvoras de la lista superior para compararlas.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {powders && powders.length === 0 && (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-slate-800 p-4">
                <Flame size={32} className="text-slate-500" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-slate-300">
                Sin polvoras registradas
              </h3>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Necesitas al menos 2 polvoras para usar la comparativa.
              </p>
              <Link href="/powders">
                <Button variant="primary" size="sm" className="mt-4">
                  Ir a Polvoras
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
