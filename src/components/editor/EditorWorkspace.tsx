import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { JsonEditor } from '@/components/editor/JsonEditor';
import { TreeEditor } from '@/components/editor/TreeEditor';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { StatusBar } from '@/components/editor/StatusBar';
import { ShareDialog } from '@/components/blob/ShareDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ApiError, createBlob, deleteBlob, getBlob, updateBlob } from '@/lib/api-client';
import { clearEditToken, getEditToken, setEditToken } from '@/lib/auth';
import {
  byteSize,
  compactJson,
  formatJson,
  isValidJson,
  repairJson,
  sortJson,
} from '@/lib/json-utils';
import { useAuthStore } from '@/stores/auth-store';
import { useEditorStore } from '@/stores/editor-store';

type EditorWorkspaceProps = {
  blobId?: string;
};

export function EditorWorkspace({ blobId }: EditorWorkspaceProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const {
    text,
    valid,
    error,
    saving,
    loading,
    statusMessage,
    blobId: storeBlobId,
    blobName,
    setText,
    setValidation,
    setSaving,
    setLoading,
    setStatusMessage,
    setBlobId,
    setBlobName,
    reset,
  } = useEditorStore();

  useEffect(() => {
    const result = isValidJson(text);
    setValidation(result.ok, result.ok ? null : result.error);
  }, [text, setValidation]);

  useEffect(() => {
    // Preserve in-progress drafts when switching tools via the sidebar.
    // Explicit "New" / "New blob" still call reset() before navigating here.
    if (!blobId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setStatusMessage('Loading blob…');

    void (async () => {
      try {
        const token = getEditToken(blobId);
        const content = await getBlob(blobId, token);
        if (cancelled) return;
        setText(JSON.stringify(content, null, 2), { fromRemote: true });
        setBlobId(blobId);
        setBlobName('');
        setStatusMessage(token ? 'Loaded (editable)' : 'Loaded (read-only without edit token)');
      } catch (err) {
        if (cancelled) return;
        setStatusMessage(err instanceof ApiError ? err.message : 'Failed to load blob');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [blobId, setBlobId, setBlobName, setLoading, setStatusMessage, setText]);

  const activeId = blobId ?? storeBlobId;
  const editToken = activeId ? getEditToken(activeId) : null;
  const canEdit = !activeId || Boolean(editToken);
  const bytes = useMemo(() => byteSize(text), [text]);
  const lineCount = useMemo(() => text.split('\n').length, [text]);

  async function handleSave() {
    if (!user) {
      setStatusMessage('Sign in to save your JSON.');
      return;
    }

    const parsed = isValidJson(text);
    if (!parsed.ok) {
      setStatusMessage(parsed.error);
      return;
    }

    setSaving(true);
    try {
      if (!activeId) {
        const created = await createBlob(parsed.value, blobName || undefined);
        setEditToken(created.id, created.editToken);
        setBlobId(created.id);
        setText(text, { fromRemote: true });
        setStatusMessage('Blob saved successfully.');
        navigate(`/b/${created.id}`, { replace: true });
      } else {
        if (!editToken) {
          setStatusMessage('No edit token found for this blob.');
          return;
        }
        await updateBlob(activeId, parsed.value, editToken, blobName || undefined);
        setText(text, { fromRemote: true });
        setStatusMessage('Blob updated successfully.');
      }
    } catch (err) {
      setStatusMessage(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!activeId || !editToken) return;
    setDeleteConfirmOpen(true);
  }

  async function confirmDeleteBlob() {
    if (!activeId || !editToken || deleting) return;

    setDeleting(true);
    try {
      await deleteBlob(activeId, editToken);
      clearEditToken(activeId);
      reset();
      setDeleteConfirmOpen(false);
      setStatusMessage('Blob deleted.');
      navigate('/', { replace: true });
    } catch (err) {
      setStatusMessage(err instanceof ApiError ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  function handleFormat() {
    try {
      applyTextChange(formatJson(text));
      setStatusMessage('Formatted JSON.');
    } catch {
      setStatusMessage('Cannot format invalid JSON.');
    }
  }

  function applyTextChange(nextText: string) {
    if (nextText === text) return;
    setUndoStack((history) => [...history.slice(-99), text]);
    setRedoStack([]);
    setText(nextText);
  }

  function handleCompact() {
    try {
      applyTextChange(compactJson(text));
      setStatusMessage('Compacted JSON.');
    } catch {
      setStatusMessage('Cannot compact invalid JSON.');
    }
  }

  function handleSort() {
    try {
      applyTextChange(sortJson(text));
      setStatusMessage('Sorted object keys.');
    } catch {
      setStatusMessage('Cannot sort invalid JSON.');
    }
  }

  function handleRepair() {
    try {
      applyTextChange(repairJson(text));
      setStatusMessage('Repaired and formatted JSON.');
    } catch {
      setStatusMessage('Unable to repair this JSON automatically.');
    }
  }

  function handleValidate() {
    const result = isValidJson(text);
    setStatusMessage(result.ok ? 'Valid JSON.' : result.error);
  }

  function handleUndo() {
    const previous = undoStack.at(-1);
    if (previous === undefined) return;
    setUndoStack((history) => history.slice(0, -1));
    setRedoStack((history) => [...history, text]);
    setText(previous);
    setStatusMessage('Undid last change.');
  }

  function handleRedo() {
    const next = redoStack.at(-1);
    if (next === undefined) return;
    setRedoStack((history) => history.slice(0, -1));
    setUndoStack((history) => [...history, text]);
    setText(next);
    setStatusMessage('Redid last change.');
  }

  function handleNew() {
    reset();
    navigate('/');
  }

  function handleClear() {
    applyTextChange('{\n\n}\n');
  }

  return (
    <div className="flex flex-1 flex-col">
      <EditorToolbar
        onNew={handleNew}
        onSave={() => void handleSave()}
        onClear={handleClear}
        onFormat={handleFormat}
        onCompact={handleCompact}
        onSort={handleSort}
        onRepair={handleRepair}
        onValidate={handleValidate}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onShare={() => setShareOpen(true)}
        onDelete={handleDelete}
        saving={saving}
        canSave={Boolean(user) && valid && canEdit && !loading}
        canEdit={canEdit && !loading}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        canShare={Boolean(activeId)}
        canDelete={Boolean(activeId && editToken)}
      />

      {/* Dual pane like jsonblob: JSON Editor | Tree View */}
      <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-slate-800 md:grid-cols-2 md:divide-x md:divide-y-0">
        <section className="flex min-h-[45vh] flex-col md:min-h-0">
          <div className="border-b border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
            JSON Editor
          </div>
          <div className="min-h-0 flex-1">
            {loading ? (
              <div className="flex h-full items-center justify-center text-slate-400">Loading…</div>
            ) : (
              <JsonEditor value={text} onChange={applyTextChange} readOnly={!canEdit} />
            )}
          </div>
        </section>

        <section className="flex min-h-[45vh] flex-col bg-slate-950/40 md:min-h-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900/60 px-3 py-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Tree View
            </span>
            <input
              value={blobName}
              onChange={(e) => setBlobName(e.target.value)}
              disabled={!canEdit}
              placeholder="Untitled blob"
              className="ml-auto max-w-[14rem] rounded border border-slate-600 bg-slate-950 px-2 py-0.5 text-xs text-slate-200"
            />
          </div>
          {activeId && (
            <div className="border-b border-slate-800 px-3 py-1 font-mono text-[11px] text-sky-400/90">
              id: {activeId}
            </div>
          )}
          {!canEdit && activeId && (
            <div className="border-b border-amber-900/50 bg-amber-950/30 px-3 py-1 text-[11px] text-amber-300">
              No local edit token — read-only in this browser.
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-hidden">
            {loading ? (
              <div className="flex h-full items-center justify-center text-slate-400">Loading…</div>
            ) : (
              <TreeEditor value={text} onChange={canEdit ? applyTextChange : () => undefined} />
            )}
          </div>
        </section>
      </div>

      <StatusBar
        valid={valid}
        error={error}
        bytes={bytes}
        message={statusMessage ? `${lineCount} lines · ${statusMessage}` : `${lineCount} lines`}
      />

      {activeId && (
        <ShareDialog blobId={activeId} open={shareOpen} onClose={() => setShareOpen(false)} />
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={`Delete "${blobName.trim() || 'Untitled blob'}"?`}
        description="This will permanently delete the blob from your vault. Anyone with the share link will no longer be able to access it. This action cannot be undone."
        confirmLabel={deleting ? 'Deleting…' : 'Delete blob'}
        onConfirm={() => void confirmDeleteBlob()}
        onCancel={() => {
          if (!deleting) setDeleteConfirmOpen(false);
        }}
      />
    </div>
  );
}
