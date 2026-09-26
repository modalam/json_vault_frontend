import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [usage, setUsage] = useState<api.UsageReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await api.getUsage();
        if (!cancelled) setUsage(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load usage');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold text-white">Settings</h1>
      <p className="mt-1 text-sm text-slate-400">
        Account plan and usage for {user?.email}
      </p>

      <nav className="mt-6 flex flex-wrap gap-2 text-sm">
        <span className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-white">
          Usage
        </span>
        <Link
          to="/settings/api-keys"
          className="rounded border border-slate-700 px-3 py-1.5 text-slate-300 hover:border-slate-500 hover:text-white"
        >
          API keys
        </Link>
      </nav>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-medium text-white">Plan & quotas</h2>
        {loading && <p className="text-slate-400">Loading usage…</p>}
        {error && <p className="text-red-400">{error}</p>}
        {usage && (
          <div className="grid gap-4 sm:grid-cols-2">
            <UsageCard
              title="Plan"
              value={usage.plan}
              detail={`${usage.rateLimit.requestsPerMinute} requests / minute`}
            />
            <UsageCard
              title="Blobs"
              value={`${usage.blobs.used} / ${usage.blobs.limit}`}
              detail={percentBar(usage.blobs.used, usage.blobs.limit)}
            />
            <UsageCard
              title="Storage"
              value={`${formatBytes(usage.storage.usedBytes)} / ${formatBytes(usage.storage.limitBytes)}`}
              detail={percentBar(usage.storage.usedBytes, usage.storage.limitBytes)}
            />
          </div>
        )}
        <p className="text-xs text-slate-500">
          Free plan: 50 blobs, 10 MB storage, 100 req/min. Pro limits unlock in a later billing
          phase.
        </p>
      </section>
    </div>
  );
}

function UsageCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-surface px-4 py-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-xl font-semibold capitalize text-white">{value}</div>
      <div className="mt-2 text-xs text-slate-400">{detail}</div>
    </div>
  );
}

function percentBar(used: number, limit: number) {
  const pct = limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  return (
    <div>
      <div className="mb-1">{pct}% used</div>
      <div className="h-1.5 overflow-hidden rounded bg-slate-800">
        <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
