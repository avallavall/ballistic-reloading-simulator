'use client';

import { useState } from 'react';
import { Box, Plus, Trash2, X, Pencil } from 'lucide-react';
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
import {
  useCartridges,
  useCreateCartridge,
  useUpdateCartridge,
  useDeleteCartridge,
} from '@/hooks/useCartridges';
import type { CartridgeCreate } from '@/lib/types';

const emptyForm: CartridgeCreate = {
  name: '',
  saami_max_pressure_psi: 0,
  cip_max_pressure_mpa: 0,
  case_capacity_grains_h2o: 0,
  case_length_mm: 0,
  overall_length_mm: 0,
  bore_diameter_mm: 0,
  groove_diameter_mm: 0,
};

export default function CartridgesPage() {
  const { data: cartridges, isLoading, isError } = useCartridges();
  const createMutation = useCreateCartridge();
  const updateMutation = useUpdateCartridge();
  const deleteMutation = useDeleteCartridge();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CartridgeCreate>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleChange = (field: keyof CartridgeCreate, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: field === 'name' ? value : Number(value),
    }));
  };

  const handleEdit = (cartridge: typeof cartridges extends (infer T)[] | undefined ? T : never) => {
    if (!cartridge) return;
    setEditingId(cartridge.id);
    setForm({
      name: cartridge.name,
      saami_max_pressure_psi: cartridge.saami_max_pressure_psi,
      cip_max_pressure_mpa: cartridge.cip_max_pressure_mpa ?? 0,
      case_capacity_grains_h2o: cartridge.case_capacity_grains_h2o,
      case_length_mm: cartridge.case_length_mm,
      overall_length_mm: cartridge.overall_length_mm,
      bore_diameter_mm: cartridge.bore_diameter_mm,
      groove_diameter_mm: cartridge.groove_diameter_mm,
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
          <h2 className="text-2xl font-bold text-white">Cartuchos</h2>
          <p className="mt-1 text-sm text-slate-400">
            Gestiona los calibres y especificaciones de cartuchos
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
              <Box size={18} className="text-green-400" />
              {editingId ? 'Editar Cartucho' : 'Nuevo Cartucho'}
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
                  placeholder="Ej: .308 Winchester"
                  required
                />
                <Input
                  label="SAAMI Max Presion"
                  id="saami_max_pressure_psi"
                  type="number"
                  step="any"
                  suffix="psi"
                  value={form.saami_max_pressure_psi || ''}
                  onChange={(e) =>
                    handleChange('saami_max_pressure_psi', e.target.value)
                  }
                  required
                />
                <Input
                  label="CIP Max Presion"
                  id="cip_max_pressure_mpa"
                  type="number"
                  step="any"
                  suffix="MPa"
                  value={form.cip_max_pressure_mpa || ''}
                  onChange={(e) =>
                    handleChange('cip_max_pressure_mpa', e.target.value)
                  }
                  required
                />
                <Input
                  label="Capacidad Vaina"
                  id="case_capacity_grains_h2o"
                  type="number"
                  step="any"
                  suffix="gr H2O"
                  value={form.case_capacity_grains_h2o || ''}
                  onChange={(e) =>
                    handleChange('case_capacity_grains_h2o', e.target.value)
                  }
                  required
                />
                <Input
                  label="Long. Vaina"
                  id="case_length_mm"
                  type="number"
                  step="any"
                  suffix="mm"
                  value={form.case_length_mm || ''}
                  onChange={(e) => handleChange('case_length_mm', e.target.value)}
                  required
                />
                <Input
                  label="Long. Total (COAL)"
                  id="overall_length_mm"
                  type="number"
                  step="any"
                  suffix="mm"
                  value={form.overall_length_mm || ''}
                  onChange={(e) =>
                    handleChange('overall_length_mm', e.target.value)
                  }
                  required
                />
                <Input
                  label="Bore Diameter"
                  id="bore_diameter_mm"
                  type="number"
                  step="any"
                  suffix="mm"
                  value={form.bore_diameter_mm || ''}
                  onChange={(e) =>
                    handleChange('bore_diameter_mm', e.target.value)
                  }
                  required
                />
                <Input
                  label="Groove Diameter"
                  id="groove_diameter_mm"
                  type="number"
                  step="any"
                  suffix="mm"
                  value={form.groove_diameter_mm || ''}
                  onChange={(e) =>
                    handleChange('groove_diameter_mm', e.target.value)
                  }
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
                    'Actualizar Cartucho'
                  ) : (
                    'Guardar Cartucho'
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
              Error al cargar los cartuchos. Verifica la conexion con el servidor.
            </p>
          </CardContent>
        </Card>
      )}

      {cartridges && cartridges.length === 0 && !showForm && (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-slate-800 p-4">
                <Box size={32} className="text-slate-500" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-slate-300">
                Sin cartuchos registrados
              </h3>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Agrega tu primer cartucho (calibre) para poder configurar rifles.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => setShowForm(true)}
              >
                <Plus size={14} />
                Agregar Cartucho
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {cartridges && cartridges.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>SAAMI Max (psi)</TableHead>
              <TableHead>Capacidad (gr H2O)</TableHead>
              <TableHead>Long. Vaina (mm)</TableHead>
              <TableHead>Bore (mm)</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cartridges.map((cartridge) => (
              <TableRow key={cartridge.id}>
                <TableCell className="font-medium text-white">
                  {cartridge.name}
                </TableCell>
                <TableCell className="font-mono">
                  {cartridge.saami_max_pressure_psi.toLocaleString()}
                </TableCell>
                <TableCell className="font-mono">
                  {cartridge.case_capacity_grains_h2o}
                </TableCell>
                <TableCell className="font-mono">
                  {cartridge.case_length_mm}
                </TableCell>
                <TableCell className="font-mono">
                  {cartridge.bore_diameter_mm}
                </TableCell>
                <TableCell className="text-right">
                  {deleteConfirm === cartridge.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-red-400">Eliminar?</span>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(cartridge.id)}
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
                        onClick={() => handleEdit(cartridge)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(cartridge.id)}
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
