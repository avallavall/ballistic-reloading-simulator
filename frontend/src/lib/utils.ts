import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert PSI to MPa */
export function psiToMpa(psi: number): number {
  return psi * 0.00689476;
}

/** Convert MPa to PSI */
export function mpaToPsi(mpa: number): number {
  return mpa / 0.00689476;
}

/** Convert FPS to m/s */
export function fpsToMs(fps: number): number {
  return fps * 0.3048;
}

/** Convert m/s to FPS */
export function msToFps(ms: number): number {
  return ms / 0.3048;
}

/** Convert grains to grams */
export function grainsToGrams(grains: number): number {
  return grains * 0.0647989;
}

/** Format number with fixed decimals */
export function formatNum(value: number | null | undefined, decimals: number = 1): string {
  if (value == null || isNaN(value)) return '—';
  return value.toFixed(decimals);
}

/** Display value or em dash for null/undefined/empty */
export function displayValue(value: string | number | null | undefined): string {
  if (value == null || value === '') return '\u2014';
  return String(value);
}

/** Get pressure safety level — checks both pressure ratio AND critical warnings */
export function getPressureSafetyLevel(
  peakPressurePsi: number,
  saamiMaxPsi: number,
  warnings?: string[],
  isSafe?: boolean,
): 'safe' | 'warning' | 'danger' {
  // Backend explicitly marks load as unsafe (charge density, integration failure, etc.)
  if (isSafe === false) return 'danger';

  // Check for critical warnings that indicate unreliable simulation results
  if (warnings?.some(w =>
    w.includes('DANGER:') ||
    w.includes('Charge density too high') ||
    w.includes('physically impossible') ||
    w.includes('fisicamente imposible') ||
    w.includes('volumen de gas se aproxima a cero')
  )) {
    return 'danger';
  }

  const ratio = peakPressurePsi / saamiMaxPsi;
  if (ratio <= 0.9) return 'safe';
  if (ratio <= 1.0) return 'warning';
  return 'danger';
}

/** Get color class for safety level */
export function getSafetyColor(level: 'safe' | 'warning' | 'danger'): string {
  switch (level) {
    case 'safe':
      return 'text-green-500';
    case 'warning':
      return 'text-yellow-500';
    case 'danger':
      return 'text-red-500';
  }
}

/** Get background color class for safety level */
export function getSafetyBgColor(level: 'safe' | 'warning' | 'danger'): string {
  switch (level) {
    case 'safe':
      return 'bg-green-500/10 border-green-500/30';
    case 'warning':
      return 'bg-yellow-500/10 border-yellow-500/30';
    case 'danger':
      return 'bg-red-500/10 border-red-500/30';
  }
}

/** Source labels for human-readable display (Spanish UI) */
export const SOURCE_LABELS: Record<string, string> = {
  manufacturer: 'Fabricante',
  grt_community: 'GRT Community',
  grt_modified: 'GRT Modificado',
  manual: 'Manual',
  estimated: 'Estimado',
};

/** Get human-readable source label */
export function getSourceLabel(source: string): string {
  return SOURCE_LABELS[source] || source;
}

/** Convert ft-lbs to Joules */
export function ftLbsToJoules(ftLbs: number): number {
  return ftLbs / 0.737562;
}

/** Get recoil classification level */
export function getRecoilLevel(
  energyFtLbs: number
): 'light' | 'moderate' | 'heavy' | 'very_heavy' {
  if (energyFtLbs < 10) return 'light';
  if (energyFtLbs < 15) return 'moderate';
  if (energyFtLbs < 25) return 'heavy';
  return 'very_heavy';
}
