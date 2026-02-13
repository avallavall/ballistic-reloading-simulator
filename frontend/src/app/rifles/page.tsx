'use client';

import { useState } from 'react';
import { Ruler, Plus, Trash2, X, Pencil } from 'lucide-react';
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
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { useRifles, useCreateRifle, useUpdateRifle, useDeleteRifle } from '@/hooks/useRifles';
import { useCartridges } from '@/hooks/useCartridges';
import type { RifleCreate } from '@/lib/types';

const conditionOptions = [
  { value: 'new', label: 'Nuevo' },
  { value: 'good', label: 'Bueno' },
  { value: 'fair', label: 'Regular' },
  { value: 'worn', label: 'Desgastado' },
];

const conditionBadge: Record<string, 'success' | 'default' | 'warning' | 'danger'> = {
  new: 'success',
  good: 'default',
  fair: 'warning',
  worn: 'danger',
};

const conditionLabel: Record<string, string> = {
  new: 'Nuevo',
  good: 'Bueno',
  fair: 'Regular',
  worn: 'Desgastado',
};

const emptyForm: RifleCreate = {
  name: '',
  barrel_length_mm: 0,
  twist_rate_mm: 0,
  cartridge_id: '',
  chamber_volume_mm3: 0,
  weight_kg: 3.5,
  barrel_condition: 'new',
  round_count: 0,
};

export default function RiflesPage() {
  const { data: rifles, isLoading, isError } = useRifles();
  const { data: cartridges } = useCartridges();
  const createMutation = useCreateRifle();
  const updateMutation = useUpdateRifle();
  const deleteMutation = useDeleteRifle();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RifleCreate>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const cartridgeOptions = (cartridges || []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const handleChange = (field: keyof RifleCreate, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]:
        field === 'name' || field === 'cartridge_id' || field === 'barrel_condition'
          ? value
          : Number(value),
    }));
  };

  const handleEdit = (rifle: typeof rifles extends (infer T)[] | undefined ? T : never) => {
    if (!rifle) return;
    setEditingId(rifle.id);
    setForm({
      name: rifle.name,
      barrel_length_mm: rifle.barrel_length_mm,
      twist_rate_mm: rifle.twist_rate_mm,
      cartridge_id: rifle.cartridge_id,
      chamber_volume_mm3: rifle.chamber_volume_mm3,
      weight_kg: rifle.weight_kg ?? 3.5,
      barrel_condition: rifle.barrel_condition,
      round_count: rifle.round_count,
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

  const getCartridgeName = (cartridgeId: string) => {
    const cartridge = cartridges?.find((c) => c.id === cartridgeId);
    return cartridge?.name || cartridgeId;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Rifles</h2>
          <p className="mt-1 text-sm text-slate-400">
            Gestiona tus rifles y configuraciones de canon
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
              <Ruler size={18} className="text-purple-400" />
              {editingId ? 'Editar Rifle' : 'Nuevo Rifle'}
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
                  placeholder="Ej: Tikka T3x TAC A1"
                  required
                />
                <Input
                  label="Long. Canon"
                  id="barrel_length_mm"
                  type="number"
                  step="any"
                  suffix="mm"
                  value={form.barrel_length_mm || ''}
                  onChange={(e) =>
                    handleChange('barrel_length_mm', e.target.value)
                  }
                  required
                />
                <Input
                  label="Twist Rate"
                  id="twist_rate_mm"
                  type="number"
                  step="any"
                  suffix="mm"
                  value={form.twist_rate_mm || ''}
                  onChange={(e) => handleChange('twist_rate_mm', e.target.value)}
                  required
                />
                <Select
                  label="Cartucho"
                  id="cartridge_id"
                  value={form.cartridge_id}
                  onChange={(e) => handleChange('cartridge_id', e.target.value)}
                  options={cartridgeOptions}
                  placeholder="Seleccionar cartucho"
                  required
                />
                <Input
                  label="Volumen Recamara"
                  id="chamber_volume_mm3"
                  type="number"
                  step="any"
                  suffix="mm3"
                  value={form.chamber_volume_mm3 || ''}
                  onChange={(e) =>
                    handleChange('chamber_volume_mm3', e.target.value)
                  }
                  required
                />
                <Input
                  label="Peso Rifle"
                  id="weight_kg"
                  type="number"
                  step="0.1"
                  suffix="kg"
                  value={form.weight_kg || ''}
                  onChange={(e) => handleChange('weight_kg', e.target.value)}
                />
                <Select
                  label="Condicion"
                  id="barrel_condition"
                  value={form.barrel_condition}
                  onChange={(e) =>
                    handleChange('barrel_condition', e.target.value)
                  }
                  options={conditionOptions}
                />
                <Input
                  label="Disparos Realizados"
                  id="round_count"
                  type="number"
                  step="1"
                  value={form.round_count || ''}
                  onChange={(e) => handleChange('round_count', e.target.value)}
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
                    'Actualizar Rifle'
                  ) : (
                    'Guardar Rifle'
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
              Error al cargar los rifles. Verifica la conexion con el servidor.
            </p>
          </CardContent>
        </Card>
      )}

      {rifles && rifles.length === 0 && !showForm && (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-slate-800 p-4">
                <Ruler size={32} className="text-slate-500" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-slate-300">
                Sin rifles registrados
              </h3>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Agrega tu primer rifle para poder crear cargas y ejecutar simulaciones.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => setShowForm(true)}
              >
                <Plus size={14} />
                Agregar Rifle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {rifles && rifles.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Canon (mm)</TableHead>
              <TableHead>Twist (mm)</TableHead>
              <TableHead>Cartucho</TableHead>
              <TableHead>Peso (kg)</TableHead>
              <TableHead>Condicion</TableHead>
              <TableHead>Disparos</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rifles.map((rifle) => (
              <TableRow key={rifle.id}>
                <TableCell className="font-medium text-white">
                  {rifle.name}
                </TableCell>
                <TableCell className="font-mono">
                  {rifle.barrel_length_mm}
                </TableCell>
                <TableCell className="font-mono">
                  {rifle.twist_rate_mm}
                </TableCell>
                <TableCell>
                  {rifle.cartridge?.name || getCartridgeName(rifle.cartridge_id)}
                </TableCell>
                <TableCell className="font-mono">
                  {rifle.weight_kg ?? 3.5}
                </TableCell>
                <TableCell>
                  <Badge variant={conditionBadge[rifle.barrel_condition] || 'default'}>
                    {conditionLabel[rifle.barrel_condition] || rifle.barrel_condition}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono">
                  {rifle.round_count.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {deleteConfirm === rifle.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-red-400">Eliminar?</span>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(rifle.id)}
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
                        onClick={() => handleEdit(rifle)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(rifle.id)}
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
