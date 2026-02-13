'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Flame, Plus, Trash2, X, Pencil, ArrowLeftRight } from 'lucide-react';
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
import { usePowders, useCreatePowder, useUpdatePowder, useDeletePowder } from '@/hooks/usePowders';
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
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PowderCreate>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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
