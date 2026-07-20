import { useId, useMemo, useState } from 'react';
import type { Collection, Environment, Workspace, WorkspaceState } from '@/lib/request-workspace';
import { createRow } from '@/lib/request-workspace';

type SidebarTab = 'collections' | 'environments';

type WorkspaceSidebarProps = {
  state: WorkspaceState;
  workspace: Workspace;
  activeRequestId: string | null;
  importMessage: string | null;
  onSwitchWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
  onSwitchTab: (tab: SidebarTab) => void;
  activeTab: SidebarTab;
  onSelectRequest: (requestId: string) => void;
  onCreateCollection: () => void;
  onRenameCollection: (collectionId: string, name: string) => void;
  onDeleteCollection: (collectionId: string) => void;
  onCreateRequest: (collectionId: string) => void;
  onDeleteRequest: (collectionId: string, requestId: string) => void;
  onImportFiles: (files: File[]) => Promise<void>;
  onSelectEnvironment: (environmentId: string | null) => void;
  onCreateEnvironment: () => void;
  onRenameEnvironment: (environmentId: string, name: string) => void;
  onDeleteEnvironment: (environmentId: string) => void;
  onUpdateEnvironmentVariables: (environmentId: string, variables: Environment['variables']) => void;
};

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-400',
  POST: 'text-amber-300',
  PUT: 'text-sky-400',
  PATCH: 'text-violet-300',
  DELETE: 'text-red-400',
  HEAD: 'text-slate-300',
  OPTIONS: 'text-slate-300',
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span className={`shrink-0 text-[10px] font-semibold uppercase ${METHOD_COLORS[method] ?? 'text-slate-300'}`}>
      {method}
    </span>
  );
}

function promptName(label: string, initial = ''): string | null {
  const value = window.prompt(label, initial);
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function WorkspaceSidebar({
  state,
  workspace,
  activeRequestId,
  importMessage,
  onSwitchWorkspace,
  onCreateWorkspace,
  onSwitchTab,
  activeTab,
  onSelectRequest,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onCreateRequest,
  onDeleteRequest,
  onImportFiles,
  onSelectEnvironment,
  onCreateEnvironment,
  onRenameEnvironment,
  onDeleteEnvironment,
  onUpdateEnvironmentVariables,
}: WorkspaceSidebarProps) {
  const fileInputId = useId();
  const folderInputId = useId();
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(
    () => new Set(workspace.collections.map((c) => c.id)),
  );

  const filteredCollections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workspace.collections;
    return workspace.collections
      .map((collection) => ({
        ...collection,
        requests: collection.requests.filter(
          (request) =>
            request.name.toLowerCase().includes(q) ||
            request.url.toLowerCase().includes(q) ||
            collection.name.toLowerCase().includes(q),
        ),
      }))
      .filter((collection) => collection.requests.length > 0 || collection.name.toLowerCase().includes(q));
  }, [search, workspace.collections]);

  const activeEnvironment = workspace.environments.find(
    (env) => env.id === state.activeEnvironmentId,
  );

  function toggleCollection(collectionId: string) {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(collectionId)) next.delete(collectionId);
      else next.add(collectionId);
      return next;
    });
  }

  function handleRenameCollection(collection: Collection) {
    const name = promptName('Collection name', collection.name);
    if (name) onRenameCollection(collection.id, name);
  }

  function handleRenameEnvironment(environment: Environment) {
    const name = promptName('Environment name', environment.name);
    if (name) onRenameEnvironment(environment.id, name);
  }

  async function handleImportSelection(fileList: FileList | null) {
    if (!fileList?.length) return;
    setImporting(true);
    try {
      await onImportFiles([...fileList]);
    } finally {
      setImporting(false);
    }
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-r border-slate-700 bg-slate-950/80 md:w-72 lg:w-80">
      <div className="border-b border-slate-700 p-3">
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Workspace
        </label>
        <div className="flex gap-2">
          <select
            value={workspace.id}
            onChange={(e) => onSwitchWorkspace(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-brand"
          >
            {state.workspaces.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onCreateWorkspace}
            className="rounded-md border border-slate-600 bg-slate-800 px-2.5 text-sm text-slate-200 hover:bg-slate-700"
            title="New workspace"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex border-b border-slate-700">
        <button
          type="button"
          onClick={() => onSwitchTab('collections')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition ${
            activeTab === 'collections'
              ? 'border-b-2 border-brand text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Collections
        </button>
        <button
          type="button"
          onClick={() => onSwitchTab('environments')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition ${
            activeTab === 'environments'
              ? 'border-b-2 border-brand text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Environments
        </button>
      </div>

      {activeTab === 'collections' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-2 border-b border-slate-800 p-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search collections…"
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-2.5 py-1.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-brand"
            />
            <button
              type="button"
              onClick={onCreateCollection}
              className="w-full rounded-md border border-dashed border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:border-brand hover:text-white"
            >
              + New collection
            </button>
            <div className="grid grid-cols-2 gap-2">
              <label
                htmlFor={fileInputId}
                className={`cursor-pointer rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-center text-sm text-slate-200 hover:bg-slate-700 ${
                  importing ? 'pointer-events-none opacity-60' : ''
                }`}
              >
                Import file
              </label>
              <label
                htmlFor={folderInputId}
                className={`cursor-pointer rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-center text-sm text-slate-200 hover:bg-slate-700 ${
                  importing ? 'pointer-events-none opacity-60' : ''
                }`}
              >
                Import folder
              </label>
            </div>
            <input
              id={fileInputId}
              type="file"
              accept=".json,application/json"
              multiple
              className="sr-only"
              onChange={(e) => {
                void handleImportSelection(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              id={folderInputId}
              type="file"
              accept=".json,application/json"
              multiple
              className="sr-only"
              {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
              onChange={(e) => {
                void handleImportSelection(e.target.files);
                e.target.value = '';
              }}
            />
            <p className="text-[11px] leading-relaxed text-slate-500">
              Supports Postman collections, Postman environments, and JSON Vault exports (.json).
            </p>
            {importMessage && (
              <p className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-300">
                {importMessage}
              </p>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {filteredCollections.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-slate-500">
                No collections yet. Create one to save requests.
              </p>
            ) : (
              <ul className="space-y-1">
                {filteredCollections.map((collection) => {
                  const expanded = expandedCollections.has(collection.id);
                  return (
                    <li key={collection.id}>
                      <div className="group flex items-center gap-1 rounded-md px-1 py-1 hover:bg-slate-800/80">
                        <button
                          type="button"
                          onClick={() => toggleCollection(collection.id)}
                          className="rounded p-1 text-slate-400 hover:text-slate-200"
                          aria-label={expanded ? 'Collapse collection' : 'Expand collection'}
                        >
                          {expanded ? '▾' : '▸'}
                        </button>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
                          {collection.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => onCreateRequest(collection.id)}
                          className="rounded px-1.5 text-xs text-slate-400 opacity-0 hover:text-brand group-hover:opacity-100"
                          title="Add request"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRenameCollection(collection)}
                          className="rounded px-1.5 text-xs text-slate-400 opacity-0 hover:text-slate-200 group-hover:opacity-100"
                          title="Rename"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete collection "${collection.name}"?`)) {
                              onDeleteCollection(collection.id);
                            }
                          }}
                          className="rounded px-1.5 text-xs text-slate-400 opacity-0 hover:text-red-400 group-hover:opacity-100"
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>

                      {expanded && (
                        <ul className="ml-5 mt-0.5 space-y-0.5 border-l border-slate-800 pl-2">
                          {collection.requests.length === 0 ? (
                            <li className="px-2 py-2 text-xs text-slate-500">No requests</li>
                          ) : (
                            collection.requests.map((request) => (
                              <li key={request.id}>
                                <div
                                  className={`group flex items-center gap-2 rounded-md px-2 py-1.5 ${
                                    activeRequestId === request.id
                                      ? 'bg-brand/20 text-white'
                                      : 'text-slate-300 hover:bg-slate-800/80'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => onSelectRequest(request.id)}
                                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                  >
                                    <MethodBadge method={request.method} />
                                    <span className="truncate text-sm">{request.name}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (window.confirm(`Delete request "${request.name}"?`)) {
                                        onDeleteRequest(collection.id, request.id);
                                      }
                                    }}
                                    className="rounded px-1 text-xs text-slate-400 opacity-0 hover:text-red-400 group-hover:opacity-100"
                                    title="Delete request"
                                  >
                                    ×
                                  </button>
                                </div>
                              </li>
                            ))
                          )}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-2 border-b border-slate-800 p-3">
            <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Active environment
            </label>
            <select
              value={state.activeEnvironmentId ?? ''}
              onChange={(e) => onSelectEnvironment(e.target.value || null)}
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-brand"
            >
              <option value="">No environment</option>
              {workspace.environments.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onCreateEnvironment}
              className="w-full rounded-md border border-dashed border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:border-brand hover:text-white"
            >
              + New environment
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {!activeEnvironment ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Select an environment to manage variables. Use {'{{variable}}'} in URLs, headers, and
                body.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white">{activeEnvironment.name}</h3>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleRenameEnvironment(activeEnvironment)}
                      className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete environment "${activeEnvironment.name}"?`)) {
                          onDeleteEnvironment(activeEnvironment.id);
                        }
                      }}
                      className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-950/40"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {activeEnvironment.variables.map((row) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) => {
                          onUpdateEnvironmentVariables(
                            activeEnvironment.id,
                            activeEnvironment.variables.map((item) =>
                              item.id === row.id ? { ...item, enabled: e.target.checked } : item,
                            ),
                          );
                        }}
                        className="h-4 w-4 accent-brand"
                      />
                      <input
                        value={row.key}
                        onChange={(e) => {
                          onUpdateEnvironmentVariables(
                            activeEnvironment.id,
                            activeEnvironment.variables.map((item) =>
                              item.id === row.id ? { ...item, key: e.target.value } : item,
                            ),
                          );
                        }}
                        placeholder="Variable"
                        className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-brand"
                      />
                      <input
                        value={row.value}
                        onChange={(e) => {
                          onUpdateEnvironmentVariables(
                            activeEnvironment.id,
                            activeEnvironment.variables.map((item) =>
                              item.id === row.id ? { ...item, value: e.target.value } : item,
                            ),
                          );
                        }}
                        placeholder="Value"
                        className="min-w-0 flex-[1.2] rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-brand"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = activeEnvironment.variables.filter((item) => item.id !== row.id);
                          onUpdateEnvironmentVariables(
                            activeEnvironment.id,
                            next.length > 0 ? next : [createRow()],
                          );
                        }}
                        className="text-slate-400 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onUpdateEnvironmentVariables(activeEnvironment.id, [
                      ...activeEnvironment.variables,
                      createRow(),
                    ]);
                  }}
                  className="text-sm text-brand hover:underline"
                >
                  + Add variable
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
