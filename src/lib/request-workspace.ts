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

const STORAGE_KEY = 'jv_request_workspaces';

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

function defaultRequest(name = 'New Request'): SavedRequest {
  return {
    id: createId(),
    name,
    method: 'GET',
    url: '',
    headers: [createRow('Accept', 'application/json')],
    queryParams: [createRow()],
    body: '{\n  \n}\n',
    bodyMode: 'none',
    rawLanguage: 'JSON',
  };
}

function defaultWorkspace(): Workspace {
  const collectionId = createId();
  const request = defaultRequest('Sample GET');
  request.url = 'https://httpbin.org/get';

  return {
    id: createId(),
    name: 'My Workspace',
    collections: [
      {
        id: collectionId,
        name: 'My Collection',
        requests: [request],
      },
    ],
    environments: [
      {
        id: createId(),
        name: 'Development',
        variables: [
          createRow('baseUrl', 'https://httpbin.org'),
          createRow('apiKey', 'dev-key'),
        ],
      },
      {
        id: createId(),
        name: 'Production',
        variables: [createRow('baseUrl', 'https://api.example.com')],
      },
    ],
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
    activeEnvironmentId: workspace.environments[0]?.id ?? null,
    activeRequestId: workspace.collections[0]?.requests[0]?.id ?? null,
  };
}

export function loadWorkspaceState(): WorkspaceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as WorkspaceState;
    if (!parsed.workspaces?.length || !parsed.activeWorkspaceId) return createDefaultState();
    return parsed;
  } catch {
    return createDefaultState();
  }
}

export function saveWorkspaceState(state: WorkspaceState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
