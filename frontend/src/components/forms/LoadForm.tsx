'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import type { Rifle, Bullet, Powder, LoadCreate } from '@/lib/types';

interface LoadFormProps {
  rifles: Rifle[];
  bullets: Bullet[];
  powders: Powder[];
  isLoading: boolean;
  onSubmit: (data: LoadCreate) => void;
  onCancel: () => void;
  initialData?: Partial<LoadCreate>;
}

export default function LoadForm({
  rifles,
  bullets,
  powders,
  isLoading,
  onSubmit,
  onCancel,
  initialData,
}: LoadFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [rifleId, setRifleId] = useState(initialData?.rifle_id || '');
  const [bulletId, setBulletId] = useState(initialData?.bullet_id || '');
  const [powderId, setPowderId] = useState(initialData?.powder_id || '');
  const [chargeGrains, setChargeGrains] = useState(
    initialData?.powder_charge_grains || 42
  );
  const [coalMm, setCoalMm] = useState(initialData?.coal_mm || 71.0);
  const [seatingDepthMm, setSeatingDepthMm] = useState(
    initialData?.seating_depth_mm || 8.0
  );
  const [notes, setNotes] = useState(initialData?.notes || '');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'El nombre es obligatorio';
    if (!rifleId) newErrors.rifle = 'Selecciona un rifle';
    if (!bulletId) newErrors.bullet = 'Selecciona un proyectil';
    if (!powderId) newErrors.powder = 'Selecciona una polvora';
    if (chargeGrains <= 0) newErrors.charge = 'La carga debe ser mayor a 0';
    if (coalMm <= 0) newErrors.coal = 'El COAL debe ser mayor a 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      name: name.trim(),
      rifle_id: rifleId,
      bullet_id: bulletId,
      powder_id: powderId,
      powder_charge_grains: chargeGrains,
      coal_mm: coalMm,
      seating_depth_mm: seatingDepthMm,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        id="load-name"
        label="Nombre de la carga"
        placeholder='Ej: "H4350 42gr - 168 ELD-M"'
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Select
          id="load-rifle"
          label="Rifle"
          placeholder="-- Seleccionar --"
          value={rifleId}
          onChange={(e) => setRifleId(e.target.value)}
          options={rifles.map((r) => ({
            value: r.id,
            label: r.name,
          }))}
          error={errors.rifle}
        />
        <Select
          id="load-bullet"
          label="Proyectil"
          placeholder="-- Seleccionar --"
          value={bulletId}
          onChange={(e) => setBulletId(e.target.value)}
          options={bullets.map((b) => ({
            value: b.id,
            label: `${b.name} ${b.weight_grains}gr`,
          }))}
          error={errors.bullet}
        />
        <Select
          id="load-powder"
          label="Polvora"
          placeholder="-- Seleccionar --"
          value={powderId}
          onChange={(e) => setPowderId(e.target.value)}
          options={powders.map((p) => ({
            value: p.id,
            label: p.name,
          }))}
          error={errors.powder}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Input
          id="load-charge"
          label="Carga de polvora"
          type="number"
          step={0.1}
          value={chargeGrains}
          onChange={(e) => setChargeGrains(parseFloat(e.target.value) || 0)}
          suffix="gr"
          error={errors.charge}
        />
        <Input
          id="load-coal"
          label="COAL"
          type="number"
          step={0.01}
          value={coalMm}
          onChange={(e) => setCoalMm(parseFloat(e.target.value) || 0)}
          suffix="mm"
          error={errors.coal}
        />
        <Input
          id="load-seating"
          label="Prof. asentado"
          type="number"
          step={0.01}
          value={seatingDepthMm}
          onChange={(e) =>
            setSeatingDepthMm(parseFloat(e.target.value) || 0)
          }
          suffix="mm"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="load-notes"
          className="block text-sm font-medium text-slate-300"
        >
          Notas
        </label>
        <textarea
          id="load-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input-field resize-none"
          placeholder="Notas opcionales sobre esta carga..."
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? (
            <>
              <Spinner size="sm" className="text-white" />
              Guardando...
            </>
          ) : (
            'Guardar Carga'
          )}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
