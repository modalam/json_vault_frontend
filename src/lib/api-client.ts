import { API_URL } from './constants';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from './session';
import type { AuthUser } from '@/stores/auth-store';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type SuccessResponse = {
  success: number;
  message: string;
  editToken?: string;
  content?: unknown;
  id?: string;
};

type AuthResponse = {
  data: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
};

type RefreshResponse = {
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user?: AuthUser;
  };
};

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    return new ApiError(
      body.error?.code ?? 'INTERNAL_ERROR',
      res.status,
      body.error?.message ?? 'Request failed',
    );
  } catch {
    return new ApiError('INTERNAL_ERROR', res.status, 'Request failed');
  }
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchWithAuth(url: string, init: RequestInit): Promise<Response> {
  const headers = {
    ...(init.headers as Record<string, string>),
    ...authHeaders(),
  };

  let res = await fetch(url, { ...init, headers });

  if (res.status === 401 && getRefreshToken()) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await fetch(url, {
        ...init,
        headers: { ...(init.headers as Record<string, string>), ...authHeaders() },
      });
    }
  }

  return res;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const result = await refreshSession(refreshToken);
    setAccessToken(result.accessToken);
    setRefreshToken(result.refreshToken);
    return true;
  } catch {
    return false;
  }
}

function extractIdFromLocation(location: string | null): string | null {
  if (!location) return null;
  const parts = location.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

export async function register(
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthResponse['data']> {
  const res = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as AuthResponse;
  return body.data;
}

export async function login(email: string, password: string): Promise<AuthResponse['data']> {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as AuthResponse;
  return body.data;
}

export async function refreshSession(refreshToken: string): Promise<RefreshResponse['data']> {
  const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as RefreshResponse;
  return body.data;
}

export async function logout(refreshToken: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok && res.status !== 204) throw await parseError(res);
}

export async function getMe(): Promise<AuthUser> {
  const res = await fetchWithAuth(`${API_URL}/api/v1/auth/me`, { method: 'GET' });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as { data: AuthUser };
  return body.data;
}

export type VaultSummary = {
  id: string;
  name: string;
  slug: string;
  blobCount: number;
};

export async function listVaults(): Promise<VaultSummary[]> {
  const res = await fetchWithAuth(`${API_URL}/api/v1/vaults`, { method: 'GET' });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as { data: VaultSummary[] };
  return body.data;
}

export type BlobSummary = {
  id: string;
  name: string | null;
  visibility: string;
  sizeBytes: number;
  updatedAt: string;
};

export async function listBlobs(limit = 20): Promise<BlobSummary[]> {
  const res = await fetchWithAuth(`${API_URL}/api/v1/blobs?limit=${limit}`, { method: 'GET' });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as { data: BlobSummary[] };
  return body.data;
}

export type RequestWorkspaceStatePayload = {
  workspaces: Array<{
    id: string;
    name: string;
    collections: unknown[];
    environments: unknown[];
  }>;
  activeWorkspaceId: string;
  activeEnvironmentId: string | null;
  activeRequestId: string | null;
};

export async function getRequestWorkspaceState(): Promise<RequestWorkspaceStatePayload | null> {
  const res = await fetchWithAuth(`${API_URL}/api/v1/request-workspaces`, { method: 'GET' });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as { data: RequestWorkspaceStatePayload | null };
  return body.data;
}

export async function saveRequestWorkspaceState(
  state: RequestWorkspaceStatePayload,
): Promise<{ updatedAt: string }> {
  const res = await fetchWithAuth(`${API_URL}/api/v1/request-workspaces`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as { data: { updatedAt: string } };
  return body.data;
}

export type DiffExplainEntry = {
  path: string;
  kind: 'added' | 'removed' | 'changed';
  left?: unknown;
  right?: unknown;
};

export async function explainDiffWithAi(
  entries: DiffExplainEntry[],
): Promise<{ explanation: string; model: string; source: string }> {
  const res = await fetchWithAuth(`${API_URL}/api/v1/ai/diff/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as {
    data: { explanation: string; model: string; source: string };
  };
  return body.data;
}

export async function explainJsonWithAi(
  json: unknown,
  name?: string,
): Promise<{ explanation: string; model: string; source: string }> {
  const res = await fetchWithAuth(`${API_URL}/api/v1/ai/json/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json, name: name || undefined }),
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as {
    data: { explanation: string; model: string; source: string };
  };
  return body.data;
}

export async function createBlob(content: unknown, name?: string): Promise<{ id: string; editToken: string }> {
  const res = await fetchWithAuth(`${API_URL}/api/v1/createblobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, name: name || null, visibility: 'public' }),
  });

  if (!res.ok) throw await parseError(res);

  const body = (await res.json()) as SuccessResponse;
  const id = body.id ?? extractIdFromLocation(res.headers.get('Location'));
  if (!id) {
    throw new ApiError('INTERNAL_ERROR', 500, 'Create succeeded but blob id was missing.');
  }
  if (!body.editToken) {
    throw new ApiError('INTERNAL_ERROR', 500, 'Create succeeded but editToken was missing.');
  }

  return { id, editToken: body.editToken };
}

export async function getBlob(id: string, editToken?: string | null): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (editToken) headers['X-Edit-Token'] = editToken;

  const res = await fetchWithAuth(`${API_URL}/api/v1/getblobs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ id }),
  });

  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as SuccessResponse;
  return body.content;
}

export async function updateBlob(
  id: string,
  content: unknown,
  editToken: string,
  name?: string,
): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/v1/updateblobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Edit-Token': editToken,
    },
    body: JSON.stringify({ id, content, name: name || null }),
  });

  if (!res.ok) throw await parseError(res);
}

export async function deleteBlob(id: string, editToken: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/v1/deleteblobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Edit-Token': editToken,
    },
    body: JSON.stringify({ id }),
  });

  if (!res.ok) throw await parseError(res);
}

export type ApiKeySummary = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type CreatedApiKey = ApiKeySummary & { key: string };

export async function listApiKeys(): Promise<ApiKeySummary[]> {
  const res = await fetchWithAuth(`${API_URL}/api/v1/api-keys`, { method: 'GET' });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as { data: ApiKeySummary[] };
  return body.data;
}

export async function createApiKey(input: {
  name: string;
  scopes?: string[];
  expiresAt?: string | null;
}): Promise<CreatedApiKey> {
  const res = await fetchWithAuth(`${API_URL}/api/v1/api-keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as { data: CreatedApiKey };
  return body.data;
}

export async function revokeApiKey(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/v1/api-keys/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await parseError(res);
}

export type UsageReport = {
  plan: string;
  blobs: { used: number; limit: number };
  storage: { usedBytes: number; limitBytes: number };
  rateLimit: { requestsPerMinute: number };
};

export async function getUsage(): Promise<UsageReport> {
  const res = await fetchWithAuth(`${API_URL}/api/v1/usage`, { method: 'GET' });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as { data: UsageReport };
  return body.data;
}

export async function fetchOpenApiSpec(): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_URL}/api/v1/openapi.json`);
  if (!res.ok) {
    throw new ApiError('INTERNAL_ERROR', res.status, 'Failed to load OpenAPI spec.');
  }
  return (await res.json()) as Record<string, unknown>;
}
