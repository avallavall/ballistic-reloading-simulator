// ============================================================
// Powder (Polvora)
// ============================================================

export interface Powder {
  id: string;
  name: string;
  manufacturer: string;
  burn_rate_relative: number;
  force_constant_j_kg: number;
  covolume_m3_kg: number;
  flame_temp_k: number;
  gamma: number;
  density_g_cm3: number;
  burn_rate_coeff: number;
  burn_rate_exp: number;
  grt_params?: Record<string, unknown> | null;
}

export interface GrtImportResult {
  created: Powder[];
  skipped: string[];
  errors: string[];
}

export interface PowderCreate {
  name: string;
  manufacturer: string;
  burn_rate_relative: number;
  force_constant_j_kg: number;
  covolume_m3_kg: number;
  flame_temp_k: number;
  gamma: number;
  density_g_cm3: number;
  burn_rate_coeff: number;
  burn_rate_exp: number;
}

// ============================================================
// Bullet (Proyectil)
// ============================================================

export interface Bullet {
  id: string;
  name: string;
  manufacturer: string;
  weight_grains: number;
  diameter_mm: number;
  length_mm: number;
  bc_g1: number;
  bc_g7: number;
  sectional_density: number;
  material: string;
}

export interface BulletCreate {
  name: string;
  manufacturer: string;
  weight_grains: number;
  diameter_mm: number;
  length_mm: number;
  bc_g1: number;
  bc_g7: number;
  sectional_density: number;
  material: string;
}

// ============================================================
// Cartridge (Cartucho / Calibre)
// ============================================================

export interface Cartridge {
  id: string;
  name: string;
  saami_max_pressure_psi: number;
  cip_max_pressure_mpa: number;
  case_capacity_grains_h2o: number;
  case_length_mm: number;
  overall_length_mm: number;
  bore_diameter_mm: number;
  groove_diameter_mm: number;
}

export interface CartridgeCreate {
  name: string;
  saami_max_pressure_psi: number;
  cip_max_pressure_mpa: number;
  case_capacity_grains_h2o: number;
  case_length_mm: number;
  overall_length_mm: number;
  bore_diameter_mm: number;
  groove_diameter_mm: number;
}

// ============================================================
// Rifle
// ============================================================

export interface Rifle {
  id: string;
  name: string;
  barrel_length_mm: number;
  twist_rate_mm: number;
  cartridge_id: string;
  chamber_volume_mm3: number;
  weight_kg: number;
  barrel_condition: string;
  round_count: number;
  cartridge?: Cartridge;
}

export interface RifleCreate {
  name: string;
  barrel_length_mm: number;
  twist_rate_mm: number;
  cartridge_id: string;
  chamber_volume_mm3: number;
  weight_kg: number;
  barrel_condition: string;
  round_count: number;
}

// ============================================================
// Load (Carga de Recarga)
// ============================================================

export interface Load {
  id: string;
  name: string;
  powder_id: string;
  bullet_id: string;
  rifle_id: string;
  powder_charge_grains: number;
  coal_mm: number;
  seating_depth_mm: number;
  notes: string;
  powder?: Powder;
  bullet?: Bullet;
  rifle?: Rifle;
}

export interface LoadCreate {
  name: string;
  powder_id: string;
  bullet_id: string;
  rifle_id: string;
  powder_charge_grains: number;
  coal_mm: number;
  seating_depth_mm: number;
  notes?: string;
}

// ============================================================
// Simulation
// ============================================================

export interface CurvePoint {
  t_ms: number;
  p_psi: number;
}

export interface DistanceCurvePoint {
  x_mm: number;
  v_fps: number;
}

export interface SimulationResult {
  id?: string;
  load_id?: string;
  peak_pressure_psi: number;
  muzzle_velocity_fps: number;
  pressure_curve: CurvePoint[];
  velocity_curve: DistanceCurvePoint[];
  barrel_time_ms: number;
  is_safe: boolean;
  warnings: string[];
  created_at?: string;
  load?: Load;
  hoop_stress_mpa: number;
  case_expansion_mm: number;
  erosion_per_shot_mm: number;
  barrel_frequency_hz: number;
  optimal_barrel_times: number[] | null;
  obt_match: boolean;
  recoil_energy_ft_lbs: number;
  recoil_impulse_ns: number;
  recoil_velocity_fps: number;
}

export interface SimulationInput {
  load_id?: string;
  powder_id?: string;
  bullet_id?: string;
  rifle_id?: string;
  powder_charge_grains?: number;
  coal_mm?: number;
  seating_depth_mm?: number;
}

export interface LadderTestInput {
  rifle_id: string;
  powder_id: string;
  bullet_id: string;
  coal_mm: number;
  seating_depth_mm: number;
  charge_start_grains: number;
  charge_end_grains: number;
  charge_step_grains: number;
}

// ============================================================
// API Response wrappers
// ============================================================

export interface ApiError {
  detail: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
