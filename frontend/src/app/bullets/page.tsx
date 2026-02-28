'use client';

import { useState } from 'react';
import { FilterBar } from '@/components/filters/FilterBar';
import { useManufacturers, useCaliberFamilies } from '@/hooks/useFilterOptions';
import { useDebounce } from '@/hooks/useDebounce';
import { Target, Plus, Trash2, X, Pencil } from 'lucide-react';
import BulletProfile from '@/components/drawings/BulletProfile';
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
import QualityBadge from '@/components/ui/QualityBadge';
import SkeletonRows from '@/components/ui/SkeletonRows';
import Pagination from '@/components/ui/Pagination';
import { displayValue } from '@/lib/utils';
import { useBulletsPaginated, useCreateBullet, useUpdateBullet, useDeleteBullet } from '@/hooks/useBullets';
import type { Bullet, BulletCreate } from '@/lib/types';

const BULLET_TYPE_COLORS: Record<string, string> = {
  'Match':    'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Hunting':  'bg-green-500/15 text-green-400 border-green-500/30',
  'Target':   'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'Tactical': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

const BASE_TYPE_COLORS: Record<string, string> = {
  'BT':     'bg-sky-500/15 text-sky-400 border-sky-500/30',
  'FB':     'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Hybrid': 'bg-violet-500/15 text-violet-400 border-violet-500/30',
};

function TypeBadge({ value, colorMap }: { value: string | null | undefined; colorMap: Record<string, string> }) {
  if (!value) return <span className="text-gray-500">{'\u2014'}</span>;
  const colors = colorMap[value] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${colors}`}>
      {value}
    </span>
  );
}

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
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [caliberFamily, setCaliberFamily] = useState('');
  const [qualityLevel, setQualityLevel] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const handleFilterChange = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const { data, isLoading, isError, isPlaceholderData } = useBulletsPaginated({
    page,
    size,
    q: debouncedSearch || undefined,
    manufacturer: manufacturer || undefined,
    caliber_family: caliberFamily || undefined,
    quality_level: qualityLevel || undefined,
  });

  const { data: manufacturers = [] } = useManufacturers('bullets');
  const { data: caliberFamilies = [] } = useCaliberFamilies('bullets');

  const hasActiveFilters = !!(debouncedSearch || manufacturer || caliberFamily || qualityLevel);

  const handleClearFilters = () => {
    setSearchTerm('');
    setManufacturer('');
    setCaliberFamily('');
    setQualityLevel('');
    setPage(1);
  };
  const bullets = data?.items ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / size);
  const createMutation = useCreateBullet();
  const updateMutation = useUpdateBullet();
  const deleteMutation = useDeleteBullet();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BulletCreate>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const editingBullet = editingId ? bullets.find(b => b.id === editingId) ?? null : null;

  const handleChange = (field: keyof BulletCreate, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]:
        field === 'name' || field === 'manufacturer' || field === 'material'
          ? value
          : Number(value),
    }));
  };

  const handleEdit = (bullet: Bullet) => {
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
            {editingBullet && (
              <div className="mt-4 border-t border-slate-700 pt-4">
                <p className="mb-2 text-xs font-medium text-slate-400">Vista previa</p>
                <BulletProfile bullet={editingBullet} style="modern" />
              </div>
            )}
          </CardContent>
        </Card>
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

      {!isLoading && bullets.length === 0 && !showForm && !hasActiveFilters && (
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

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={handleFilterChange(setSearchTerm)}
        manufacturers={manufacturers}
        selectedManufacturer={manufacturer}
        onManufacturerChange={handleFilterChange(setManufacturer)}
        caliberFamilies={caliberFamilies}
        selectedCaliberFamily={caliberFamily}
        onCaliberFamilyChange={handleFilterChange(setCaliberFamily)}
        selectedQualityLevel={qualityLevel}
        onQualityLevelChange={handleFilterChange(setQualityLevel)}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
      />

      {!isLoading && bullets.length === 0 && hasActiveFilters && (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-sm text-slate-400">No se encontraron resultados</p>
          <button
            onClick={handleClearFilters}
            className="mt-2 text-sm text-blue-400 hover:text-blue-300"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {(isLoading || bullets.length > 0) && (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>N. Modelo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>Longitud (mm)</TableHead>
                <TableHead>Peso (gr)</TableHead>
                <TableHead>Diametro (mm)</TableHead>
                <TableHead>BC G1</TableHead>
                <TableHead>BC G7</TableHead>
                <TableHead>Calidad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonRows columns={11} rows={size} />
              ) : (
                <>
                  {bullets.map((bullet) => (
                    <TableRow
                      key={bullet.id}
                      className={isPlaceholderData ? 'opacity-50 transition-opacity' : 'transition-opacity'}
                    >
                      <TableCell className="font-medium text-white">
                        {bullet.name}
                      </TableCell>
                      <TableCell className={bullet.model_number == null ? 'text-gray-500' : ''}>
                        {displayValue(bullet.model_number)}
                      </TableCell>
                      <TableCell>
                        <TypeBadge value={bullet.bullet_type} colorMap={BULLET_TYPE_COLORS} />
                      </TableCell>
                      <TableCell>
                        <TypeBadge value={bullet.base_type} colorMap={BASE_TYPE_COLORS} />
                      </TableCell>
                      <TableCell className={`font-mono ${bullet.length_mm == null ? 'text-gray-500' : ''}`}>
                        {bullet.length_mm != null ? bullet.length_mm.toFixed(2) : '\u2014'}
                      </TableCell>
                      <TableCell className="font-mono">
                        {bullet.weight_grains}
                      </TableCell>
                      <TableCell className="font-mono">
                        {bullet.diameter_mm}
                      </TableCell>
                      <TableCell className="font-mono">{bullet.bc_g1}</TableCell>
                      <TableCell className={`font-mono ${bullet.bc_g7 == null ? 'text-gray-500' : ''}`}>
                        {bullet.bc_g7 != null ? bullet.bc_g7 : '\u2014'}
                      </TableCell>
                      <TableCell>
                        <QualityBadge
                          score={bullet.quality_score}
                          level={bullet.quality_level}
                          tooltip={bullet.quality_tooltip}
                        />
                      </TableCell>
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
                </>
              )}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            totalPages={totalPages}
            size={size}
            onPageChange={setPage}
            onSizeChange={(s) => { setSize(s); setPage(1); }}
          />
        </div>
      )}
    </div>
  );
}
