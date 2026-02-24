'use client';

import { useState } from 'react';
import { Package, Plus, Trash2, X, Pencil } from 'lucide-react';
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
import { displayValue } from '@/lib/utils';
import { useLoads, useCreateLoad, useUpdateLoad, useDeleteLoad } from '@/hooks/useLoads';
import { usePowders } from '@/hooks/usePowders';
import { useBullets } from '@/hooks/useBullets';
import { useRifles } from '@/hooks/useRifles';
import type { LoadCreate } from '@/lib/types';

const emptyForm: LoadCreate = {
  name: '',
  powder_id: '',
  bullet_id: '',
  rifle_id: '',
  powder_charge_grains: 0,
  coal_mm: 0,
  seating_depth_mm: 0,
  notes: '',
};

export default function LoadsPage() {
  const { data: loads, isLoading, isError } = useLoads();
  const { data: powders } = usePowders();
  const { data: bullets } = useBullets();
  const { data: rifles } = useRifles();
  const createMutation = useCreateLoad();
  const updateMutation = useUpdateLoad();
  const deleteMutation = useDeleteLoad();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LoadCreate>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const powderOptions = (powders || []).map((p) => ({
    value: p.id,
    label: `${p.name} (${p.manufacturer})`,
  }));

  const bulletOptions = (bullets || []).map((b) => ({
    value: b.id,
    label: `${b.name} - ${b.weight_grains}gr`,
  }));

  const rifleOptions = (rifles || []).map((r) => ({
    value: r.id,
    label: r.name,
  }));

  const handleChange = (field: keyof LoadCreate, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]:
        field === 'name' ||
        field === 'powder_id' ||
        field === 'bullet_id' ||
        field === 'rifle_id' ||
        field === 'notes'
          ? value
          : Number(value),
    }));
  };

  const handleEdit = (load: typeof loads extends (infer T)[] | undefined ? T : never) => {
    if (!load) return;
    setEditingId(load.id);
    setForm({
      name: load.name,
      powder_id: load.powder_id,
      bullet_id: load.bullet_id,
      rifle_id: load.rifle_id,
      powder_charge_grains: load.powder_charge_grains,
      coal_mm: load.coal_mm,
      seating_depth_mm: load.seating_depth_mm,
      notes: load.notes || '',
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

  const getPowderName = (id: string) =>
    powders?.find((p) => p.id === id)?.name || id;
  const getBulletName = (id: string) =>
    bullets?.find((b) => b.id === id)?.name || id;
  const getRifleName = (id: string) =>
    rifles?.find((r) => r.id === id)?.name || id;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Cargas</h2>
          <p className="mt-1 text-sm text-slate-400">
            Gestiona tus recetas de recarga de municion
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
              <Package size={18} className="text-green-400" />
              {editingId ? 'Editar Carga' : 'Nueva Carga'}
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
                  placeholder="Ej: .308 Win 168gr Match"
                  required
                />
                <Select
                  label="Polvora"
                  id="powder_id"
                  value={form.powder_id}
                  onChange={(e) => handleChange('powder_id', e.target.value)}
                  options={powderOptions}
                  placeholder="Seleccionar polvora"
                  required
                />
                <Select
                  label="Proyectil"
                  id="bullet_id"
                  value={form.bullet_id}
                  onChange={(e) => handleChange('bullet_id', e.target.value)}
                  options={bulletOptions}
                  placeholder="Seleccionar proyectil"
                  required
                />
                <Select
                  label="Rifle"
                  id="rifle_id"
                  value={form.rifle_id}
                  onChange={(e) => handleChange('rifle_id', e.target.value)}
                  options={rifleOptions}
                  placeholder="Seleccionar rifle"
                  required
                />
                <Input
                  label="Carga de Polvora"
                  id="powder_charge_grains"
                  type="number"
                  step="any"
                  suffix="gr"
                  value={form.powder_charge_grains || ''}
                  onChange={(e) =>
                    handleChange('powder_charge_grains', e.target.value)
                  }
                  required
                />
                <Input
                  label="COAL"
                  id="coal_mm"
                  type="number"
                  step="any"
                  suffix="mm"
                  value={form.coal_mm || ''}
                  onChange={(e) => handleChange('coal_mm', e.target.value)}
                  required
                />
                <Input
                  label="Profundidad Asentamiento"
                  id="seating_depth_mm"
                  type="number"
                  step="any"
                  suffix="mm"
                  value={form.seating_depth_mm || ''}
                  onChange={(e) =>
                    handleChange('seating_depth_mm', e.target.value)
                  }
                  required
                />
                <div className="sm:col-span-2 lg:col-span-2">
                  <Input
                    label="Notas"
                    id="notes"
                    value={form.notes || ''}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Notas opcionales sobre esta carga..."
                  />
                </div>
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
                    'Actualizar Carga'
                  ) : (
                    'Guardar Carga'
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
              Error al cargar las cargas. Verifica la conexion con el servidor.
            </p>
          </CardContent>
        </Card>
      )}

      {loads && loads.length === 0 && !showForm && (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-slate-800 p-4">
                <Package size={32} className="text-slate-500" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-slate-300">
                Sin cargas registradas
              </h3>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Agrega tu primera receta de recarga. Necesitas tener al menos una
                polvora, un proyectil y un rifle registrados.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => setShowForm(true)}
              >
                <Plus size={14} />
                Agregar Carga
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loads && loads.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Polvora</TableHead>
              <TableHead>Proyectil</TableHead>
              <TableHead>Rifle</TableHead>
              <TableHead>Carga (gr)</TableHead>
              <TableHead>COAL (mm)</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loads.map((load) => (
              <TableRow key={load.id}>
                <TableCell className="font-medium text-white">
                  {load.name}
                </TableCell>
                <TableCell>
                  {load.powder?.name || getPowderName(load.powder_id)}
                </TableCell>
                <TableCell>
                  {load.bullet?.name || getBulletName(load.bullet_id)}
                </TableCell>
                <TableCell>
                  {load.rifle?.name || getRifleName(load.rifle_id)}
                </TableCell>
                <TableCell className="font-mono">
                  {load.powder_charge_grains}
                </TableCell>
                <TableCell className="font-mono">{load.coal_mm}</TableCell>
                <TableCell className="text-right">
                  {deleteConfirm === load.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-red-400">Eliminar?</span>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(load.id)}
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
                        onClick={() => handleEdit(load)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(load.id)}
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
