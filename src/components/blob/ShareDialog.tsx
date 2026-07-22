import { useEffect, useRef, useState } from 'react';
import { blobApiHint, blobPageUrl } from '@/lib/constants';
import { scanForSecrets, type SecretFinding } from '@/lib/secrets-scan';

type ShareDialogProps = {
  blobId: string;
  open: boolean;
  onClose: () => void;
  /** Optional blob JSON text — scanned for secrets/PII warning banner. */
  content?: string;
};

type CopiedField = 'pageUrl' | 'api';

export function ShareDialog({ blobId, open, onClose, content }: ShareDialogProps) {
  const [copied, setCopied] = useState<CopiedField | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [findings, setFindings] = useState<SecretFinding[]>([]);
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
      setFindings([]);
      return;
    }
    setFindings(content ? scanForSecrets(content) : []);
  }, [open, content]);

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

        {findings.length > 0 && (
          <div className="mb-4 rounded-md border border-amber-800/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
            <p className="font-medium text-amber-200">
              Possible secrets or PII detected in this blob
            </p>
            <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs text-amber-100/90">
              {findings.slice(0, 6).map((f) => (
                <li key={`${f.kind}:${f.label}:${f.sample}`}>
                  {f.label} <span className="font-mono text-amber-200/80">({f.sample})</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-amber-200/80">
              Anyone with the link may be able to read this data. Share only if that is intentional.
            </p>
          </div>
        )}

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
