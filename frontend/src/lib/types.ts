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
  // 3-curve GRT parameters
  ba?: number | null;
  bp?: number | null;
  br?: number | null;
  brp?: number | null;
  z1?: number | null;
  z2?: number | null;
  a0?: number | null;
  has_3curve: boolean;
  data_source: string;
  quality_score: number;
  quality_level: string;      // "success" | "warning" | "danger"
  quality_tooltip: string;    // One-line breakdown from API
  web_thickness_mm: number | null;
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
  // 3-curve GRT parameters (optional)
  ba?: number | null;
  bp?: number | null;
  br?: number | null;
  brp?: number | null;
  z1?: number | null;
  z2?: number | null;
  a0?: number | null;
  data_source?: string;       // defaults to "manual" on server
  web_thickness_mm?: number | null;
}

export interface PowderUpdate {
  name?: string;
  manufacturer?: string;
  burn_rate_relative?: number;
  force_constant_j_kg?: number;
  covolume_m3_kg?: number;
  flame_temp_k?: number;
  gamma?: number;
  density_g_cm3?: number;
  burn_rate_coeff?: number;
  burn_rate_exp?: number;
  ba?: number | null;
  bp?: number | null;
  br?: number | null;
  brp?: number | null;
  z1?: number | null;
  z2?: number | null;
  a0?: number | null;
  data_source?: string;
  web_thickness_mm?: number | null;
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

export interface BurnCurvePoint {
  t_ms: number;
  z: number;
  dz_dt: number;
  psi: number;
}

export interface EnergyCurvePoint {
  t_ms: number;
  x_mm: number;
  ke_j: number;
  ke_ft_lbs: number;
  momentum_ns: number;
}

export interface TemperatureCurvePoint {
  t_ms: number;
  t_gas_k: number;
  q_loss_j: number;
}

export interface RecoilCurvePoint {
  t_ms: number;
  impulse_ns: number;
}

export interface SimulationResult {
  id?: string;
  load_id?: string;
  peak_pressure_psi: number;
  muzzle_velocity_fps: number;
  pressure_curve: CurvePoint[];
  velocity_curve: DistanceCurvePoint[];
  burn_curve: BurnCurvePoint[];
  energy_curve: EnergyCurvePoint[];
  temperature_curve: TemperatureCurvePoint[];
  recoil_curve: RecoilCurvePoint[];
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
  barrel_length_mm_override?: number;
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

// ============================================================
// Parametric Search
// ============================================================

export interface PowderChargeResult {
  charge_grains: number;
  peak_pressure_psi: number;
  muzzle_velocity_fps: number;
  is_safe: boolean;
}

export interface PowderSearchResult {
  powder_id: string;
  powder_name: string;
  manufacturer: string;
  optimal_charge_grains: number;
  peak_pressure_psi: number;
  muzzle_velocity_fps: number;
  pressure_percent: number;
  recoil_energy_ft_lbs: number;
  recoil_impulse_ns: number;
  efficiency: number;
  barrel_time_ms: number;
  is_viable: boolean;
  all_results: PowderChargeResult[];
}

export interface ParametricSearchInput {
  rifle_id: string;
  bullet_id: string;
  cartridge_id: string;
  coal_mm: number;
  seating_depth_mm?: number;
  charge_percent_min?: number;
  charge_percent_max?: number;
  charge_steps?: number;
}

export interface ParametricSearchResponse {
  results: PowderSearchResult[];
  rifle_name: string;
  bullet_name: string;
  cartridge_name: string;
  saami_max_psi: number;
  total_powders_tested: number;
  viable_powders: number;
  total_time_ms: number;
}

// ============================================================
// Validation
// ============================================================

// ============================================================
// Sensitivity
// ============================================================

export interface SensitivityInput {
  powder_id: string;
  bullet_id: string;
  rifle_id: string;
  powder_charge_grains: number;
  coal_mm: number;
  seating_depth_mm: number;
  charge_delta_grains?: number;
  barrel_length_mm_override?: number;
}

export interface SensitivityResponse {
  center: SimulationResult;
  upper: SimulationResult;
  lower: SimulationResult;
  charge_center_grains: number;
  charge_upper_grains: number;
  charge_lower_grains: number;
}

// ============================================================
// Error Bands
// ============================================================

export interface ErrorBandPoint {
  // For pressure chart
  t_ms?: number;
  // For velocity chart
  x_mm?: number;
  // Band values
  center: number;
  upper: number;
  lower: number;
  band: number; // upper - lower (for stacked Area trick)
}

export function buildErrorBandData(
  center: Record<string, number>[],
  upper: Record<string, number>[],
  lower: Record<string, number>[],
  xKey: string,
  valueKey: string
): ErrorBandPoint[] {
  return center.map((c, i) => ({
    [xKey]: c[xKey],
    center: c[valueKey],
    upper: upper[i]?.[valueKey] ?? c[valueKey],
    lower: lower[i]?.[valueKey] ?? c[valueKey],
    band: (upper[i]?.[valueKey] ?? c[valueKey]) - (lower[i]?.[valueKey] ?? c[valueKey]),
  }));
}

// ============================================================
// Validation
// ============================================================

export interface ValidationLoadResult {
  load_id: string;
  caliber: string;
  bullet_desc: string;
  powder_name: string;
  charge_gr: number;
  barrel_length_mm: number;
  published_velocity_fps: number;
  predicted_velocity_fps: number;
  error_pct: number;
  is_pass: boolean;
  source: string;
}

export interface ValidationResponse {
  results: ValidationLoadResult[];
  total_loads: number;
  passing_loads: number;
  pass_rate_pct: number;
  mean_error_pct: number;
  max_error_pct: number;
  worst_load_id: string;
}
