/**
 * Heuristic blob naming from JSON content — no LLM required.
 */

const TITLE_KEYS = ['name', 'title', 'label', 'displayName', 'display_name', 'id', 'slug'] as const;
const LIST_KEYS = [
  'data',
  'items',
  'results',
  'records',
  'list',
  'rows',
  'entries',
  'users',
  'companies',
  'products',
  'orders',
  'blobs',
] as const;

const MAX_NAME_LENGTH = 48;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Turn "company list" / "companyList" / "company_list" into a short display name. */
export function sanitizeBlobName(raw: string): string {
  const cleaned = raw
    .replace(/[^\w\s.-]/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';

  // Prefer camelCase for multi-word (matches existing "companyList" style in the app).
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length === 1) {
    return truncate(parts[0]!);
  }
  const camel =
    parts[0]!.toLowerCase() +
    parts
      .slice(1)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join('');
  return truncate(camel);
}

function truncate(name: string): string {
  if (name.length <= MAX_NAME_LENGTH) return name;
  return `${name.slice(0, MAX_NAME_LENGTH - 1)}…`;
}

function pluralizeLabel(key: string, count: number): string {
  const base = key.replace(/s$/i, '');
  if (count === 1) return sanitizeBlobName(base) || 'item';

  let plural: string;
  if (/[^aeiou]y$/i.test(base)) {
    plural = `${base.slice(0, -1)}ies`;
  } else if (/s$/i.test(key)) {
    plural = key;
  } else {
    plural = `${base}s`;
  }
  return sanitizeBlobName(plural) || 'items';
}

function nameFromTitleField(obj: Record<string, unknown>): string | null {
  for (const key of TITLE_KEYS) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) {
      return sanitizeBlobName(value);
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return sanitizeBlobName(String(value));
    }
  }
  return null;
}

function nameFromListKey(obj: Record<string, unknown>): string | null {
  for (const key of LIST_KEYS) {
    const value = obj[key];
    if (Array.isArray(value)) {
      const label = pluralizeLabel(key === 'data' || key === 'items' || key === 'results' || key === 'list' || key === 'rows' || key === 'entries' || key === 'records' ? inferArrayItemLabel(value) || key : key, value.length);
      if (value.length === 0) return sanitizeBlobName(`${label}Empty`) || 'emptyList';
      return label;
    }
  }
  return null;
}

function inferArrayItemLabel(arr: unknown[]): string | null {
  const first = arr.find((item) => isPlainObject(item));
  if (!first) return null;
  for (const key of ['type', 'kind', 'category', 'name', 'title'] as const) {
    const value = first[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const keys = Object.keys(first);
  if (keys.some((k) => /comp(any)?(_name|_id|Id|Name)?$/i.test(k) || /^cmp_/i.test(k))) {
    return 'company';
  }
  if (keys.some((k) => /^user(_id|Id|Name)?$/i.test(k))) {
    return 'user';
  }
  if (keys.some((k) => /^product(_id|Id|Name)?$/i.test(k))) {
    return 'product';
  }
  if (keys.some((k) => /^order(_id|Id)?$/i.test(k))) {
    return 'order';
  }
  if (keys.some((k) => /^invoice/i.test(k))) {
    return 'invoice';
  }

  const domain = keys.find((k) =>
    /^(company|user|product|order|item|blob|invoice|customer|vendor)/i.test(k),
  );
  if (domain) {
    return domain.replace(/_(id|cd|code|name)$/i, '').replace(/Id$/i, '');
  }
  return null;
}

/**
 * Suggest a short blob name from parsed JSON.
 * Returns empty string only when nothing useful can be inferred (caller may keep Untitled).
 */
export function suggestBlobName(value: unknown): string {
  if (value === null) return 'nullValue';
  if (typeof value === 'string') return sanitizeBlobName(value.slice(0, 40)) || 'textValue';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return 'emptyList';
    const itemLabel = inferArrayItemLabel(value);
    if (itemLabel) {
      return pluralizeLabel(itemLabel, value.length);
    }
    return sanitizeBlobName(`list${value.length}`) || 'jsonList';
  }

  if (!isPlainObject(value)) return 'jsonValue';

  const keys = Object.keys(value);
  if (keys.length === 0) return 'emptyObject';

  const fromTitle = nameFromTitleField(value);
  if (fromTitle) return fromTitle;

  const fromList = nameFromListKey(value);
  if (fromList) return fromList;

  // Single top-level key → use that key (or its array label).
  if (keys.length === 1) {
    const onlyKey = keys[0]!;
    const onlyVal = value[onlyKey];
    if (Array.isArray(onlyVal)) {
      return pluralizeLabel(inferArrayItemLabel(onlyVal) || onlyKey, onlyVal.length);
    }
    if (typeof onlyVal === 'string' && onlyVal.trim()) {
      return sanitizeBlobName(onlyVal);
    }
    return sanitizeBlobName(onlyKey) || 'jsonObject';
  }

  // Prefer a meaningful key among the first few.
  const preferred = keys.find((k) => TITLE_KEYS.includes(k as (typeof TITLE_KEYS)[number]));
  if (preferred && typeof value[preferred] === 'string') {
    return sanitizeBlobName(String(value[preferred]));
  }

  // Fall back to joining top-level keys (short).
  const joined = keys.slice(0, 3).join('-');
  return sanitizeBlobName(joined) || 'jsonObject';
}

/** Suggest only when the current name is empty / placeholder-like. */
export function shouldAutoSuggestName(currentName: string): boolean {
  const trimmed = currentName.trim().toLowerCase();
  return !trimmed || trimmed === 'untitled' || trimmed === 'untitled blob' || trimmed === 'new blob';
}
