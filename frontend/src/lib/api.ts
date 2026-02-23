import type {
  Powder,
  PowderCreate,
  GrtImportResult,
  Bullet,
  BulletCreate,
  Cartridge,
  CartridgeCreate,
  Rifle,
  RifleCreate,
  Load,
  LoadCreate,
  SimulationResult,
  SimulationInput,
  LadderTestInput,
  ParametricSearchInput,
  ParametricSearchResponse,
  SensitivityInput,
  SensitivityResponse,
  ValidationResponse,
  PaginatedResponse,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_PREFIX = `${API_BASE}/api/v1`;

class ApiClientError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiClientError';
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_PREFIX}${endpoint}`;
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errorBody = await response.json();
      detail = errorBody.detail || detail;
    } catch {
      // ignore parse errors
    }
    throw new ApiClientError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ============================================================
// Powders
// ============================================================

export async function getPowders(): Promise<PaginatedResponse<Powder>> {
  return request<PaginatedResponse<Powder>>('/powders');
}

export async function getPowder(id: string): Promise<Powder> {
  return request<Powder>(`/powders/${id}`);
}

export async function createPowder(data: PowderCreate): Promise<Powder> {
  return request<Powder>('/powders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePowder(
  id: string,
  data: Partial<PowderCreate>
): Promise<Powder> {
  return request<Powder>(`/powders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePowder(id: string): Promise<void> {
  return request<void>(`/powders/${id}`, { method: 'DELETE' });
}

export async function importGrtPowders(file: File, overwrite: boolean = false): Promise<GrtImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const url = `${API_PREFIX}/powders/import-grt${overwrite ? '?mode=overwrite' : ''}`;
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errorBody = await response.json();
      detail = errorBody.detail || detail;
    } catch {
      // ignore parse errors
    }
    throw new ApiClientError(response.status, detail);
  }

  return response.json();
}

// ============================================================
// Bullets
// ============================================================

export async function getBullets(): Promise<PaginatedResponse<Bullet>> {
  return request<PaginatedResponse<Bullet>>('/bullets');
}

export async function getBullet(id: string): Promise<Bullet> {
  return request<Bullet>(`/bullets/${id}`);
}

export async function createBullet(data: BulletCreate): Promise<Bullet> {
  return request<Bullet>('/bullets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBullet(
  id: string,
  data: Partial<BulletCreate>
): Promise<Bullet> {
  return request<Bullet>(`/bullets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteBullet(id: string): Promise<void> {
  return request<void>(`/bullets/${id}`, { method: 'DELETE' });
}

// ============================================================
// Cartridges
// ============================================================

export async function getCartridges(): Promise<PaginatedResponse<Cartridge>> {
  return request<PaginatedResponse<Cartridge>>('/cartridges');
}

export async function getCartridge(id: string): Promise<Cartridge> {
  return request<Cartridge>(`/cartridges/${id}`);
}

export async function createCartridge(
  data: CartridgeCreate
): Promise<Cartridge> {
  return request<Cartridge>('/cartridges', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCartridge(
  id: string,
  data: Partial<CartridgeCreate>
): Promise<Cartridge> {
  return request<Cartridge>(`/cartridges/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCartridge(id: string): Promise<void> {
  return request<void>(`/cartridges/${id}`, { method: 'DELETE' });
}

// ============================================================
// Rifles
// ============================================================

export async function getRifles(): Promise<Rifle[]> {
  return request<Rifle[]>('/rifles');
}

export async function getRifle(id: string): Promise<Rifle> {
  return request<Rifle>(`/rifles/${id}`);
}

export async function createRifle(data: RifleCreate): Promise<Rifle> {
  return request<Rifle>('/rifles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRifle(
  id: string,
  data: Partial<RifleCreate>
): Promise<Rifle> {
  return request<Rifle>(`/rifles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteRifle(id: string): Promise<void> {
  return request<void>(`/rifles/${id}`, { method: 'DELETE' });
}

// ============================================================
// Loads
// ============================================================

export async function getLoads(): Promise<Load[]> {
  return request<Load[]>('/loads');
}

export async function getLoad(id: string): Promise<Load> {
  return request<Load>(`/loads/${id}`);
}

export async function createLoad(data: LoadCreate): Promise<Load> {
  return request<Load>('/loads', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateLoad(
  id: string,
  data: Partial<LoadCreate>
): Promise<Load> {
  return request<Load>(`/loads/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteLoad(id: string): Promise<void> {
  return request<void>(`/loads/${id}`, { method: 'DELETE' });
}

// ============================================================
// Simulation
// ============================================================

export async function runSimulation(
  input: SimulationInput
): Promise<SimulationResult> {
  return request<SimulationResult>('/simulate/direct', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function runLadderTest(
  input: LadderTestInput
): Promise<SimulationResult[]> {
  const resp = await request<{ results: SimulationResult[]; charge_weights: number[] }>('/simulate/ladder', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return resp.results;
}

// ============================================================
// Sensitivity
// ============================================================

export async function runSensitivity(
  input: SensitivityInput
): Promise<SensitivityResponse> {
  return request<SensitivityResponse>('/simulate/sensitivity', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ============================================================
// Parametric Search
// ============================================================

export async function runParametricSearch(
  input: ParametricSearchInput
): Promise<ParametricSearchResponse> {
  return request<ParametricSearchResponse>('/simulate/parametric', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ============================================================
// Validation
// ============================================================

export async function runValidation(): Promise<ValidationResponse> {
  return request<ValidationResponse>('/simulate/validate', {
    method: 'POST',
  });
}

// ============================================================
// Utilities
// ============================================================

export async function healthCheck(): Promise<{ status: string }> {
  return request<{ status: string }>('/health');
}
