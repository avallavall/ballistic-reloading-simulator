'use client';

/**
 * Orchestrator component for technical drawings.
 * Composites DrawingTabs, StyleToggle, ExportMenu, CompletenessBanner,
 * and the active drawing component (CartridgeCrossSection, ChamberDrawing, or AssemblyDrawing).
 * Maintains a hidden alt-style drawing for dual-style export.
 */

import React, { useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Cartridge, Bullet, Rifle, SimulationResult } from '@/lib/types';
import { DrawingTab } from '@/lib/drawings/types';
import { generateCartridgeProfile } from '@/lib/geometry/cartridge-geometry';
import { CartridgeDimensions } from '@/lib/geometry/types';
import { computeChamberClearances } from '@/lib/drawings/chamber-geometry';
import { useDrawingStyle } from '@/hooks/useDrawingStyle';
import { useSvgExport } from '@/hooks/useSvgExport';
import DrawingTabs from './DrawingTabs';
import ExportMenu from './ExportMenu';
import StyleToggle from './StyleToggle';
import CompletenessBanner from './CompletenessBanner';
import CartridgeCrossSection from './CartridgeCrossSection';
import ChamberDrawing from './ChamberDrawing';
import AssemblyDrawing from './AssemblyDrawing';
import Spinner from '@/components/ui/Spinner';

const CartridgeViewer3DLazy = dynamic(
  () => import('./viewer3d/CartridgeViewer3D'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center" style={{ height: '60vh', minHeight: 400 }}>
        <Spinner size="lg" />
      </div>
    ),
  }
);

interface DrawingViewerProps {
  cartridge: Cartridge;
  bullet?: Bullet;
  rifle?: Rifle;
  simulation?: SimulationResult;
  initialTab?: DrawingTab;
}

/** Total cartridge dimension fields used for completeness computation */
const CARTRIDGE_TOTAL_FIELDS = 13;

function toCartridgeDims(c: Cartridge): CartridgeDimensions {
  return {
    case_length_mm: c.case_length_mm,
    base_diameter_mm: c.base_diameter_mm,
    neck_diameter_mm: c.neck_diameter_mm,
    bore_diameter_mm: c.bore_diameter_mm,
    groove_diameter_mm: c.groove_diameter_mm,
    rim_diameter_mm: c.rim_diameter_mm,
    shoulder_diameter_mm: c.shoulder_diameter_mm,
    shoulder_angle_deg: c.shoulder_angle_deg,
    neck_length_mm: c.neck_length_mm,
    body_length_mm: c.body_length_mm,
    rim_thickness_mm: c.rim_thickness_mm,
    case_type: c.case_type,
  };
}

export default function DrawingViewer({
  cartridge,
  bullet,
  rifle,
  simulation,
  initialTab = 'cross-section',
}: DrawingViewerProps) {
  const [activeTab, setActiveTab] = React.useState<DrawingTab>(initialTab);
  const { style, toggleStyle } = useDrawingStyle();
  const { exporting, exportDrawing } = useSvgExport();

  const primaryRef = useRef<SVGSVGElement>(null);
  const altRef = useRef<SVGSVGElement>(null);

  const altStyle = style === 'blueprint' ? 'modern' : 'blueprint';

  // Compute data completeness for the cross-section / cartridge drawings
  const cartridgeGeometry = useMemo(() => {
    const dims = toCartridgeDims(cartridge);
    return generateCartridgeProfile(dims);
  }, [cartridge]);

  // Compute chamber clearances for estimated field tracking
  const chamberClearances = useMemo(() => {
    if (!rifle) return null;
    return computeChamberClearances(cartridge, bullet ?? null, rifle);
  }, [cartridge, bullet, rifle]);

  // Determine completeness info for the active tab
  const { completeness, estimatedFields, totalFields, entityType } = useMemo(() => {
    if (activeTab === 'cross-section') {
      return {
        completeness: cartridgeGeometry.dataCompleteness,
        estimatedFields: cartridgeGeometry.estimatedFields,
        totalFields: CARTRIDGE_TOTAL_FIELDS,
        entityType: 'cartridge' as const,
      };
    }
    if (activeTab === 'chamber' && chamberClearances) {
      return {
        completeness:
          chamberClearances.estimated_fields.length === 0
            ? ('full' as const)
            : chamberClearances.estimated_fields.length <= 3
            ? ('basic' as const)
            : ('insufficient' as const),
        estimatedFields: chamberClearances.estimated_fields,
        totalFields: 6, // headspace, neck clearance, body clearance, freebore, throat angle, rifling engagement
        entityType: 'rifle' as const,
      };
    }
    // Assembly and 3D tabs use cartridge completeness
    return {
      completeness: cartridgeGeometry.dataCompleteness,
      estimatedFields: cartridgeGeometry.estimatedFields,
      totalFields: CARTRIDGE_TOTAL_FIELDS,
      entityType: 'cartridge' as const,
    };
  }, [activeTab, cartridgeGeometry, chamberClearances]);

  // Build export filename
  const basename = useMemo(() => {
    const tabNames: Record<DrawingTab, string> = {
      'cross-section': 'seccion-transversal',
      chamber: 'recamara',
      assembly: 'conjunto',
      '3d': 'vista-3d',
    };
    const safeName = cartridge.name.replace(/[^a-zA-Z0-9.-]/g, '-');
    const date = new Date().toISOString().slice(0, 10);
    return `${safeName}-${tabNames[activeTab]}-${date}`;
  }, [cartridge.name, activeTab]);

  return (
    <div>
      {/* Controls bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <DrawingTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasSimulation={!!simulation}
          hasRifle={!!rifle}
        />
        {activeTab !== '3d' && (
          <div className="flex items-center gap-3">
            <StyleToggle style={style} onToggle={toggleStyle} />
            <ExportMenu
              onExport={(fmt) => exportDrawing(fmt, primaryRef, altRef, basename)}
              exporting={exporting}
            />
          </div>
        )}
      </div>

      {/* Completeness banner */}
      <div className="mb-4">
        <CompletenessBanner
          completeness={completeness}
          estimatedFields={estimatedFields}
          totalFields={totalFields}
          entityType={entityType}
          entityId={cartridge.id}
        />
      </div>

      {/* Primary drawing (visible) - 2D tabs */}
      {activeTab !== '3d' && (
        <div className="overflow-x-auto rounded border border-slate-700 bg-slate-800/50 flex items-center justify-center" style={{ maxHeight: '70vh' }}>
          {activeTab === 'cross-section' && (
            <CartridgeCrossSection
              ref={primaryRef}
              cartridge={cartridge}
              bullet={bullet}
              style={style}
            />
          )}
          {activeTab === 'chamber' && rifle && (
            <ChamberDrawing
              ref={primaryRef}
              cartridge={cartridge}
              bullet={bullet}
              rifle={rifle}
              style={style}
            />
          )}
          {activeTab === 'assembly' && rifle && (
            <AssemblyDrawing
              ref={primaryRef}
              cartridge={cartridge}
              bullet={bullet}
              rifle={rifle}
              simulation={simulation}
              style={style}
            />
          )}
          {(activeTab === 'chamber' || activeTab === 'assembly') && !rifle && (
            <p className="text-slate-400 p-8 text-center">
              Selecciona un rifle para ver este dibujo
            </p>
          )}
        </div>
      )}

      {/* 3D viewer - only mounts when 3D tab is active (VIS3-04/VIS3-05) */}
      {activeTab === '3d' && cartridgeGeometry.dataCompleteness !== 'insufficient' && (
        <div className="rounded border border-slate-700 bg-slate-900">
          <CartridgeViewer3DLazy
            cartridge={cartridge}
            bullet={bullet}
            rifle={rifle}
          />
        </div>
      )}
      {activeTab === '3d' && cartridgeGeometry.dataCompleteness === 'insufficient' && (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded border border-slate-700 bg-slate-900">
          <p className="text-slate-400 text-lg">
            Datos insuficientes para el modelo 3D
          </p>
          <p className="text-slate-500 text-sm mt-2">
            Completa las dimensiones del cartucho para generar el modelo 3D
          </p>
        </div>
      )}

      {/* Hidden alt-style drawing for dual-style export (2D tabs only) */}
      {activeTab !== '3d' && (
        <div className="hidden" aria-hidden="true">
          {activeTab === 'cross-section' && (
            <CartridgeCrossSection
              ref={altRef}
              cartridge={cartridge}
              bullet={bullet}
              style={altStyle}
            />
          )}
          {activeTab === 'chamber' && rifle && (
            <ChamberDrawing
              ref={altRef}
              cartridge={cartridge}
              bullet={bullet}
              rifle={rifle}
              style={altStyle}
            />
          )}
          {activeTab === 'assembly' && rifle && (
            <AssemblyDrawing
              ref={altRef}
              cartridge={cartridge}
              bullet={bullet}
              rifle={rifle}
              simulation={simulation}
              style={altStyle}
            />
          )}
        </div>
      )}
    </div>
  );
}
