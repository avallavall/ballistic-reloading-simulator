'use client';

import { useState } from 'react';
import { Target, Plus, Trash2, X, Pencil } from 'lucide-react';
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
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { useBullets, useCreateBullet, useUpdateBullet, useDeleteBullet } from '@/hooks/useBullets';
import type { BulletCreate } from '@/lib/types';

const materialOptions = [
  { value: 'copper', label: 'Cobre' },
  { value: 'lead', label: 'Plomo' },
  { value: 'fmj', label: 'FMJ (Full Metal Jacket)' },
  { value: 'hollow_point', label: 'Punta Hueca' },
  { value: 'polymer_tip', label: 'Punta Polimero' },
  { value: 'solid_copper', label: 'Cobre Solido' },
  { value: 'other', label: 'Otro' },
];

const emptyForm: BulletCreate = {
  name: '',
  manufacturer: '',
  weight_grains: 0,
  diameter_mm: 0,
  length_mm: 0,
  bc_g1: 0,
  bc_g7: 0,
  sectional_density: 0,
  material: 'fmj',
};

export default function BulletsPage() {
  const { data: bullets, isLoading, isError } = useBullets();
  const createMutation = useCreateBullet();
  const updateMutation = useUpdateBullet();
  const deleteMutation = useDeleteBullet();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BulletCreate>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleChange = (field: keyof BulletCreate, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]:
        field === 'name' || field === 'manufacturer' || field === 'material'
          ? value
          : Number(value),
    }));
  };

  const handleEdit = (bullet: typeof bullets extends (infer T)[] | undefined ? T : never) => {
    if (!bullet) return;
    setEditingId(bullet.id);
    setForm({
      name: bullet.name,
      manufacturer: bullet.manufacturer,
      weight_grains: bullet.weight_grains,
      diameter_mm: bullet.diameter_mm,
      length_mm: bullet.length_mm,
      bc_g1: bullet.bc_g1,
      bc_g7: bullet.bc_g7,
      sectional_density: bullet.sectional_density,
      material: bullet.material,
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
          <h2 className="text-2xl font-bold text-white">Proyectiles</h2>
          <p className="mt-1 text-sm text-slate-400">
            Gestiona la base de datos de proyectiles
          </p>
        </div>
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

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target size={18} className="text-blue-400" />
              {editingId ? 'Editar Proyectil' : 'Nuevo Proyectil'}
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
                  placeholder="Ej: Sierra MatchKing 168gr"
                  required
                />
                <Input
                  label="Fabricante"
                  id="manufacturer"
                  value={form.manufacturer}
                  onChange={(e) => handleChange('manufacturer', e.target.value)}
                  placeholder="Ej: Sierra"
                  required
                />
                <Input
                  label="Peso"
                  id="weight_grains"
                  type="number"
                  step="any"
                  suffix="gr"
                  value={form.weight_grains || ''}
                  onChange={(e) => handleChange('weight_grains', e.target.value)}
                  required
                />
                <Input
                  label="Diametro"
                  id="diameter_mm"
                  type="number"
                  step="any"
                  suffix="mm"
                  value={form.diameter_mm || ''}
                  onChange={(e) => handleChange('diameter_mm', e.target.value)}
                  required
                />
                <Input
                  label="Longitud"
                  id="length_mm"
                  type="number"
                  step="any"
                  suffix="mm"
                  value={form.length_mm || ''}
                  onChange={(e) => handleChange('length_mm', e.target.value)}
                  required
                />
                <Input
                  label="BC G1"
                  id="bc_g1"
                  type="number"
                  step="any"
                  value={form.bc_g1 || ''}
                  onChange={(e) => handleChange('bc_g1', e.target.value)}
                  required
                />
                <Input
                  label="BC G7"
                  id="bc_g7"
                  type="number"
                  step="any"
                  value={form.bc_g7 || ''}
                  onChange={(e) => handleChange('bc_g7', e.target.value)}
                  required
                />
                <Input
                  label="Densidad Seccional"
                  id="sectional_density"
                  type="number"
                  step="any"
                  value={form.sectional_density || ''}
                  onChange={(e) => handleChange('sectional_density', e.target.value)}
                  required
                />
                <Select
                  label="Material"
                  id="material"
                  value={form.material}
                  onChange={(e) => handleChange('material', e.target.value)}
                  options={materialOptions}
                  placeholder="Seleccionar material"
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
                    'Actualizar Proyectil'
                  ) : (
                    'Guardar Proyectil'
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
              Error al cargar los proyectiles. Verifica la conexion con el servidor.
            </p>
          </CardContent>
        </Card>
      )}

      {bullets && bullets.length === 0 && !showForm && (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-slate-800 p-4">
                <Target size={32} className="text-slate-500" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-slate-300">
                Sin proyectiles registrados
              </h3>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Agrega tu primer proyectil para comenzar a configurar cargas.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => setShowForm(true)}
              >
                <Plus size={14} />
                Agregar Proyectil
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {bullets && bullets.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Fabricante</TableHead>
              <TableHead>Peso (gr)</TableHead>
              <TableHead>Diametro (mm)</TableHead>
              <TableHead>BC G1</TableHead>
              <TableHead>BC G7</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bullets.map((bullet) => (
              <TableRow key={bullet.id}>
                <TableCell className="font-medium text-white">
                  {bullet.name}
                </TableCell>
                <TableCell>{bullet.manufacturer}</TableCell>
                <TableCell className="font-mono">
                  {bullet.weight_grains}
                </TableCell>
                <TableCell className="font-mono">
                  {bullet.diameter_mm}
                </TableCell>
                <TableCell className="font-mono">{bullet.bc_g1}</TableCell>
                <TableCell className="font-mono">{bullet.bc_g7}</TableCell>
                <TableCell className="text-right">
                  {deleteConfirm === bullet.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-red-400">Eliminar?</span>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(bullet.id)}
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
                        onClick={() => handleEdit(bullet)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(bullet.id)}
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
