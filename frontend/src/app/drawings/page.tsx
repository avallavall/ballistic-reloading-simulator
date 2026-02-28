'use client';

/**
 * Technical Drawings page (/drawings).
 * Allows users to select a cartridge and optionally a rifle and bullet,
 * then view cross-section, chamber, and assembly technical drawings.
 * Reads query params to support deep linking from simulation results.
 */

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { PenTool } from 'lucide-react';
import { useCartridges } from '@/hooks/useCartridges';
import { useRifles } from '@/hooks/useRifles';
import { useBullets } from '@/hooks/useBullets';
import DrawingViewer from '@/components/drawings/DrawingViewer';
import Spinner from '@/components/ui/Spinner';
import type { Cartridge, Rifle, Bullet } from '@/lib/types';
import type { DrawingTab } from '@/lib/drawings/types';

export default function DrawingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Spinner size="lg" /></div>}>
      <DrawingsPageContent />
    </Suspense>
  );
}

function DrawingsPageContent() {
  const searchParams = useSearchParams();

  // Data fetching
  const { data: cartridges, isLoading: loadingCartridges } = useCartridges();
  const { data: rifles, isLoading: loadingRifles } = useRifles();
  const { data: bullets, isLoading: loadingBullets } = useBullets();

  // Selection state
  const [selectedCartridgeId, setSelectedCartridgeId] = useState<string>('');
  const [selectedRifleId, setSelectedRifleId] = useState<string>('');
  const [selectedBulletId, setSelectedBulletId] = useState<string>('');
  const [initialTab, setInitialTab] = useState<DrawingTab>('cross-section');
  const [paramsApplied, setParamsApplied] = useState(false);

  // Apply query params on initial data load
  useEffect(() => {
    if (paramsApplied) return;
    if (!cartridges || !rifles || !bullets) return;

    const cartridgeIdParam = searchParams.get('cartridge_id');
    const rifleIdParam = searchParams.get('rifle_id');
    const bulletIdParam = searchParams.get('bullet_id');
    const tabParam = searchParams.get('tab');

    if (cartridgeIdParam && cartridges.some((c) => c.id === cartridgeIdParam)) {
      setSelectedCartridgeId(cartridgeIdParam);
    }
    if (rifleIdParam && rifles.some((r: Rifle) => r.id === rifleIdParam)) {
      setSelectedRifleId(rifleIdParam);
    }
    if (bulletIdParam && bullets.some((b: Bullet) => b.id === bulletIdParam)) {
      setSelectedBulletId(bulletIdParam);
    }
    if (tabParam === 'cross-section' || tabParam === 'chamber' || tabParam === 'assembly') {
      setInitialTab(tabParam);
    }

    setParamsApplied(true);
  }, [cartridges, rifles, bullets, searchParams, paramsApplied]);

  // Resolve selected entities
  const selectedCartridge = useMemo(
    () => cartridges?.find((c) => c.id === selectedCartridgeId) ?? null,
    [cartridges, selectedCartridgeId]
  );

  const selectedRifle = useMemo(
    () => (rifles as Rifle[] | undefined)?.find((r) => r.id === selectedRifleId) ?? null,
    [rifles, selectedRifleId]
  );

  const selectedBullet = useMemo(
    () => bullets?.find((b) => b.id === selectedBulletId) ?? null,
    [bullets, selectedBulletId]
  );

  // Filter rifles by selected cartridge
  const filteredRifles = useMemo(() => {
    if (!rifles) return [];
    if (!selectedCartridgeId) return rifles as Rifle[];
    return (rifles as Rifle[]).filter((r) => r.cartridge_id === selectedCartridgeId);
  }, [rifles, selectedCartridgeId]);

  // Filter bullets by caliber compatibility (within 0.5mm of bore or groove diameter)
  const filteredBullets = useMemo(() => {
    if (!bullets) return [];
    if (!selectedCartridge) return bullets;
    const bore = selectedCartridge.bore_diameter_mm;
    const groove = selectedCartridge.groove_diameter_mm;
    return bullets.filter((b) => {
      const d = b.diameter_mm;
      return Math.abs(d - bore) <= 0.5 || Math.abs(d - groove) <= 0.5;
    });
  }, [bullets, selectedCartridge]);

  // Sort cartridges by name
  const sortedCartridges = useMemo(
    () => [...(cartridges || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [cartridges]
  );

  // Reset rifle/bullet when cartridge changes
  const handleCartridgeChange = (id: string) => {
    setSelectedCartridgeId(id);
    setSelectedRifleId('');
    setSelectedBulletId('');
  };

  const isLoading = loadingCartridges || loadingRifles || loadingBullets;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <PenTool size={24} className="text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Dibujos Tecnicos</h1>
          <p className="text-sm text-slate-400">
            Visualiza secciones transversales, recamaras y conjuntos con cotas tecnicas
          </p>
        </div>
      </div>

      {/* Selectors */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Cartridge selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Cartucho
            </label>
            <select
              value={selectedCartridgeId}
              onChange={(e) => handleCartridgeChange(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Seleccionar cartucho...</option>
              {sortedCartridges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Rifle selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Rifle (opcional)
            </label>
            <select
              value={selectedRifleId}
              onChange={(e) => setSelectedRifleId(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Seleccionar rifle (opcional)...</option>
              {filteredRifles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Bullet selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Proyectil (opcional)
            </label>
            <select
              value={selectedBulletId}
              onChange={(e) => setSelectedBulletId(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Seleccionar proyectil (opcional)...</option>
              {filteredBullets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.weight_grains} gr, {b.manufacturer})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Drawing viewer or empty state */}
      {selectedCartridge ? (
        <DrawingViewer
          key={`${selectedCartridgeId}-${selectedRifleId}-${selectedBulletId}`}
          cartridge={selectedCartridge}
          bullet={selectedBullet || undefined}
          rifle={selectedRifle || undefined}
          initialTab={initialTab}
        />
      ) : !isLoading ? (
        <div className="flex flex-col items-center justify-center rounded border-2 border-dashed border-slate-700 py-20 text-center">
          <PenTool size={48} className="text-slate-600" />
          <h3 className="mt-4 text-lg font-medium text-slate-400">
            Selecciona un cartucho para ver los dibujos tecnicos
          </h3>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Los dibujos incluyen seccion transversal del cartucho, detalle de recamara
            y vista de conjunto con cotas en milimetros y pulgadas.
          </p>
        </div>
      ) : null}
    </div>
  );
}
