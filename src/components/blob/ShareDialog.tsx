import { blobApiHint, blobPageUrl } from '@/lib/constants';

type ShareDialogProps = {
  blobId: string;
  open: boolean;
  onClose: () => void;
};

async function copy(text: string) {
  await navigator.clipboard.writeText(text);
}

export function ShareDialog({ blobId, open, onClose }: ShareDialogProps) {
  if (!open) return null;

  const pageUrl = blobPageUrl(blobId);
  const apiHint = blobApiHint(blobId);
  const payload = JSON.stringify({ id: blobId }, null, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-600 bg-slate-900 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Share blob</h2>
          <button type="button" className="text-slate-400 hover:text-white" onClick={onClose}>
            Close
          </button>
        </div>

        <label className="mb-1 block text-xs text-slate-400">Page URL</label>
        <div className="mb-4 flex gap-2">
          <input
            readOnly
            value={pageUrl}
            className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 font-mono text-sm"
          />
          <button
            type="button"
            className="rounded bg-brand px-3 text-sm text-white"
            onClick={() => void copy(pageUrl)}
          >
            Copy
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
            className="rounded bg-brand px-3 text-sm text-white"
            onClick={() => void copy(payload)}
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
