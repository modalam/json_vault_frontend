import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { JsonEditor } from '@/components/editor/JsonEditor';
import { TreeEditor } from '@/components/editor/TreeEditor';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { StatusBar } from '@/components/editor/StatusBar';
import { ShareDialog } from '@/components/blob/ShareDialog';
import { ApiError, createBlob, deleteBlob, getBlob, updateBlob } from '@/lib/api-client';
import { clearEditToken, getEditToken, setEditToken } from '@/lib/auth';
import { byteSize, formatJson, isValidJson } from '@/lib/json-utils';
import { useEditorStore } from '@/stores/editor-store';

type EditorWorkspaceProps = {
  blobId?: string;
};

export function EditorWorkspace({ blobId }: EditorWorkspaceProps) {
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);
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
    // Home / "New blob" — clear leftover state from a previous blob (SPA store persists).
    if (!blobId) {
      reset();
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
  }, [blobId, reset, setBlobId, setBlobName, setLoading, setStatusMessage, setText]);

  const activeId = blobId ?? storeBlobId;
  const editToken = activeId ? getEditToken(activeId) : null;
  const canEdit = !activeId || Boolean(editToken);
  const bytes = useMemo(() => byteSize(text), [text]);
  const lineCount = useMemo(() => text.split('\n').length, [text]);

  async function handleSave() {
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

  async function handleDelete() {
    if (!activeId || !editToken) return;
    if (!window.confirm('Delete this blob?')) return;

    try {
      await deleteBlob(activeId, editToken);
      clearEditToken(activeId);
      reset();
      setStatusMessage('Blob deleted.');
      navigate('/', { replace: true });
    } catch (err) {
      setStatusMessage(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  function handleFormat() {
    try {
      setText(formatJson(text));
      setStatusMessage('Formatted JSON.');
    } catch {
      setStatusMessage('Cannot format invalid JSON.');
    }
  }

  function handleNew() {
    reset();
    navigate('/');
  }

  function handleClear() {
    setText('{\n\n}\n');
  }

  return (
    <div className="flex flex-1 flex-col">
      <EditorToolbar
        onNew={handleNew}
        onSave={() => void handleSave()}
        onClear={handleClear}
        onFormat={handleFormat}
        onShare={() => setShareOpen(true)}
        onDelete={() => void handleDelete()}
        saving={saving}
        canSave={valid && canEdit && !loading}
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
              <JsonEditor value={text} onChange={setText} readOnly={!canEdit} />
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
              <TreeEditor value={text} onChange={canEdit ? setText : () => undefined} />
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
    </div>
  );
}
