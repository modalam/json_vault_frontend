import { useEffect, useId, useRef, useState } from 'react';

type CurlImportDialogProps = {
  open: boolean;
  onClose: () => void;
  onImport: (curlText: string) => void;
};

export function CurlImportDialog({ open, onClose, onImport }: CurlImportDialogProps) {
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue('');
    setError(null);
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Paste a curl command to import.');
      return;
    }
    onImport(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="curl-import-title"
        className="flex w-full max-w-2xl flex-col rounded-xl border border-slate-600 bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="curl-import-title" className="text-lg font-semibold text-white">
              Import from cURL
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Paste a curl command — parsed locally. Creates a request in a new
              collection.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <label htmlFor={textareaId} className="mb-1 block text-sm text-slate-300">
          cURL command
        </label>
        <textarea
          id={textareaId}
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          spellCheck={false}
          placeholder={`curl -X POST 'https://api.example.com/users' \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"Ada"}'`}
          className="mb-2 min-h-[220px] w-full resize-y rounded-md border border-slate-600 bg-slate-950 px-3 py-2 font-mono text-[13px] text-slate-100 outline-none placeholder:text-slate-600 focus:border-brand"
        />
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Import
          </button>
        </div>
      </form>
    </div>
  );
}
