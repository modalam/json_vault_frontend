import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useEditorStore } from '@/stores/editor-store';
import * as api from '@/lib/api-client';

type Vault = {
  id: string;
  name: string;
  slug: string;
  blobCount: number;
};

type BlobItem = {
  id: string;
  name: string | null;
  visibility: string;
  sizeBytes: number;
  updatedAt: string;
};

export function DashboardPage() {
  const navigate = useNavigate();
  const resetEditor = useEditorStore((s) => s.reset);
  const user = useAuthStore((s) => s.user);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [blobs, setBlobs] = useState<BlobItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function handleNewBlob() {
    resetEditor();
    navigate('/');
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [vaultData, blobData] = await Promise.all([api.listVaults(), api.listBlobs()]);
        if (!cancelled) {
          setVaults(vaultData);
          setBlobs(blobData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Welcome back{user?.displayName ? `, ${user.displayName}` : ''}. Choose a tool from the
          left sidebar, or open a blob below.
        </p>
      </div>

      <section className="mb-10 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={handleNewBlob}
          className="rounded-lg border border-slate-700 bg-surface px-4 py-4 text-left transition hover:border-brand/60 hover:bg-slate-900/80"
        >
          <div className="text-sm font-semibold text-white">JSON Editor</div>
          <p className="mt-1 text-xs text-slate-400">Create or edit JSON blobs</p>
        </button>
        <button
          type="button"
          onClick={() => navigate('/compare')}
          className="rounded-lg border border-slate-700 bg-surface px-4 py-4 text-left transition hover:border-brand/60 hover:bg-slate-900/80"
        >
          <div className="text-sm font-semibold text-white">JSON Compare</div>
          <p className="mt-1 text-xs text-slate-400">Diff two JSON documents</p>
        </button>
        <button
          type="button"
          onClick={() => navigate('/request')}
          className="rounded-lg border border-slate-700 bg-surface px-4 py-4 text-left transition hover:border-brand/60 hover:bg-slate-900/80"
        >
          <div className="text-sm font-semibold text-white">Request</div>
          <p className="mt-1 text-xs text-slate-400">Send HTTP requests like Postman</p>
        </button>
      </section>

      {loading && <p className="text-slate-400">Loading your data…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 text-lg font-medium text-white">Vaults</h2>
            {vaults.length === 0 ? (
              <p className="text-sm text-slate-500">No vaults yet.</p>
            ) : (
              <ul className="space-y-2">
                {vaults.map((vault) => (
                  <li
                    key={vault.id}
                    className="rounded border border-slate-700 bg-surface px-4 py-3"
                  >
                    <div className="font-medium text-white">{vault.name}</div>
                    <div className="text-xs text-slate-400">
                      {vault.blobCount} blob{vault.blobCount === 1 ? '' : 's'}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">Recent blobs</h2>
              <button
                type="button"
                onClick={handleNewBlob}
                className="text-sm text-brand hover:underline"
              >
                New blob
              </button>
            </div>
            {blobs.length === 0 ? (
              <p className="text-sm text-slate-500">
                No blobs saved to your account yet.{' '}
                <button
                  type="button"
                  onClick={handleNewBlob}
                  className="text-brand hover:underline"
                >
                  Create one
                </button>
              </p>
            ) : (
              <ul className="space-y-2">
                {blobs.map((blob) => (
                  <li key={blob.id}>
                    <Link
                      to={`/b/${blob.id}`}
                      className="block rounded border border-slate-700 bg-surface px-4 py-3 hover:border-slate-500"
                    >
                      <div className="font-medium text-white">
                        {blob.name || 'Untitled blob'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {blob.visibility} · {formatBytes(blob.sizeBytes)} ·{' '}
                        {formatDate(blob.updatedAt)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
