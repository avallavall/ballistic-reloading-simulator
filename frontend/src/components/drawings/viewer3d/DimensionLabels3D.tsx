'use client';

/**
 * 3D dimension labels using drei Html overlays.
 *
 * Renders dark overlay divs positioned in 3D space at key measurement
 * locations (case length, OAL, neck diameter, base diameter).
 * Labels are in Spanish per project convention.
 */

import { Html } from '@react-three/drei';

interface DimensionLabels3DProps {
  visible: boolean;
  caseLength: number | null;    // mm
  oal: number | null;           // mm (overall length with bullet)
  neckDiameter: number | null;  // mm
  baseDiameter: number | null;  // mm
}

const LABEL_CLASSES =
  'bg-slate-900/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap border border-slate-600';

interface LabelEntry {
  name: string;
  value: number;
  unit: string;
  position: [number, number, number];
}

export default function DimensionLabels3D({
  visible,
  caseLength,
  oal,
  neckDiameter,
  baseDiameter,
}: DimensionLabels3DProps) {
  if (!visible) return null;

  const labels: LabelEntry[] = [];

  // Case length label: midpoint of case, offset above
  if (caseLength != null) {
    labels.push({
      name: 'Longitud Vaina',
      value: caseLength,
      unit: 'mm',
      position: [0, caseLength / 2, baseDiameter != null ? baseDiameter / 2 + 5 : 10],
    });
  }

  // OAL label: midpoint of full cartridge, offset below
  if (oal != null) {
    labels.push({
      name: 'Longitud Total',
      value: oal,
      unit: 'mm',
      position: [0, oal / 2, baseDiameter != null ? -(baseDiameter / 2 + 5) : -10],
    });
  }

  // Neck diameter: at the neck area, offset to the side
  if (neckDiameter != null && caseLength != null) {
    labels.push({
      name: 'Diametro Cuello',
      value: neckDiameter,
      unit: 'mm',
      position: [neckDiameter / 2 + 5, caseLength * 0.9, 0],
    });
  }

  // Base diameter: at the base, offset to the side
  if (baseDiameter != null) {
    labels.push({
      name: 'Diametro Base',
      value: baseDiameter,
      unit: 'mm',
      position: [baseDiameter / 2 + 5, 2, 0],
    });
  }

  return (
    <group>
      {labels.map((label) => (
        <Html
          key={label.name}
          position={label.position}
          distanceFactor={80}
          center
        >
          <div className={LABEL_CLASSES}>
            {label.name}: {label.value.toFixed(1)} {label.unit}
          </div>
        </Html>
      ))}
    </group>
  );
}
