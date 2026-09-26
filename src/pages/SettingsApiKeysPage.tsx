import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const ALL_SCOPES = [
  'blobs:read',
  'blobs:write',
  'vaults:read',
  'vaults:write',
  'users:read',
] as const;

export function SettingsApiKeysPage() {
  const user = useAuthStore((s) => s.user);
  const [keys, setKeys] = useState<api.ApiKeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['blobs:read', 'blobs:write']);
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setKeys(await api.listApiKeys());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    setCreatedKey(null);
    try {
      const created = await api.createApiKey({ name: name.trim(), scopes });
      setCreatedKey(created.key);
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    setRevokingId(id);
    setError(null);
    try {
      await api.revokeApiKey(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key');
    } finally {
      setRevokingId(null);
    }
  }

  function toggleScope(scope: string) {
    setScopes((current) =>
      current.includes(scope) ? current.filter((s) => s !== scope) : [...current, scope],
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6">
        <p className="text-xs text-slate-500">
          <Link to="/settings" className="text-brand hover:underline">
            Settings
          </Link>{' '}
          / API keys
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-white">API keys</h1>
        <p className="mt-1 text-sm text-slate-400">
          Authenticate server-to-server requests as {user?.email}. Keys are shown once at creation.
        </p>
      </div>

      {createdKey && (
        <div className="mb-6 rounded-lg border border-amber-700/60 bg-amber-950/40 px-4 py-3">
          <p className="text-sm font-medium text-amber-100">Copy your new API key now</p>
          <p className="mt-1 text-xs text-amber-200/80">
            It will not be shown again. Store it in your secret manager.
          </p>
          <code className="mt-2 block break-all rounded bg-black/40 px-2 py-2 font-mono text-xs text-amber-50">
            {createdKey}
          </code>
          <button
            type="button"
            className="mt-2 text-xs text-brand hover:underline"
            onClick={() => void navigator.clipboard.writeText(createdKey)}
          >
            Copy to clipboard
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="mb-8 space-y-3 rounded-lg border border-slate-700 bg-surface p-4"
      >
        <h2 className="text-sm font-medium text-white">Create key</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="CI Pipeline"
          className="w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
          maxLength={100}
          required
        />
        <div className="flex flex-wrap gap-2">
          {ALL_SCOPES.map((scope) => (
            <label
              key={scope}
              className="flex cursor-pointer items-center gap-1.5 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300"
            >
              <input
                type="checkbox"
                checked={scopes.includes(scope)}
                onChange={() => toggleScope(scope)}
              />
              {scope}
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={creating || scopes.length === 0}
          className="rounded bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create API key'}
        </button>
      </form>

      {loading && <p className="text-slate-400">Loading keys…</p>}
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {!loading && keys.length === 0 && (
        <p className="text-sm text-slate-500">No active API keys yet.</p>
      )}

      <ul className="space-y-2">
        {keys.map((key) => (
          <li
            key={key.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-700 bg-surface px-4 py-3"
          >
            <div>
              <div className="font-medium text-white">{key.name}</div>
              <div className="font-mono text-xs text-slate-400">
                {key.keyPrefix}… · {key.scopes.join(', ')}
              </div>
              <div className="text-[11px] text-slate-500">
                Created {new Date(key.createdAt).toLocaleString()}
                {key.lastUsedAt ? ` · Last used ${new Date(key.lastUsedAt).toLocaleString()}` : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleRevoke(key.id)}
              disabled={revokingId === key.id}
              className="rounded border border-red-800/80 bg-red-950/40 px-2.5 py-1 text-xs text-red-200 hover:bg-red-900/50 disabled:opacity-50"
            >
              {revokingId === key.id ? 'Revoking…' : 'Revoke'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
