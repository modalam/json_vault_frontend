import { useId, useMemo, useState } from 'react';
import { ConfirmDialog, NameDialog } from '@/components/ui/ConfirmDialog';
import { CurlImportDialog } from '@/components/editor/CurlImportDialog';
import type { Environment, Workspace, WorkspaceState } from '@/lib/request-workspace';
import { createRow } from '@/lib/request-workspace';

type SidebarTab = 'collections' | 'environments';

type NameDialogState =
  | { kind: 'workspace-create' }
  | { kind: 'collection-create' }
  | { kind: 'collection-rename'; collectionId: string; name: string }
  | { kind: 'request-create'; collectionId: string }
  | { kind: 'environment-create' }
  | { kind: 'environment-rename'; environmentId: string; name: string };

type ConfirmDialogState =
  | {
      kind: 'workspace-delete';
      workspaceId: string;
      name: string;
      collectionCount: number;
      environmentCount: number;
    }
  | { kind: 'collection-delete'; collectionId: string; name: string; requestCount: number }
  | { kind: 'request-delete'; collectionId: string; requestId: string; name: string }
  | { kind: 'environment-delete'; environmentId: string; name: string };

type WorkspaceSidebarProps = {
  state: WorkspaceState;
  workspace: Workspace;
  activeRequestId: string | null;
  importMessage: string | null;
  onSwitchWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: (name: string) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onSwitchTab: (tab: SidebarTab) => void;
  activeTab: SidebarTab;
  onSelectRequest: (requestId: string) => void;
  onCreateCollection: (name: string) => void;
  onRenameCollection: (collectionId: string, name: string) => void;
  onDeleteCollection: (collectionId: string) => void;
  onCreateRequest: (collectionId: string, name: string) => void;
  onDeleteRequest: (collectionId: string, requestId: string) => void;
  onImportFiles: (files: File[]) => Promise<void>;
  onImportCurl: (curlText: string) => void;
  onSelectEnvironment: (environmentId: string | null) => void;
  onCreateEnvironment: (name: string) => void;
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

export function WorkspaceSidebar({
  state,
  workspace,
  activeRequestId,
  importMessage,
  onSwitchWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
  onSwitchTab,
  activeTab,
  onSelectRequest,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onCreateRequest,
  onDeleteRequest,
  onImportFiles,
  onImportCurl,
  onSelectEnvironment,
  onCreateEnvironment,
  onRenameEnvironment,
  onDeleteEnvironment,
  onUpdateEnvironmentVariables,
}: WorkspaceSidebarProps) {
  const fileInputId = useId();
  const folderInputId = useId();
  const [importing, setImporting] = useState(false);
  const [curlImportOpen, setCurlImportOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [nameDialog, setNameDialog] = useState<NameDialogState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
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

  async function handleImportSelection(fileList: FileList | null) {
    if (!fileList?.length) return;
    setImporting(true);
    try {
      await onImportFiles([...fileList]);
    } finally {
      setImporting(false);
    }
  }

  function handleNameConfirm(value: string) {
    if (!nameDialog) return;
    switch (nameDialog.kind) {
      case 'workspace-create':
        onCreateWorkspace(value);
        break;
      case 'collection-create':
        onCreateCollection(value);
        break;
      case 'collection-rename':
        onRenameCollection(nameDialog.collectionId, value);
        break;
      case 'request-create':
        onCreateRequest(nameDialog.collectionId, value);
        break;
      case 'environment-create':
        onCreateEnvironment(value);
        break;
      case 'environment-rename':
        onRenameEnvironment(nameDialog.environmentId, value);
        break;
    }
    setNameDialog(null);
  }

  function handleConfirmDelete() {
    if (!confirmDialog) return;
    switch (confirmDialog.kind) {
      case 'workspace-delete':
        onDeleteWorkspace(confirmDialog.workspaceId);
        break;
      case 'collection-delete':
        onDeleteCollection(confirmDialog.collectionId);
        break;
      case 'request-delete':
        onDeleteRequest(confirmDialog.collectionId, confirmDialog.requestId);
        break;
      case 'environment-delete':
        onDeleteEnvironment(confirmDialog.environmentId);
        break;
    }
    setConfirmDialog(null);
  }

  const canDeleteWorkspace = state.workspaces.length > 1;

  const nameDialogProps = (() => {
    if (!nameDialog) return null;
    switch (nameDialog.kind) {
      case 'workspace-create':
        return {
          title: 'Create workspace',
          label: 'Workspace name',
          initialValue: 'New Workspace',
          confirmLabel: 'Create',
        };
      case 'collection-create':
        return {
          title: 'Create collection',
          label: 'Collection name',
          initialValue: 'New Collection',
          confirmLabel: 'Create',
        };
      case 'collection-rename':
        return {
          title: 'Rename collection',
          label: 'Collection name',
          initialValue: nameDialog.name,
          confirmLabel: 'Rename',
        };
      case 'request-create':
        return {
          title: 'Create request',
          label: 'Request name',
          initialValue: 'New Request',
          confirmLabel: 'Create',
        };
      case 'environment-create':
        return {
          title: 'Create environment',
          label: 'Environment name',
          initialValue: 'New Environment',
          confirmLabel: 'Create',
        };
      case 'environment-rename':
        return {
          title: 'Rename environment',
          label: 'Environment name',
          initialValue: nameDialog.name,
          confirmLabel: 'Rename',
        };
    }
  })();

  const confirmDialogProps = (() => {
    if (!confirmDialog) return null;
    switch (confirmDialog.kind) {
      case 'workspace-delete':
        return {
          title: `Delete "${confirmDialog.name}"?`,
          description: `This will permanently delete the workspace, its ${confirmDialog.collectionCount} collection${confirmDialog.collectionCount === 1 ? '' : 's'}, and ${confirmDialog.environmentCount} environment${confirmDialog.environmentCount === 1 ? '' : 's'}. This action cannot be undone.`,
        };
      case 'collection-delete':
        return {
          title: `Delete "${confirmDialog.name}"?`,
          description: `This will permanently delete the collection and its ${confirmDialog.requestCount} request${confirmDialog.requestCount === 1 ? '' : 's'}. This action cannot be undone.`,
        };
      case 'request-delete':
        return {
          title: `Delete "${confirmDialog.name}"?`,
          description: 'This will permanently delete this request from the collection. This action cannot be undone.',
        };
      case 'environment-delete':
        return {
          title: `Delete "${confirmDialog.name}"?`,
          description:
            'This will permanently delete the environment and its variables. Requests using {{variables}} from this environment will stop resolving them.',
        };
    }
  })();

  return (
    <>
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
              onClick={() => setNameDialog({ kind: 'workspace-create' })}
              className="rounded-md border border-slate-600 bg-slate-800 px-2.5 text-sm text-slate-200 hover:bg-slate-700"
              title="New workspace"
            >
              +
            </button>
            <button
              type="button"
              disabled={!canDeleteWorkspace}
              onClick={() =>
                setConfirmDialog({
                  kind: 'workspace-delete',
                  workspaceId: workspace.id,
                  name: workspace.name,
                  collectionCount: workspace.collections.length,
                  environmentCount: workspace.environments.length,
                })
              }
              className="rounded-md border border-slate-600 bg-slate-800 px-2.5 text-sm text-red-300 hover:bg-slate-700 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-800 disabled:hover:text-red-300"
              title={
                canDeleteWorkspace
                  ? `Delete workspace "${workspace.name}"`
                  : 'Keep at least one workspace'
              }
            >
              ×
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
                onClick={() => setNameDialog({ kind: 'collection-create' })}
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
              <button
                type="button"
                onClick={() => setCurlImportOpen(true)}
                className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
              >
                Import cURL
              </button>
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
                Supports Postman collections/environments, JSON Vault exports (.json), and paste
                cURL.
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
                            onClick={() =>
                              setNameDialog({ kind: 'request-create', collectionId: collection.id })
                            }
                            className="rounded px-1.5 text-xs text-slate-400 opacity-0 hover:text-brand group-hover:opacity-100"
                            title="Add request"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setNameDialog({
                                kind: 'collection-rename',
                                collectionId: collection.id,
                                name: collection.name,
                              })
                            }
                            className="rounded px-1.5 text-xs text-slate-400 opacity-0 hover:text-slate-200 group-hover:opacity-100"
                            title="Rename"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDialog({
                                kind: 'collection-delete',
                                collectionId: collection.id,
                                name: collection.name,
                                requestCount: collection.requests.length,
                              })
                            }
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
                                      onClick={() =>
                                        setConfirmDialog({
                                          kind: 'request-delete',
                                          collectionId: collection.id,
                                          requestId: request.id,
                                          name: request.name,
                                        })
                                      }
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
                onClick={() => setNameDialog({ kind: 'environment-create' })}
                className="w-full rounded-md border border-dashed border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:border-brand hover:text-white"
              >
                + New environment
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {!activeEnvironment ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No environment selected. Create one and use {'{{variable}}'} in URLs, headers, and
                  body.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white">{activeEnvironment.name}</h3>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setNameDialog({
                            kind: 'environment-rename',
                            environmentId: activeEnvironment.id,
                            name: activeEnvironment.name,
                          })
                        }
                        className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDialog({
                            kind: 'environment-delete',
                            environmentId: activeEnvironment.id,
                            name: activeEnvironment.name,
                          })
                        }
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

      {nameDialogProps && (
        <NameDialog
          open={Boolean(nameDialog)}
          title={nameDialogProps.title}
          label={nameDialogProps.label}
          initialValue={nameDialogProps.initialValue}
          confirmLabel={nameDialogProps.confirmLabel}
          onConfirm={handleNameConfirm}
          onCancel={() => setNameDialog(null)}
        />
      )}

      {confirmDialogProps && (
        <ConfirmDialog
          open={Boolean(confirmDialog)}
          title={confirmDialogProps.title}
          description={confirmDialogProps.description}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      <CurlImportDialog
        open={curlImportOpen}
        onClose={() => setCurlImportOpen(false)}
        onImport={(curlText) => {
          setCurlImportOpen(false);
          onImportCurl(curlText);
        }}
      />
    </>
  );
}
