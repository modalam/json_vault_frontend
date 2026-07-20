export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type BodyMode = 'none' | 'raw';
export type RawLanguage = 'JSON' | 'Text';

export type KeyValueRow = {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
};

export type SavedRequest = {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValueRow[];
  queryParams: KeyValueRow[];
  body: string;
  bodyMode: BodyMode;
  rawLanguage: RawLanguage;
};

export type Collection = {
  id: string;
  name: string;
  requests: SavedRequest[];
};

export type Environment = {
  id: string;
  name: string;
  variables: KeyValueRow[];
};

export type Workspace = {
  id: string;
  name: string;
  collections: Collection[];
  environments: Environment[];
};

export type WorkspaceState = {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  activeEnvironmentId: string | null;
  activeRequestId: string | null;
};

/** Legacy shared key — kept only for signed-out / guest use. Never upload to another account. */
const LEGACY_STORAGE_KEY = 'jv_request_workspaces';
const GUEST_STORAGE_KEY = 'jv_request_workspaces:guest';

function storageKeyForUser(userId: string | null | undefined): string {
  if (!userId) return GUEST_STORAGE_KEY;
  return `jv_request_workspaces:user:${userId}`;
}

export function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createRow(key = '', value = ''): KeyValueRow {
  return {
    id: createId(),
    enabled: true,
    key,
    value,
  };
}

function defaultWorkspace(): Workspace {
  return {
    id: createId(),
    name: 'My Workspace',
    collections: [],
    environments: [],
  };
}

export function createEmptyWorkspace(name: string): Workspace {
  const workspace = defaultWorkspace();
  workspace.id = createId();
  workspace.name = name;
  return workspace;
}

export function createDefaultState(): WorkspaceState {
  const workspace = defaultWorkspace();
  return {
    workspaces: [workspace],
    activeWorkspaceId: workspace.id,
    activeEnvironmentId: null,
    activeRequestId: null,
  };
}

function readStorageKey(key: string): WorkspaceState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkspaceState;
    return isValidWorkspaceState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Load workspace state scoped to the current user (or guest when signed out).
 * Account A never reads Account B's browser cache.
 */
export function loadWorkspaceState(userId?: string | null): WorkspaceState {
  const key = storageKeyForUser(userId);
  const scoped = readStorageKey(key);
  if (scoped) return scoped;

  // One-time: migrate legacy shared key into guest storage only.
  if (!userId) {
    const legacy = readStorageKey(LEGACY_STORAGE_KEY);
    if (legacy) {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(legacy));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return legacy;
    }
  }

  return createDefaultState();
}

export function saveWorkspaceState(state: WorkspaceState, userId?: string | null): void {
  localStorage.setItem(storageKeyForUser(userId), JSON.stringify(state));
}

export function isValidWorkspaceState(value: unknown): value is WorkspaceState {
  if (!value || typeof value !== 'object') return false;
  const state = value as WorkspaceState;
  return (
    Array.isArray(state.workspaces) &&
    state.workspaces.length > 0 &&
    typeof state.activeWorkspaceId === 'string' &&
    state.workspaces.some((workspace) => workspace.id === state.activeWorkspaceId)
  );
}

/** True if the user has created any collection or environment data worth migrating. */
export function hasUserWorkspaceData(state: WorkspaceState): boolean {
  return state.workspaces.some(
    (workspace) => workspace.collections.length > 0 || workspace.environments.length > 0,
  );
}

export function getActiveWorkspace(state: WorkspaceState): Workspace {
  return state.workspaces.find((w) => w.id === state.activeWorkspaceId) ?? state.workspaces[0]!;
}

export function getActiveEnvironment(
  state: WorkspaceState,
): Environment | null {
  const workspace = getActiveWorkspace(state);
  if (!state.activeEnvironmentId) return null;
  return workspace.environments.find((env) => env.id === state.activeEnvironmentId) ?? null;
}

export function findRequest(
  workspace: Workspace,
  requestId: string,
): { collection: Collection; request: SavedRequest } | null {
  for (const collection of workspace.collections) {
    const request = collection.requests.find((item) => item.id === requestId);
    if (request) return { collection, request };
  }
  return null;
}
