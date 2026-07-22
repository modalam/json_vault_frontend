import { useEffect, useRef, useState } from 'react';
import { exportFromJson, type ExportFormat } from '@/lib/json-export';

type SchemaExportDialogProps = {
  open: boolean;
  value: unknown;
  typeName?: string;
  onClose: () => void;
};

export function SchemaExportDialog({
  open,
  value,
  typeName,
  onClose,
}: SchemaExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('schema');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  const output = open ? exportFromJson(value, format, typeName) : '';

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setCopyError(null);
      setFormat('schema');
    }
  }, [open]);

  if (!open) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopyError(null);
      setCopied(true);
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyError('Could not copy — select the text and copy manually.');
    }
  }

  function download() {
    const ext = format === 'schema' ? 'schema.json' : 'ts';
    const mime = format === 'schema' ? 'application/json' : 'text/plain';
    const blob = new Blob([output], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(typeName || 'export').replace(/[^\w.-]+/g, '_')}.${ext}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-slate-600 bg-slate-900 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Export schema / types</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Generated locally from your JSON
            </p>
          </div>
          <button type="button" className="text-slate-400 hover:text-white" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFormat('schema')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              format === 'schema'
                ? 'bg-brand text-white'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            JSON Schema
          </button>
          <button
            type="button"
            onClick={() => setFormat('typescript')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              format === 'typescript'
                ? 'bg-brand text-white'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            TypeScript
          </button>
        </div>

        {copyError && (
          <p className="mb-2 rounded border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {copyError}
          </p>
        )}

        <textarea
          readOnly
          value={output}
          spellCheck={false}
          className="min-h-[280px] flex-1 resize-y rounded border border-slate-600 bg-slate-950 px-3 py-2 font-mono text-[13px] text-slate-100"
        />

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={download}
            className="rounded-md border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            Download
          </button>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              copied ? 'bg-emerald-600 text-white' : 'bg-brand text-white hover:bg-blue-500'
            }`}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
