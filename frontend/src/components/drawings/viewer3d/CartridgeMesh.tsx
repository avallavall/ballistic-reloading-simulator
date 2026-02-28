'use client';

/**
 * Brass cartridge case mesh with cutaway inner-wall support.
 *
 * Uses profileToLatheGeometry to create a revolution solid from
 * the same ProfilePoint[] used by 2D SVG drawings.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { ProfilePoint } from '@/lib/geometry/types';
import { profileToLatheGeometry } from '@/lib/geometry/mesh-builder';
import { MATERIALS } from '@/lib/geometry/materials';

interface CartridgeMeshProps {
  profilePoints: ProfilePoint[];
  clipPlane: THREE.Plane | null;
  wallThickness?: number; // mm, default 0.5 for inner wall
}

export default function CartridgeMesh({
  profilePoints,
  clipPlane,
  wallThickness = 0.5,
}: CartridgeMeshProps) {
  // Outer case geometry
  const outerGeometry = useMemo(() => {
    if (profilePoints.length < 2) return null;
    return profileToLatheGeometry(profilePoints, 64);
  }, [profilePoints]);

  // Inner wall geometry (only for cutaway view)
  const innerGeometry = useMemo(() => {
    if (profilePoints.length < 2) return null;
    const innerPoints = profilePoints.map((p) => ({
      x: p.x,
      y: Math.max(p.y - wallThickness, 0.1),
    }));
    return profileToLatheGeometry(innerPoints, 64);
  }, [profilePoints, wallThickness]);

  if (!outerGeometry) return null;

  const brass = MATERIALS.brass;
  const hasClip = clipPlane != null;
  const clippingPlanes = hasClip ? [clipPlane] : undefined;
  const materialSide = hasClip ? THREE.DoubleSide : THREE.FrontSide;

  return (
    <group>
      {/* Outer case body */}
      <mesh geometry={outerGeometry}>
        <meshStandardMaterial
          color={brass.color}
          metalness={brass.metalness}
          roughness={brass.roughness}
          clippingPlanes={clippingPlanes}
          clipShadows={hasClip}
          side={materialSide}
        />
      </mesh>

      {/* Inner wall (only visible in cutaway) */}
      {hasClip && innerGeometry && (
        <mesh geometry={innerGeometry}>
          <meshStandardMaterial
            color="#C4A44A"
            metalness={brass.metalness - 0.05}
            roughness={brass.roughness + 0.1}
            clippingPlanes={clippingPlanes}
            clipShadows
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
