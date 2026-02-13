'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Flame, Plus, Trash2, X, Pencil, ArrowLeftRight, Upload, FileUp, CheckCircle, AlertCircle } from 'lucide-react';
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
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { usePowders, useCreatePowder, useUpdatePowder, useDeletePowder, useImportGrtPowders } from '@/hooks/usePowders';
import type { PowderCreate } from '@/lib/types';

const emptyForm: PowderCreate = {
  name: '',
  manufacturer: '',
  burn_rate_relative: 0,
  force_constant_j_kg: 0,
  covolume_m3_kg: 0,
  flame_temp_k: 0,
  gamma: 1.2,
  density_g_cm3: 0,
  burn_rate_coeff: 0,
  burn_rate_exp: 0,
};

export default function PowdersPage() {
  const { data: powders, isLoading, isError } = usePowders();
  const createMutation = useCreatePowder();
  const updateMutation = useUpdatePowder();
  const deleteMutation = useDeletePowder();
  const importMutation = useImportGrtPowders();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PowderCreate>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: string[]; errors: string[] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof PowderCreate, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: field === 'name' || field === 'manufacturer' ? value : Number(value),
    }));
  };

  const handleEdit = (powder: typeof powders extends (infer T)[] | undefined ? T : never) => {
    if (!powder) return;
    setEditingId(powder.id);
    setForm({
      name: powder.name,
      manufacturer: powder.manufacturer,
      burn_rate_relative: powder.burn_rate_relative,
      force_constant_j_kg: powder.force_constant_j_kg,
      covolume_m3_kg: powder.covolume_m3_kg,
      flame_temp_k: powder.flame_temp_k,
      gamma: powder.gamma,
      density_g_cm3: powder.density_g_cm3,
      burn_rate_coeff: powder.burn_rate_coeff,
      burn_rate_exp: powder.burn_rate_exp,
    });
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: form },
        {
          onSuccess: () => {
            setForm(emptyForm);
            setShowForm(false);
            setEditingId(null);
          },
        }
      );
    } else {
      createMutation.mutate(form, {
        onSuccess: () => {
          setForm(emptyForm);
          setShowForm(false);
        },
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => setDeleteConfirm(null),
    });
  };

  const handleImportFile = useCallback((file: File) => {
    setImportError(null);
    setImportResult(null);
    importMutation.mutate(file, {
      onSuccess: (data) => {
        setImportResult({ created: data.created.length, skipped: data.skipped, errors: data.errors });
      },
      onError: (error) => {
        setImportError(error instanceof Error ? error.message : 'Error al importar archivo');
      },
    });
  }, [importMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImportFile(file);
    }
  }, [handleImportFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportFile(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleImportFile]);

  const handleCloseImport = () => {
    setShowImport(false);
    setImportResult(null);
    setImportError(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Polvoras</h2>
          <p className="mt-1 text-sm text-slate-400">
            Gestiona la base de datos de polvoras de recarga
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showImport ? 'secondary' : 'secondary'}
            onClick={() => {
              if (showImport) {
                handleCloseImport();
              } else {
                setShowImport(true);
                setShowForm(false);
                setEditingId(null);
              }
            }}
          >
            {showImport ? <X size={16} /> : <Upload size={16} />}
            {showImport ? 'Cerrar' : 'Importar GRT'}
          </Button>
          <Link href="/powders/compare">
            <Button variant="secondary">
              <ArrowLeftRight size={16} />
              Comparar
            </Button>
          </Link>
          <Button
            variant={showForm ? 'secondary' : 'primary'}
            onClick={() => {
              if (showForm) {
                handleCancelForm();
              } else {
                setShowForm(true);
                setShowImport(false);
              }
            }}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancelar' : 'Agregar'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame size={18} className="text-orange-400" />
              {editingId ? 'Editar Polvora' : 'Nueva Polvora'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input
                  label="Nombre"
                  id="name"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ej: Vihtavuori N140"
                  required
                />
                <Input
                  label="Fabricante"
                  id="manufacturer"
                  value={form.manufacturer}
                  onChange={(e) => handleChange('manufacturer', e.target.value)}
                  placeholder="Ej: Vihtavuori"
                  required
                />
                <Input
                  label="Burn Rate Relativo"
                  id="burn_rate_relative"
                  type="number"
                  step="any"
                  value={form.burn_rate_relative || ''}
                  onChange={(e) => handleChange('burn_rate_relative', e.target.value)}
                  required
                />
                <Input
                  label="Fuerza"
                  id="force_constant_j_kg"
                  type="number"
                  step="any"
                  suffix="J/kg"
                  value={form.force_constant_j_kg || ''}
                  onChange={(e) => handleChange('force_constant_j_kg', e.target.value)}
                  required
                />
                <Input
                  label="Covolumen"
                  id="covolume_m3_kg"
                  type="number"
                  step="any"
                  suffix="m3/kg"
                  value={form.covolume_m3_kg || ''}
                  onChange={(e) => handleChange('covolume_m3_kg', e.target.value)}
                  required
                />
                <Input
                  label="Temp. Llama"
                  id="flame_temp_k"
                  type="number"
                  step="any"
                  suffix="K"
                  value={form.flame_temp_k || ''}
                  onChange={(e) => handleChange('flame_temp_k', e.target.value)}
                  required
                />
                <Input
                  label="Gamma"
                  id="gamma"
                  type="number"
                  step="any"
                  value={form.gamma || ''}
                  onChange={(e) => handleChange('gamma', e.target.value)}
                  required
                />
                <Input
                  label="Densidad"
                  id="density_g_cm3"
                  type="number"
                  step="any"
                  suffix="g/cm3"
                  value={form.density_g_cm3 || ''}
                  onChange={(e) => handleChange('density_g_cm3', e.target.value)}
                  required
                />
                <Input
                  label="Coef. Combustion"
                  id="burn_rate_coeff"
                  type="number"
                  step="any"
                  value={form.burn_rate_coeff || ''}
                  onChange={(e) => handleChange('burn_rate_coeff', e.target.value)}
                  required
                />
                <Input
                  label="Exp. Combustion"
                  id="burn_rate_exp"
                  type="number"
                  step="any"
                  value={form.burn_rate_exp || ''}
                  onChange={(e) => handleChange('burn_rate_exp', e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancelForm}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <Spinner size="sm" />
                      Guardando...
                    </>
                  ) : editingId ? (
                    'Actualizar Polvora'
                  ) : (
                    'Guardar Polvora'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showImport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload size={18} className="text-blue-400" />
              Importar desde GRT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-slate-400">
              Sube un archivo <code className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300">.propellant</code> o{' '}
              <code className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300">.zip</code> exportado de
              Gordon&apos;s Reloading Tool (GRT) para importar polvoras automaticamente.
            </p>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".propellant,.zip"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Drop zone */}
            {!importMutation.isPending && !importResult && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
                  isDragOver
                    ? 'border-blue-400 bg-blue-500/10'
                    : 'border-slate-600 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800'
                }`}
              >
                <FileUp size={40} className={isDragOver ? 'text-blue-400' : 'text-slate-500'} />
                <p className="mt-3 text-sm font-medium text-slate-300">
                  Arrastra tu archivo aqui o haz clic para seleccionar
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Archivos .propellant o .zip de GRT
                </p>
              </div>
            )}

            {/* Loading state */}
            {importMutation.isPending && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-800/50 px-6 py-12">
                <Spinner size="lg" />
                <p className="mt-3 text-sm text-slate-300">Procesando archivo GRT...</p>
                <p className="mt-1 text-xs text-slate-500">Convirtiendo parametros de polvora</p>
              </div>
            )}

            {/* Success state */}
            {importResult && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 px-6 py-8">
                <div className="flex flex-col items-center text-center">
                  <CheckCircle size={40} className="text-green-400" />
                  <h3 className="mt-3 text-lg font-medium text-green-300">
                    Importacion completada
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Se importaron{' '}
                    <Badge variant="success">{importResult.created}</Badge>{' '}
                    {importResult.created === 1 ? 'polvora' : 'polvoras'} correctamente.
                  </p>
                  {importResult.skipped.length > 0 && (
                    <p className="mt-2 text-xs text-yellow-400">
                      Omitidas (ya existen): {importResult.skipped.join(', ')}
                    </p>
                  )}
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 text-left">
                      {importResult.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-400">{err}</p>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setImportResult(null);
                        setImportError(null);
                      }}
                    >
                      <Upload size={14} />
                      Importar otro archivo
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleCloseImport}
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Error state */}
            {importError && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-red-300">Error al importar</p>
                    <p className="mt-1 text-xs text-red-400/80">{importError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer buttons */}
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={handleCloseImport}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

      {powders && powders.length === 0 && !showForm && (
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
                Agrega tu primera polvora para comenzar a configurar cargas de recarga.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => setShowForm(true)}
              >
                <Plus size={14} />
                Agregar Polvora
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {powders && powders.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Fabricante</TableHead>
              <TableHead>Burn Rate Rel</TableHead>
              <TableHead>Fuerza (J/kg)</TableHead>
              <TableHead>Temp Llama (K)</TableHead>
              <TableHead>Densidad</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {powders.map((powder) => (
              <TableRow key={powder.id}>
                <TableCell className="font-medium text-white">
                  {powder.name}
                </TableCell>
                <TableCell>{powder.manufacturer}</TableCell>
                <TableCell className="font-mono">
                  {powder.burn_rate_relative}
                </TableCell>
                <TableCell className="font-mono">
                  {powder.force_constant_j_kg.toLocaleString()}
                </TableCell>
                <TableCell className="font-mono">
                  {powder.flame_temp_k.toLocaleString()}
                </TableCell>
                <TableCell className="font-mono">
                  {powder.density_g_cm3}
                </TableCell>
                <TableCell className="text-right">
                  {deleteConfirm === powder.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-red-400">Eliminar?</span>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(powder.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Si
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setDeleteConfirm(null)}
                      >
                        No
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(powder)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(powder.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
