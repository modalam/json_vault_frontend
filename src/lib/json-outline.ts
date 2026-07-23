export type JsonOutline = {
  rootType: string;
  summary: string;
  paths: string[];
  topLevelKeys: string[];
};

const MAX_PATHS = 60;
const MAX_DEPTH = 8;
const MAX_OBJECT_KEYS = 40;

function typeLabel(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `array(${value.length})`;
  return typeof value;
}

function shortValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.length > 48 ? `"${value.slice(0, 47)}…"` : JSON.stringify(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return String(value);
  }
  return typeLabel(value);
}

function walk(value: unknown, path: string, out: string[], depth: number): void {
  if (out.length >= MAX_PATHS || depth > MAX_DEPTH) return;

  if (value === null || typeof value !== 'object') {
    out.push(`${path || '(root)'}: ${typeLabel(value)} · ${shortValue(value)}`);
    return;
  }

  if (Array.isArray(value)) {
    out.push(`${path || '(root)'}: array(${value.length})`);
    if (value.length > 0) {
      walk(value[0], `${path}[0]`, out, depth + 1);
    }
    return;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (path) {
    out.push(`${path}: object(${keys.length})`);
  }

  for (const key of keys.slice(0, MAX_OBJECT_KEYS)) {
    if (out.length >= MAX_PATHS) break;
    const childPath = path ? `${path}.${key}` : key;
    const child = record[key];
    if (child !== null && typeof child === 'object') {
      walk(child, childPath, out, depth + 1);
    } else {
      out.push(`${childPath}: ${typeLabel(child)} · ${shortValue(child)}`);
    }
  }
}

/** Local (non-LLM) structure outline for the Explain JSON panel. */
export function outlineJson(value: unknown): JsonOutline {
  if (value === null || typeof value !== 'object') {
    return {
      rootType: typeLabel(value),
      summary: `Root value is a ${typeLabel(value)}: ${shortValue(value)}.`,
      paths: [`(root): ${typeLabel(value)} · ${shortValue(value)}`],
      topLevelKeys: [],
    };
  }

  if (Array.isArray(value)) {
    const paths: string[] = [];
    walk(value, '', paths, 0);
    const itemHint =
      value.length === 0
        ? 'Empty array.'
        : `Array of ${value.length} item(s); first element is ${typeLabel(value[0])}.`;
    return {
      rootType: `array(${value.length})`,
      summary: itemHint,
      paths,
      topLevelKeys: [],
    };
  }

  const keys = Object.keys(value as Record<string, unknown>);
  const paths: string[] = [];
  walk(value, '', paths, 0);
  const preview = keys.slice(0, 8).join(', ');
  const more = keys.length > 8 ? ` (+${keys.length - 8} more)` : '';

  return {
    rootType: 'object',
    summary:
      keys.length === 0
        ? 'Empty object.'
        : `Object with ${keys.length} top-level key(s): ${preview}${more}.`,
    paths,
    topLevelKeys: keys,
  };
}
