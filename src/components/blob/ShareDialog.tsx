import { useEffect, useRef, useState } from 'react';
import { blobApiHint, blobPageUrl } from '@/lib/constants';

type ShareDialogProps = {
  blobId: string;
  open: boolean;
  onClose: () => void;
};

type CopiedField = 'pageUrl' | 'api';

export function ShareDialog({ blobId, open, onClose }: ShareDialogProps) {
  const [copied, setCopied] = useState<CopiedField | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setCopied(null);
      setCopyError(null);
    }
  }, [open]);

  if (!open) return null;

  const pageUrl = blobPageUrl(blobId);
  const apiHint = blobApiHint(blobId);
  const payload = JSON.stringify({ id: blobId }, null, 2);

  async function handleCopy(text: string, field: CopiedField) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyError(null);
      setCopied(field);
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
      setCopyError('Could not copy — try selecting the text and copying manually.');
    }
  }

  const copyBtn = (field: CopiedField) =>
    `shrink-0 rounded px-3 py-1.5 text-sm font-medium transition ${
      copied === field
        ? 'bg-emerald-600 text-white'
        : 'bg-brand text-white hover:bg-blue-500'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-600 bg-slate-900 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Share blob</h2>
          <button type="button" className="text-slate-400 hover:text-white" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="sr-only" aria-live="polite">
          {copied === 'pageUrl'
            ? 'Page URL copied to clipboard.'
            : copied === 'api'
              ? 'API payload copied to clipboard.'
              : ''}
        </p>

        {copyError && (
          <p className="mb-3 rounded border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {copyError}
          </p>
        )}

        <label className="mb-1 block text-xs text-slate-400">Page URL</label>
        <div className="mb-4 flex gap-2">
          <input
            readOnly
            value={pageUrl}
            className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 font-mono text-sm"
          />
          <button
            type="button"
            className={copyBtn('pageUrl')}
            onClick={() => void handleCopy(pageUrl, 'pageUrl')}
          >
            {copied === 'pageUrl' ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <label className="mb-1 block text-xs text-slate-400">API — POST {apiHint}</label>
        <div className="flex gap-2">
          <textarea
            readOnly
            rows={3}
            value={payload}
            className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 font-mono text-sm"
          />
          <button
            type="button"
            className={copyBtn('api')}
            onClick={() => void handleCopy(payload, 'api')}
          >
            {copied === 'api' ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
