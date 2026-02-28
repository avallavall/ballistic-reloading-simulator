'use client';

/**
 * Main 3D cartridge viewer scene.
 *
 * Renders a complete React Three Fiber Canvas with:
 * - PBR materials + HDR studio environment
 * - OrbitControls for rotate/zoom/pan
 * - Cutaway toggle for half-section view
 * - Dimension labels toggle
 * - WebGL fallback detection
 *
 * MUST be imported via next/dynamic with ssr: false.
 */

import { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import type { Cartridge, Bullet, Rifle } from '@/lib/types';
import type { CartridgeDimensions, BulletDimensions } from '@/lib/geometry/types';
import { generateCartridgeProfile } from '@/lib/geometry/cartridge-geometry';
import { generateBulletProfile } from '@/lib/geometry/bullet-geometry';
import { createPowderFillGeometry } from '@/lib/geometry/mesh-builder';
import { MATERIALS, CUTAWAY_COLORS } from '@/lib/geometry/materials';
import Spinner from '@/components/ui/Spinner';
import CartridgeMesh from './CartridgeMesh';
import BulletMesh from './BulletMesh';
import PrimerMesh from './PrimerMesh';
import { useCutawayPlane, CutawayPlane } from './CutawayControls';
import DimensionLabels3D from './DimensionLabels3D';

interface CartridgeViewer3DProps {
  cartridge: Cartridge;
  bullet?: Bullet;
  rifle?: Rifle;
  powderChargeGrains?: number;
}

/** Convert Cartridge entity to CartridgeDimensions for geometry engine */
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

/** Convert Bullet entity to BulletDimensions for geometry engine */
function toBulletDims(b: Bullet): BulletDimensions {
  return {
    diameter_mm: b.diameter_mm,
    length_mm: b.length_mm,
    weight_grains: b.weight_grains,
    bearing_surface_mm: b.bearing_surface_mm,
    boat_tail_length_mm: b.boat_tail_length_mm,
    meplat_diameter_mm: b.meplat_diameter_mm,
    ogive_type: b.ogive_type,
    material: b.material,
    bullet_type: b.bullet_type,
    base_type: b.base_type,
  };
}

/** Inner scene component (must be inside Canvas) */
function CartridgeScene({
  cartridge,
  bullet,
  cutawayActive,
  showLabels,
  powderChargeGrains,
}: {
  cartridge: Cartridge;
  bullet?: Bullet;
  cutawayActive: boolean;
  showLabels: boolean;
  powderChargeGrains?: number;
}) {
  const clipPlane = useCutawayPlane(cutawayActive);

  // Generate cartridge profile
  const cartridgeResult = useMemo(
    () => generateCartridgeProfile(toCartridgeDims(cartridge)),
    [cartridge],
  );

  // Generate bullet profile
  const bulletResult = useMemo(() => {
    if (!bullet) return null;
    return generateBulletProfile(toBulletDims(bullet));
  }, [bullet]);

  // Primer dimensions (estimate from base diameter if not available)
  const primerDiameter = (cartridge.base_diameter_mm ?? 12) * 0.45;
  const primerHeight = 3; // mm standard primer cup height

  // Powder fill geometry (optional, only when charge data is available)
  const powderGeometry = useMemo(() => {
    if (powderChargeGrains == null || powderChargeGrains <= 0) return null;
    // Estimate fill height from case capacity ratio
    const caseCapacity = cartridge.case_capacity_grains_h2o;
    const fillRatio = Math.min(powderChargeGrains / caseCapacity, 0.95);
    const caseLength = cartridge.case_length_mm;
    const fillHeight = caseLength * fillRatio * 0.8; // ~80% of case length for full fill
    const innerRadius = ((cartridge.base_diameter_mm ?? 10) / 2) - 0.6; // slightly smaller than inner wall
    return createPowderFillGeometry(innerRadius, fillHeight);
  }, [powderChargeGrains, cartridge]);

  const activeClipPlane = cutawayActive ? clipPlane : null;

  // Max radius for cutaway cap
  const maxRadius = Math.max(
    cartridge.base_diameter_mm ?? 12,
    cartridge.rim_diameter_mm ?? 12,
  ) / 2 + 1;

  const caseLength = cartridge.case_length_mm;
  const bulletLength = bullet?.length_mm ?? (bullet?.diameter_mm ? bullet.diameter_mm * 3 : 0);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 15]} intensity={0.7} castShadow />
      <directionalLight position={[-5, 10, -10]} intensity={0.3} />
      <Environment files="/hdri/studio_small.hdr" />

      {/* Controls */}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={20}
        maxDistance={200}
        enableDamping
        dampingFactor={0.1}
      />

      {/* Assembly group: rotate to horizontal orientation */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {/* Cartridge case */}
        {cartridgeResult.profilePoints.length > 1 && (
          <CartridgeMesh
            profilePoints={cartridgeResult.profilePoints}
            clipPlane={activeClipPlane}
          />
        )}

        {/* Bullet */}
        {bulletResult && bulletResult.profilePoints.length > 1 && (
          <BulletMesh
            profilePoints={bulletResult.profilePoints}
            bulletType={bullet?.bullet_type ?? null}
            clipPlane={activeClipPlane}
            positionY={caseLength}
          />
        )}

        {/* Primer */}
        <PrimerMesh
          primerDiameter={primerDiameter}
          primerHeight={primerHeight}
          clipPlane={activeClipPlane}
        />

        {/* Powder fill (optional) */}
        {powderGeometry && cutawayActive && (
          <mesh
            geometry={powderGeometry}
            position={[0, caseLength * 0.35, 0]}
          >
            <meshStandardMaterial
              color={MATERIALS.powder.color}
              metalness={MATERIALS.powder.metalness}
              roughness={MATERIALS.powder.roughness}
              clippingPlanes={activeClipPlane ? [activeClipPlane] : undefined}
              clipShadows
            />
          </mesh>
        )}

        {/* Cutaway cap */}
        <CutawayPlane
          active={cutawayActive}
          planeRadius={maxRadius}
          color={CUTAWAY_COLORS.brassWall}
        />

        {/* Dimension labels */}
        <DimensionLabels3D
          visible={showLabels}
          caseLength={caseLength}
          oal={caseLength + bulletLength}
          neckDiameter={cartridge.neck_diameter_mm}
          baseDiameter={cartridge.base_diameter_mm}
        />
      </group>
    </>
  );
}

export default function CartridgeViewer3D({
  cartridge,
  bullet,
  rifle,
  powderChargeGrains,
}: CartridgeViewer3DProps) {
  const [cutawayActive, setCutawayActive] = useState(false);
  const [showLabels, setShowLabels] = useState(false);

  // Check if we have enough data to render
  const cartridgeResult = useMemo(
    () => generateCartridgeProfile(toCartridgeDims(cartridge)),
    [cartridge],
  );

  if (cartridgeResult.dataCompleteness === 'insufficient') {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p>Datos insuficientes para generar modelo 3D. Se requieren: longitud de vaina, diametro base y diametro cuello.</p>
      </div>
    );
  }

  const btnBase =
    'px-3 py-1.5 rounded text-sm transition-colors border';
  const btnInactive =
    'bg-slate-800 border-slate-600 text-slate-300 hover:text-white';
  const btnActive =
    'bg-blue-600 border-blue-500 text-white';

  return (
    <div className="relative">
      {/* Toggle buttons bar */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setCutawayActive((v) => !v)}
          className={`${btnBase} ${cutawayActive ? btnActive : btnInactive}`}
        >
          <span className="mr-1">&#9986;</span>
          Seccion
        </button>
        <button
          onClick={() => setShowLabels((v) => !v)}
          className={`${btnBase} ${showLabels ? btnActive : btnInactive}`}
        >
          <span className="mr-1">&#8646;</span>
          Cotas
        </button>
      </div>

      {/* 3D Canvas */}
      <div style={{ height: '60vh', minHeight: 400 }}>
        <Canvas
          gl={{ stencil: true, antialias: true, localClippingEnabled: true }}
          camera={{ position: [0, 30, 80], fov: 45, near: 0.1, far: 1000 }}
          fallback={
            <div className="flex items-center justify-center h-full text-slate-400 p-8">
              WebGL no disponible
            </div>
          }
        >
          <CartridgeScene
            cartridge={cartridge}
            bullet={bullet}
            cutawayActive={cutawayActive}
            showLabels={showLabels}
            powderChargeGrains={powderChargeGrains}
          />
        </Canvas>
      </div>
    </div>
  );
}
