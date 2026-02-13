'use client';

import Link from 'next/link';
import {
  Crosshair,
  Flame,
  Target,
  Package,
  Ruler,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { usePowders } from '@/hooks/usePowders';
import { useBullets } from '@/hooks/useBullets';
import { useLoads } from '@/hooks/useLoads';
import { useRifles } from '@/hooks/useRifles';

interface StatCardProps {
  title: string;
  value: number | undefined;
  icon: React.ReactNode;
  href: string;
  isLoading: boolean;
}

function StatCard({ title, value, icon, href, isLoading }: StatCardProps) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-slate-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">{title}</p>
            {isLoading ? (
              <Spinner size="sm" className="mt-2" />
            ) : (
              <p className="mt-1 font-mono text-3xl font-bold text-white">
                {value ?? 0}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-slate-700/50 p-3 text-slate-400">
            {icon}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: powders, isLoading: loadingPowders } = usePowders();
  const { data: bullets, isLoading: loadingBullets } = useBullets();
  const { data: loads, isLoading: loadingLoads } = useLoads();
  const { data: rifles, isLoading: loadingRifles } = useRifles();

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-400">
          Resumen general del simulador de balistica
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Polvoras"
          value={powders?.length}
          icon={<Flame size={24} />}
          href="/powders"
          isLoading={loadingPowders}
        />
        <StatCard
          title="Proyectiles"
          value={bullets?.length}
          icon={<Target size={24} />}
          href="/bullets"
          isLoading={loadingBullets}
        />
        <StatCard
          title="Cargas"
          value={loads?.length}
          icon={<Package size={24} />}
          href="/loads"
          isLoading={loadingLoads}
        />
        <StatCard
          title="Rifles"
          value={rifles?.length}
          icon={<Ruler size={24} />}
          href="/rifles"
          isLoading={loadingRifles}
        />
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acceso rapido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/simulate">
              <div className="group flex items-center gap-4 rounded-lg border border-slate-700 p-4 transition-all hover:border-blue-500/50 hover:bg-blue-500/5">
                <div className="rounded-lg bg-blue-500/10 p-3 text-blue-400">
                  <Crosshair size={24} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">Nueva Simulacion</p>
                  <p className="text-sm text-slate-400">
                    Ejecutar una simulacion balistica
                  </p>
                </div>
                <ArrowRight
                  size={18}
                  className="text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-blue-400"
                />
              </div>
            </Link>

            <Link href="/loads">
              <div className="group flex items-center gap-4 rounded-lg border border-slate-700 p-4 transition-all hover:border-blue-500/50 hover:bg-blue-500/5">
                <div className="rounded-lg bg-green-500/10 p-3 text-green-400">
                  <Package size={24} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">Gestionar Cargas</p>
                  <p className="text-sm text-slate-400">
                    Crear y editar recetas de recarga
                  </p>
                </div>
                <ArrowRight
                  size={18}
                  className="text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-blue-400"
                />
              </div>
            </Link>

            <Link href="/rifles">
              <div className="group flex items-center gap-4 rounded-lg border border-slate-700 p-4 transition-all hover:border-blue-500/50 hover:bg-blue-500/5">
                <div className="rounded-lg bg-purple-500/10 p-3 text-purple-400">
                  <Ruler size={24} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">Mis Rifles</p>
                  <p className="text-sm text-slate-400">
                    Configurar rifles y canones
                  </p>
                </div>
                <ArrowRight
                  size={18}
                  className="text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-blue-400"
                />
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-blue-500/10 p-3 text-blue-400">
              <Crosshair size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-white">
                Simulador de Balistica de Precision
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Motor de balistica interna basado en el modelo de Lagrange con
                ecuacion de estado Nobel-Abel. Calcula presion en recamara,
                velocidad en boca y analisis de seguridad SAAMI/CIP.
              </p>
              <Link href="/simulate">
                <Button variant="primary" size="sm" className="mt-3">
                  Iniciar Simulacion
                  <ArrowRight size={14} />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
