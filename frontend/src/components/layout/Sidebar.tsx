'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Crosshair,
  Package,
  Flame,
  Target,
  Disc,
  Ruler,
  BarChart2,
  Search,
  ShieldCheck,
  PenTool,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems: { href: string; label: string; icon: typeof Home; indent?: boolean }[] = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/simulate', label: 'Simulacion', icon: Crosshair },
  { href: '/ladder', label: 'Ladder Test', icon: BarChart2 },
  { href: '/loads', label: 'Cargas', icon: Package },
  { href: '/powders', label: 'Polvoras', icon: Flame },
  { href: '/powders/compare', label: 'Comparar Polvoras', icon: Flame, indent: true },
  { href: '/powders/search', label: 'Busqueda Parametrica', icon: Search, indent: true },
  { href: '/validation', label: 'Validacion', icon: ShieldCheck },
  { href: '/drawings', label: 'Dibujos Tecnicos', icon: PenTool },
  { href: '/bullets', label: 'Proyectiles', icon: Target },
  { href: '/cartridges', label: 'Cartuchos', icon: Disc },
  { href: '/rifles', label: 'Rifles', icon: Ruler },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-700 bg-slate-900 transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo area */}
      <div className="flex h-16 items-center justify-between border-b border-slate-700 px-4">
        {!collapsed && (
          <span className="text-sm font-bold tracking-wide text-blue-400">
            BALISTICA
          </span>
        )}
        <button
          onClick={onToggle}
          className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive = item.indent
            ? pathname === item.href
            : pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href) && !navItems.some(
                (other) => other.indent && other.href !== item.href && pathname.startsWith(other.href)
              ));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                item.indent && !collapsed && 'ml-4 text-xs'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={item.indent ? 16 : 20} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-slate-700 px-4 py-3">
          <p className="text-xs text-slate-500">Simulador de Balistica v0.1</p>
        </div>
      )}
    </aside>
  );
}
