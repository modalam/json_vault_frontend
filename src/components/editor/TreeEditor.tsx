import { useEffect, useMemo, useRef, useState } from 'react';

type TreeEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

type NodeProps = {
  path: string;
  label: string;
  data: unknown;
  depth: number;
  onUpdate: (path: string, next: unknown) => void;
};

function parseOrNull(value: string): unknown | null {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function setAtPath(root: unknown, path: string, nextValue: unknown): unknown {
  if (!path) return nextValue;
  const parts = path.split('.');
  const clone = structuredClone(root) as Record<string, unknown> | unknown[];
  let cursor: unknown = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    cursor = Array.isArray(cursor)
      ? cursor[Number(key)]
      : (cursor as Record<string, unknown>)[key];
  }
  const last = parts[parts.length - 1]!;
  if (Array.isArray(cursor)) {
    cursor[Number(last)] = nextValue;
  } else if (cursor && typeof cursor === 'object') {
    (cursor as Record<string, unknown>)[last] = nextValue;
  }
  return clone;
}

function filterObject(data: unknown, query: string): unknown {
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map((item) => filterObject(item, query));
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (key.toLowerCase().includes(query)) {
      out[key] = value;
      continue;
    }
    if (value !== null && typeof value === 'object') {
      const nested = filterObject(value, query);
      if (
        (Array.isArray(nested) && nested.length > 0) ||
        (!Array.isArray(nested) &&
          nested &&
          typeof nested === 'object' &&
          Object.keys(nested as object).length > 0)
      ) {
        out[key] = nested;
      }
    } else if (String(value).toLowerCase().includes(query)) {
      out[key] = value;
    }
  }
  return out;
}

function childCount(data: unknown): number {
  if (Array.isArray(data)) return data.length;
  if (data !== null && typeof data === 'object') {
    return Object.keys(data as object).length;
  }
  return 0;
}

function valueColor(data: unknown): string {
  if (data === null) return 'text-slate-500';
  if (typeof data === 'string') return 'text-emerald-400';
  if (typeof data === 'number') return 'text-rose-400';
  if (typeof data === 'boolean') return 'text-amber-300';
  return 'text-slate-300';
}

function formatDisplay(data: unknown): string {
  if (data === null) return 'null';
  if (typeof data === 'string') return data === '' ? '' : data;
  return String(data);
}

/** Inline edit without a bordered rectangle — click value to edit. */
function InlineValue({
  data,
  onCommit,
}: {
  data: string | number | null;
  onCommit: (next: unknown) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(formatDisplay(data));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(formatDisplay(data));
  }, [data]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    setEditing(false);
    const raw = draft;
    if (raw === 'null') {
      onCommit(null);
      return;
    }
    if (typeof data === 'number' || (/^-?\d+(\.\d+)?$/.test(raw) && raw !== '')) {
      const n = Number(raw);
      if (!Number.isNaN(n)) {
        onCommit(n);
        return;
      }
    }
    onCommit(raw);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(formatDisplay(data));
            setEditing(false);
          }
        }}
        className={`w-auto min-w-[4rem] max-w-full bg-transparent p-0 font-mono text-sm outline-none ring-0 ${valueColor(data)}`}
      />
    );
  }

  const empty = data === null || data === '';

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`font-mono text-sm ${valueColor(data)} ${
        empty
          ? 'rounded border border-dotted border-slate-600 px-1.5 py-0.5 text-slate-500'
          : 'hover:underline'
      }`}
    >
      {empty ? 'value' : formatDisplay(data)}
    </button>
  );
}

function TreeNode({ path, label, data, depth, onUpdate }: NodeProps) {
  const [open, setOpen] = useState(depth < 2);
  const pad = { paddingLeft: `${depth * 16}px` };

  if (data !== null && typeof data === 'object') {
    const entries = Array.isArray(data)
      ? data.map((v, i) => [String(i), v] as const)
      : Object.entries(data as Record<string, unknown>);
    const count = childCount(data);
    const brace = Array.isArray(data) ? `[${count}]` : `{${count}}`;

    return (
      <div>
        <div
          className="flex cursor-pointer items-center gap-1.5 py-0.5 hover:bg-slate-800/40"
          style={pad}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="w-3 select-none text-[10px] text-slate-400">{open ? '▾' : '▸'}</span>
          <span className="font-mono text-sm text-slate-100">{label}</span>
          <span className="font-mono text-xs text-slate-500">{brace}</span>
        </div>
        {open &&
          entries.map(([key, child]) => (
            <TreeNode
              key={`${path}.${key}`}
              path={path ? `${path}.${key}` : key}
              label={key}
              data={child}
              depth={depth + 1}
              onUpdate={onUpdate}
            />
          ))}
      </div>
    );
  }

  if (typeof data === 'boolean') {
    return (
      <div className="flex items-center gap-2 py-0.5 hover:bg-slate-800/40" style={pad}>
        <span className="w-3" />
        <span className="font-mono text-sm text-slate-100">{label}</span>
        <span className="text-slate-600">:</span>
        <input
          type="checkbox"
          checked={data}
          className="h-3.5 w-3.5 accent-sky-400"
          onChange={(e) => onUpdate(path, e.target.checked)}
        />
        <span className="font-mono text-sm text-amber-300">{String(data)}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-0.5 hover:bg-slate-800/40" style={pad}>
      <span className="w-3" />
      <span className="font-mono text-sm text-slate-100">{label}</span>
      <span className="text-slate-600">:</span>
      <InlineValue
        data={data as string | number | null}
        onCommit={(next) => onUpdate(path, next)}
      />
    </div>
  );
}

export function TreeEditor({ value, onChange }: TreeEditorProps) {
  const [query, setQuery] = useState('');
  const parsed = useMemo(() => parseOrNull(value), [value]);

  if (parsed === null) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-amber-300">
        Fix JSON syntax in the editor to use Tree view.
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const displayData = q ? filterObject(parsed, q) : parsed;

  return (
    <div className="flex h-full flex-col" data-testid="tree-editor">
      <div className="border-b border-slate-800 px-3 py-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-full border-0 bg-transparent px-0 py-1 text-sm text-slate-200 outline-none placeholder:text-slate-500"
        />
      </div>
      <div className="flex-1 overflow-auto px-2 py-2">
        <TreeNode
          path=""
          label={Array.isArray(displayData) ? 'array' : 'object'}
          data={displayData}
          depth={0}
          onUpdate={(path, next) => {
            const updated = setAtPath(parsed, path, next);
            onChange(JSON.stringify(updated, null, 2));
          }}
        />
      </div>
    </div>
  );
}
