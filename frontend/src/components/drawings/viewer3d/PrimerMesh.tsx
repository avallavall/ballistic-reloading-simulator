'use client';

/**
 * Primer cup mesh -- nickel cylinder at the case head.
 *
 * Uses createPrimerGeometry from mesh-builder for the cylinder shape,
 * positioned at the base of the cartridge (negative Y direction).
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { createPrimerGeometry } from '@/lib/geometry/mesh-builder';
import { MATERIALS } from '@/lib/geometry/materials';

interface PrimerMeshProps {
  primerDiameter: number; // mm
  primerHeight: number;   // mm
  clipPlane: THREE.Plane | null;
}

export default function PrimerMesh({
  primerDiameter,
  primerHeight,
  clipPlane,
}: PrimerMeshProps) {
  const geometry = useMemo(
    () => createPrimerGeometry(primerDiameter, primerHeight),
    [primerDiameter, primerHeight],
  );

  const nickel = MATERIALS.nickel;
  const hasClip = clipPlane != null;
  const clippingPlanes = hasClip ? [clipPlane] : undefined;

  return (
    <mesh geometry={geometry} position={[0, -primerHeight / 2, 0]}>
      <meshStandardMaterial
        color={nickel.color}
        metalness={nickel.metalness}
        roughness={nickel.roughness}
        clippingPlanes={clippingPlanes}
        clipShadows={hasClip}
        side={hasClip ? THREE.DoubleSide : THREE.FrontSide}
      />
    </mesh>
  );
}
