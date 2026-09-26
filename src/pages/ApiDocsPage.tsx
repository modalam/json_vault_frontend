import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/constants';
import { fetchOpenApiSpec } from '@/lib/api-client';

type PathItem = {
  path: string;
  method: string;
  summary?: string;
  tags?: string[];
};

export function ApiDocsPage() {
  const [paths, setPaths] = useState<PathItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const spec = await fetchOpenApiSpec();
        const rawPaths = (spec.paths ?? {}) as Record<
          string,
          Record<string, { summary?: string; tags?: string[] }>
        >;
        const items: PathItem[] = [];
        for (const [path, methods] of Object.entries(rawPaths)) {
          for (const [method, op] of Object.entries(methods)) {
            items.push({
              path,
              method: method.toUpperCase(),
              summary: op.summary,
              tags: op.tags,
            });
          }
        }
        items.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
        if (!cancelled) setPaths(items);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load API docs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold text-white">API documentation</h1>
      <p className="mt-1 text-sm text-slate-400">
        Interactive overview generated from the live OpenAPI 3.1 spec.
      </p>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <a
          href={`${API_URL}/api/v1/openapi.json`}
          target="_blank"
          rel="noreferrer"
          className="text-brand hover:underline"
        >
          Open openapi.json
        </a>
        <span className="text-slate-600">·</span>
        <code className="rounded bg-slate-900 px-2 py-0.5 font-mono text-xs text-slate-300">
          Authorization: Bearer jv_… or JWT
        </code>
      </div>

      {loading && <p className="mt-8 text-slate-400">Loading endpoints…</p>}
      {error && <p className="mt-8 text-red-400">{error}</p>}

      {!loading && !error && (
        <ul className="mt-8 space-y-2">
          {paths.map((item) => (
            <li
              key={`${item.method}:${item.path}`}
              className="rounded border border-slate-700 bg-surface px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-semibold text-sky-300">
                  {item.method}
                </span>
                <code className="font-mono text-sm text-white">{item.path}</code>
              </div>
              {item.summary && <p className="mt-1 text-sm text-slate-400">{item.summary}</p>}
              {item.tags && item.tags.length > 0 && (
                <p className="mt-1 text-[11px] text-slate-500">{item.tags.join(' · ')}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
