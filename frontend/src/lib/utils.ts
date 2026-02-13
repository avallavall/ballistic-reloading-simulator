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
export function formatNum(value: number, decimals: number = 1): string {
  return value.toFixed(decimals);
}

/** Get pressure safety level */
export function getPressureSafetyLevel(
  peakPressurePsi: number,
  saamiMaxPsi: number
): 'safe' | 'warning' | 'danger' {
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
