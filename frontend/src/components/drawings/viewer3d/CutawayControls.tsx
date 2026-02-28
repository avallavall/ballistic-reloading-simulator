'use client';

/**
 * Cutaway plane management for 3D cartridge cross-section view.
 *
 * Provides:
 * - useCutawayPlane(active) hook: animated THREE.Plane for clipping
 * - CutawayPlane component: solid cap at the clip boundary
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Hook that manages an animated clipping plane.
 *
 * When active, the plane constant smoothly animates from -999 to 0
 * (clips along the Z axis). When inactive, constant goes to -999
 * effectively disabling clipping.
 *
 * @param active  Whether cutaway is enabled
 * @returns The THREE.Plane instance to pass to material clippingPlanes
 */
export function useCutawayPlane(active: boolean): THREE.Plane {
  const planeRef = useRef<THREE.Plane>(
    new THREE.Plane(new THREE.Vector3(0, 0, -1), -999),
  );

  useFrame((_state, delta) => {
    const plane = planeRef.current;
    const target = active ? 0 : -999;
    const lerpFactor = Math.min(delta * 8, 1);
    plane.constant = THREE.MathUtils.lerp(plane.constant, target, lerpFactor);
  });

  return planeRef.current;
}

/**
 * Visual cap rendered at the clip boundary to seal the cross-section.
 * Shows a solid colored circle where the clipping plane intersects geometry.
 */
interface CutawayPlaneProps {
  active: boolean;
  planeRadius: number;
  color: string;
}

export function CutawayPlane({ active, planeRadius, color }: CutawayPlaneProps) {
  if (!active) return null;

  return (
    <mesh position={[0, 0, 0]} rotation={[0, Math.PI, 0]}>
      <circleGeometry args={[planeRadius, 64]} />
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  );
}

export default CutawayPlane;
