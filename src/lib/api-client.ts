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
