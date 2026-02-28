'use client';

/**
 * Bullet mesh with type-aware PBR materials.
 *
 * Material appearance varies by bullet_type:
 * - FMJ: copper jacket (default)
 * - HP: copper jacket with exposed lead core at tip (cutaway)
 * - Solid Copper: uniform copper throughout
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { ProfilePoint } from '@/lib/geometry/types';
import { profileToLatheGeometry } from '@/lib/geometry/mesh-builder';
import { getBulletMaterials } from '@/lib/geometry/materials';

interface BulletMeshProps {
  profilePoints: ProfilePoint[];
  bulletType: string | null;
  clipPlane: THREE.Plane | null;
  positionY: number; // axial offset in mm (bullet sits atop the case)
}

export default function BulletMesh({
  profilePoints,
  bulletType,
  clipPlane,
  positionY,
}: BulletMeshProps) {
  const geometry = useMemo(() => {
    if (profilePoints.length < 2) return null;
    return profileToLatheGeometry(profilePoints, 64);
  }, [profilePoints]);

  const materials = useMemo(() => getBulletMaterials(bulletType), [bulletType]);

  if (!geometry) return null;

  const hasClip = clipPlane != null;
  const clippingPlanes = hasClip ? [clipPlane] : undefined;
  const materialSide = hasClip ? THREE.DoubleSide : THREE.FrontSide;

  // Detect if HP / hollow point for exposed core visualization
  const isHP =
    bulletType != null &&
    (bulletType.toLowerCase().includes('hp') ||
      bulletType.toLowerCase().includes('hollow'));

  // For HP bullets in cutaway, show a small lead core cylinder at the tip
  // The tip is at profilePoints[last].x, body radius is profilePoints[1].y approx
  const tipX = profilePoints[profilePoints.length - 1]?.x ?? 0;
  const bodyR = profilePoints.length > 1 ? profilePoints[1].y : 3;

  return (
    <group position={[0, positionY, 0]}>
      {/* Main bullet jacket */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={materials.jacket.color}
          metalness={materials.jacket.metalness}
          roughness={materials.jacket.roughness}
          clippingPlanes={clippingPlanes}
          clipShadows={hasClip}
          side={materialSide}
        />
      </mesh>

      {/* HP exposed lead core at tip (visible in cutaway) */}
      {isHP && hasClip && (
        <mesh position={[0, tipX * 0.75, 0]}>
          <cylinderGeometry args={[bodyR * 0.35, bodyR * 0.5, tipX * 0.3, 32]} />
          <meshStandardMaterial
            color={materials.core.color}
            metalness={materials.core.metalness}
            roughness={materials.core.roughness}
            clippingPlanes={clippingPlanes}
            clipShadows
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
