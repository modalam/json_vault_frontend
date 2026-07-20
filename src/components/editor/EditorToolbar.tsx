type EditorToolbarProps = {
  onNew: () => void;
  onSave: () => void;
  onClear: () => void;
  onFormat: () => void;
  onCompact: () => void;
  onSort: () => void;
  onRepair: () => void;
  onValidate: () => void;
  onCompare: () => void;
  onRequest: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onShare: () => void;
  onDelete?: () => void;
  saving: boolean;
  canSave: boolean;
  canEdit: boolean;
  canUndo: boolean;
  canRedo: boolean;
  canShare: boolean;
  canDelete: boolean;
};

export function EditorToolbar({
  onNew,
  onSave,
  onClear,
  onFormat,
  onCompact,
  onSort,
  onRepair,
  onValidate,
  onCompare,
  onRequest,
  onUndo,
  onRedo,
  onShare,
  onDelete,
  saving,
  canSave,
  canEdit,
  canUndo,
  canRedo,
  canShare,
  canDelete,
}: EditorToolbarProps) {
  const btn =
    'rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40';
  const ghost = `${btn} bg-slate-800 text-slate-100 hover:bg-slate-700`;
  const primary = `${btn} bg-brand text-white hover:bg-blue-500`;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 bg-surface px-3 py-2">
      <button type="button" className={ghost} onClick={onNew} data-testid="new-button">
        New
      </button>
      <button
        type="button"
        className={primary}
        onClick={onSave}
        disabled={!canSave || saving}
        data-testid="save-button"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" className={ghost} onClick={onClear} disabled={!canEdit}>
        Clear
      </button>
      <button type="button" className={ghost} onClick={onFormat} disabled={!canEdit}>
        Format
      </button>
      <button type="button" className={ghost} onClick={onCompact} disabled={!canEdit}>
        Compact
      </button>
      <button type="button" className={ghost} onClick={onSort} disabled={!canEdit}>
        Sort keys
      </button>
      <button type="button" className={ghost} onClick={onRepair} disabled={!canEdit}>
        Repair
      </button>
      <button type="button" className={ghost} onClick={onValidate}>
        Validate
      </button>
      <button type="button" className={ghost} onClick={onCompare} data-testid="compare-button">
        JSON Compare
      </button>
      <button type="button" className={ghost} onClick={onRequest} data-testid="request-button">
        Request
      </button>
      <button type="button" className={ghost} onClick={onUndo} disabled={!canUndo || !canEdit}>
        Undo
      </button>
      <button type="button" className={ghost} onClick={onRedo} disabled={!canRedo || !canEdit}>
        Redo
      </button>

      <div className="mx-2 hidden items-center gap-3 text-sm text-slate-400 md:flex">
        <span className="rounded border border-slate-600 bg-slate-800/80 px-2 py-1 text-slate-200">
          JSON Editor
        </span>
        <span className="text-slate-600">|</span>
        <span className="rounded border border-slate-600 bg-slate-800/80 px-2 py-1 text-slate-200">
          Tree View
        </span>
      </div>

      <div className="ml-auto flex gap-2">
        <button
          type="button"
          className={ghost}
          onClick={onShare}
          disabled={!canShare}
          data-testid="share-button"
        >
          Share
        </button>
        {canDelete && onDelete && (
          <button
            type="button"
            className={`${btn} bg-red-900/60 text-red-100 hover:bg-red-800`}
            onClick={onDelete}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
