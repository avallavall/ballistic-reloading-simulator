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
  alias_group: string | null;
  data_source: string;
  quality_score: number;
  quality_level: string;      // "success" | "warning" | "danger"
  quality_tooltip: string;    // One-line breakdown from API
  web_thickness_mm: number | null;
}

export interface GrtImportResult {
  created: Powder[];
  updated: Powder[];
  skipped: string[];
  errors: string[];
  mode: string;
  aliases_linked: number;
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
  length_mm: number | null;
  bc_g1: number;
  bc_g7: number | null;
  sectional_density: number;
  material: string;
  model_number: string | null;
  bullet_type: string | null;
  base_type: string | null;
  // Rendering dimension fields
  bearing_surface_mm: number | null;
  boat_tail_length_mm: number | null;
  meplat_diameter_mm: number | null;
  ogive_type: string | null;
  // Velocity-banded BC fields
  bc_g1_high: number | null;
  bc_g1_mid: number | null;
  bc_g1_low: number | null;
  bc_g1_high_vel: number | null;
  bc_g1_mid_vel: number | null;
  data_source?: string;
  quality_score?: number;
  caliber_family?: string | null;
  quality_level?: string;
  quality_tooltip?: string;
}

export interface BulletCreate {
  name: string;
  manufacturer: string;
  weight_grains: number;
  diameter_mm: number;
  length_mm?: number | null;
  bc_g1: number;
  bc_g7?: number | null;
  sectional_density: number;
  material: string;
  // Rendering dimension fields
  bearing_surface_mm?: number | null;
  boat_tail_length_mm?: number | null;
  meplat_diameter_mm?: number | null;
  ogive_type?: string | null;
  // Velocity-banded BC fields
  bc_g1_high?: number | null;
  bc_g1_mid?: number | null;
  bc_g1_low?: number | null;
  bc_g1_high_vel?: number | null;
  bc_g1_mid_vel?: number | null;
}

// ============================================================
// Cartridge (Cartucho / Calibre)
// ============================================================

export interface Cartridge {
  id: string;
  name: string;
  saami_max_pressure_psi: number;
  cip_max_pressure_mpa: number | null;
  case_capacity_grains_h2o: number;
  case_length_mm: number;
  overall_length_mm: number;
  bore_diameter_mm: number;
  groove_diameter_mm: number;
  parent_cartridge_name: string | null;
  shoulder_diameter_mm: number | null;
  neck_diameter_mm: number | null;
  base_diameter_mm: number | null;
  rim_diameter_mm: number | null;
  // Drawing dimension fields
  shoulder_angle_deg: number | null;
  neck_length_mm: number | null;
  body_length_mm: number | null;
  rim_thickness_mm: number | null;
  case_type: string | null;
  data_source?: string;
  quality_score?: number;
  caliber_family?: string | null;
  quality_level?: string;
  quality_tooltip?: string;
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
  // Drawing dimension fields
  shoulder_angle_deg?: number | null;
  neck_length_mm?: number | null;
  body_length_mm?: number | null;
  rim_thickness_mm?: number | null;
  case_type?: string | null;
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
  // Chamber drawing fields
  freebore_mm: number | null;
  throat_angle_deg: number | null;
  headspace_mm: number | null;
  // Rifling fields
  groove_count: number | null;
  twist_direction: string | null;
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
  // Chamber drawing fields (optional)
  freebore_mm?: number | null;
  throat_angle_deg?: number | null;
  headspace_mm?: number | null;
  // Rifling fields (optional)
  groove_count?: number | null;
  twist_direction?: string | null;
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
