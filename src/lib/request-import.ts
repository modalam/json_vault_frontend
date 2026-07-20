import {
  createId,
  createRow,
  type Collection,
  type Environment,
  type HttpMethod,
  type SavedRequest,
} from '@/lib/request-workspace';

export type ImportResult = {
  collections: Collection[];
  environments: Environment[];
  errors: string[];
};

const METHODS = new Set<HttpMethod>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

function normalizeMethod(value: unknown): HttpMethod {
  const method = String(value ?? 'GET').toUpperCase();
  return METHODS.has(method as HttpMethod) ? (method as HttpMethod) : 'GET';
}

function extractPostmanUrl(url: unknown): { url: string; queryParams: SavedRequest['queryParams'] } {
  if (typeof url === 'string') {
    return { url, queryParams: [createRow()] };
  }
  if (!url || typeof url !== 'object') {
    return { url: '', queryParams: [createRow()] };
  }

  const parsed = url as {
    raw?: string;
    query?: Array<{ key?: string; value?: string; disabled?: boolean }>;
  };

  const queryParams =
    parsed.query?.map((item) => ({
      id: createId(),
      enabled: !item.disabled,
      key: item.key ?? '',
      value: item.value ?? '',
    })) ?? [];

  return {
    url: parsed.raw ?? '',
    queryParams: queryParams.length > 0 ? queryParams : [createRow()],
  };
}

function extractPostmanHeaders(
  headers: unknown,
): SavedRequest['headers'] {
  if (!Array.isArray(headers)) return [createRow('Accept', 'application/json')];
  const rows = headers
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const header = item as { key?: string; value?: string; disabled?: boolean };
      return {
        id: createId(),
        enabled: !header.disabled,
        key: header.key ?? '',
        value: header.value ?? '',
      };
    })
    .filter((row) => row.key.trim());
  return rows.length > 0 ? rows : [createRow('Accept', 'application/json')];
}

function extractPostmanBody(body: unknown): Pick<SavedRequest, 'body' | 'bodyMode' | 'rawLanguage'> {
  if (!body || typeof body !== 'object') {
    return { body: '{\n  \n}\n', bodyMode: 'none', rawLanguage: 'JSON' };
  }

  const parsed = body as {
    mode?: string;
    raw?: string;
    urlencoded?: Array<{ key?: string; value?: string }>;
    options?: { raw?: { language?: string } };
  };

  if (parsed.mode === 'raw') {
    const language = parsed.options?.raw?.language?.toLowerCase() === 'json' ? 'JSON' : 'Text';
    return {
      body: parsed.raw ?? '',
      bodyMode: 'raw',
      rawLanguage: language,
    };
  }

  if (parsed.mode === 'urlencoded' && Array.isArray(parsed.urlencoded)) {
    const obj = Object.fromEntries(
      parsed.urlencoded
        .filter((item) => item.key)
        .map((item) => [item.key!, item.value ?? '']),
    );
    return {
      body: JSON.stringify(obj, null, 2),
      bodyMode: 'raw',
      rawLanguage: 'JSON',
    };
  }

  return { body: '{\n  \n}\n', bodyMode: 'none', rawLanguage: 'JSON' };
}

function parsePostmanRequest(item: Record<string, unknown>, prefix: string): SavedRequest | null {
  const request = item.request as Record<string, unknown> | undefined;
  if (!request) return null;

  const name = String(item.name ?? 'Imported Request');
  const fullName = prefix ? `${prefix} / ${name}` : name;
  const { url, queryParams } = extractPostmanUrl(request.url);
  const headers = extractPostmanHeaders(request.header);
  const bodyParts = extractPostmanBody(request.body);

  return {
    id: createId(),
    name: fullName,
    method: normalizeMethod(request.method),
    url,
    headers,
    queryParams,
    ...bodyParts,
  };
}

function walkPostmanItems(
  items: unknown[],
  prefix: string,
  out: SavedRequest[],
): void {
  for (const entry of items) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;

    if (Array.isArray(item.item)) {
      const folderName = String(item.name ?? 'Folder');
      const nextPrefix = prefix ? `${prefix} / ${folderName}` : folderName;
      walkPostmanItems(item.item, nextPrefix, out);
      continue;
    }

    const request = parsePostmanRequest(item, prefix);
    if (request) out.push(request);
  }
}

function isPostmanCollection(data: Record<string, unknown>): boolean {
  if (data.info && typeof data.info === 'object') return true;
  if (Array.isArray(data.item)) return true;
  return false;
}

function isPostmanEnvironment(data: Record<string, unknown>): boolean {
  return Array.isArray(data.values) && typeof data.name === 'string';
}

function isNativeCollection(data: Record<string, unknown>): boolean {
  return data.type === 'json-vault-collection' && Array.isArray(data.requests);
}

function isNativeEnvironment(data: Record<string, unknown>): boolean {
  return data.type === 'json-vault-environment' && Array.isArray(data.variables);
}

function parsePostmanCollection(data: Record<string, unknown>): Collection | null {
  const info = (data.info as Record<string, unknown> | undefined) ?? {};
  const name = String(info.name ?? data.name ?? 'Imported Collection');
  const requests: SavedRequest[] = [];
  walkPostmanItems(Array.isArray(data.item) ? data.item : [], '', requests);

  if (requests.length === 0) return null;

  return { id: createId(), name, requests };
}

function parsePostmanEnvironment(data: Record<string, unknown>): Environment | null {
  const values = data.values as Array<{ key?: string; value?: string; enabled?: boolean }>;
  const variables = values
    .filter((item) => item.key)
    .map((item) => ({
      id: createId(),
      enabled: item.enabled !== false,
      key: item.key ?? '',
      value: item.value ?? '',
    }));

  if (variables.length === 0) return null;

  return {
    id: createId(),
    name: String(data.name ?? 'Imported Environment'),
    variables,
  };
}

function parseNativeCollection(data: Record<string, unknown>): Collection | null {
  const requests = (data.requests as SavedRequest[]).map((request) => ({
    ...request,
    id: createId(),
    headers: request.headers?.map((row) => ({ ...row, id: createId() })) ?? [createRow()],
    queryParams: request.queryParams?.map((row) => ({ ...row, id: createId() })) ?? [createRow()],
  }));
  if (requests.length === 0) return null;
  return {
    id: createId(),
    name: String(data.name ?? 'Imported Collection'),
    requests,
  };
}

function parseNativeEnvironment(data: Record<string, unknown>): Environment | null {
  const variables = (data.variables as Environment['variables']).map((row) => ({
    ...row,
    id: createId(),
  }));
  if (variables.length === 0) return null;
  return {
    id: createId(),
    name: String(data.name ?? 'Imported Environment'),
    variables,
  };
}

export function parseImportFile(name: string, raw: string): ImportResult {
  const result: ImportResult = { collections: [], environments: [], errors: [] };

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    result.errors.push(`${name}: invalid JSON`);
    return result;
  }

  if (isNativeCollection(data)) {
    const collection = parseNativeCollection(data);
    if (collection) result.collections.push(collection);
    else result.errors.push(`${name}: collection has no requests`);
    return result;
  }

  if (isNativeEnvironment(data)) {
    const environment = parseNativeEnvironment(data);
    if (environment) result.environments.push(environment);
    else result.errors.push(`${name}: environment has no variables`);
    return result;
  }

  if (isPostmanEnvironment(data)) {
    const environment = parsePostmanEnvironment(data);
    if (environment) result.environments.push(environment);
    else result.errors.push(`${name}: environment has no variables`);
    return result;
  }

  if (isPostmanCollection(data)) {
    const collection = parsePostmanCollection(data);
    if (collection) result.collections.push(collection);
    else result.errors.push(`${name}: collection has no requests`);
    return result;
  }

  result.errors.push(`${name}: unrecognized format (Postman collection/environment or JSON Vault export)`);
  return result;
}

export async function importFiles(files: File[]): Promise<ImportResult> {
  const merged: ImportResult = { collections: [], environments: [], errors: [] };
  const jsonFiles = files.filter((file) => file.name.toLowerCase().endsWith('.json'));

  if (jsonFiles.length === 0) {
    merged.errors.push('No .json files found.');
    return merged;
  }

  for (const file of jsonFiles) {
    try {
      const text = await file.text();
      const parsed = parseImportFile(file.name, text);
      merged.collections.push(...parsed.collections);
      merged.environments.push(...parsed.environments);
      merged.errors.push(...parsed.errors);
    } catch {
      merged.errors.push(`${file.name}: failed to read file`);
    }
  }

  return merged;
}

function uniqueName(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base;
  let index = 2;
  while (existing.includes(`${base} (${index})`)) index += 1;
  return `${base} (${index})`;
}

export function mergeImportIntoWorkspace(
  workspace: { collections: Collection[]; environments: Environment[] },
  imported: ImportResult,
): { collections: Collection[]; environments: Environment[]; firstRequestId: string | null } {
  const collectionNames = [...workspace.collections.map((c) => c.name)];
  const environmentNames = [...workspace.environments.map((e) => e.name)];

  const newCollections = imported.collections.map((collection) => {
    const name = uniqueName(collection.name, collectionNames);
    collectionNames.push(name);
    return { ...collection, name };
  });

  const newEnvironments = imported.environments.map((environment) => {
    const name = uniqueName(environment.name, environmentNames);
    environmentNames.push(name);
    return { ...environment, name };
  });

  const firstRequestId =
    newCollections[0]?.requests[0]?.id ??
    workspace.collections[0]?.requests[0]?.id ??
    null;

  return {
    collections: [...workspace.collections, ...newCollections],
    environments: [...workspace.environments, ...newEnvironments],
    firstRequestId,
  };
}
