export type DiffKind = 'added' | 'removed' | 'changed';

export type DiffEntry = {
  path: string;
  kind: DiffKind;
  left?: unknown;
  right?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pathJoin(base: string, key: string | number): string {
  if (base === '') return String(key);
  return typeof key === 'number' ? `${base}[${key}]` : `${base}.${key}`;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => valuesEqual(item, b[index]));
  }
  if (isObject(a) && isObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => key in b && valuesEqual(a[key], b[key]));
  }
  return false;
}

function walk(left: unknown, right: unknown, path: string, out: DiffEntry[]): void {
  if (valuesEqual(left, right)) return;

  if (Array.isArray(left) && Array.isArray(right)) {
    const max = Math.max(left.length, right.length);
    for (let i = 0; i < max; i += 1) {
      const childPath = pathJoin(path, i);
      if (i >= left.length) {
        out.push({ path: childPath, kind: 'added', right: right[i] });
      } else if (i >= right.length) {
        out.push({ path: childPath, kind: 'removed', left: left[i] });
      } else {
        walk(left[i], right[i], childPath, out);
      }
    }
    return;
  }

  if (isObject(left) && isObject(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of [...keys].sort((a, b) => a.localeCompare(b))) {
      const childPath = pathJoin(path, key);
      const hasLeft = key in left;
      const hasRight = key in right;
      if (hasLeft && !hasRight) {
        out.push({ path: childPath, kind: 'removed', left: left[key] });
      } else if (!hasLeft && hasRight) {
        out.push({ path: childPath, kind: 'added', right: right[key] });
      } else {
        walk(left[key], right[key], childPath, out);
      }
    }
    return;
  }

  out.push({ path: path || '(root)', kind: 'changed', left, right });
}

/** Semantic deep-diff of two parsed JSON values (object key order ignored). */
export function diffJson(left: unknown, right: unknown): DiffEntry[] {
  const out: DiffEntry[] = [];
  walk(left, right, '', out);
  return out;
}

export function summarizeDiff(entries: DiffEntry[]): {
  added: number;
  removed: number;
  changed: number;
} {
  return entries.reduce(
    (acc, entry) => {
      acc[entry.kind] += 1;
      return acc;
    },
    { added: 0, removed: 0, changed: 0 },
  );
}

/** Paths that differ on the left (removed or changed) or right (added or changed). */
export function collectDiffPaths(entries: DiffEntry[]): {
  left: Set<string>;
  right: Set<string>;
} {
  const left = new Set<string>();
  const right = new Set<string>();
  for (const entry of entries) {
    if (entry.kind === 'removed' || entry.kind === 'changed') left.add(entry.path);
    if (entry.kind === 'added' || entry.kind === 'changed') right.add(entry.path);
  }
  return { left, right };
}

export function formatJsonValue(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
