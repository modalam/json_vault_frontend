import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, explainJsonWithAi } from '@/lib/api-client';
import { outlineJson } from '@/lib/json-outline';
import { useAuthStore } from '@/stores/auth-store';

type ExplainJsonPanelProps = {
  open: boolean;
  value: unknown | null;
  blobName?: string;
  onClose: () => void;
};

export function ExplainJsonPanel({ open, value, blobName, onClose }: ExplainJsonPanelProps) {
  const user = useAuthStore((state) => state.user);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const outline = useMemo(() => (value == null ? null : outlineJson(value)), [value]);

  useEffect(() => {
    if (!open) {
      setAiExplanation(null);
      setAiModel(null);
      setAiError(null);
      setAiLoading(false);
    }
  }, [open]);

  useEffect(() => {
    // Reset AI result when the JSON being explained changes.
    setAiExplanation(null);
    setAiModel(null);
    setAiError(null);
  }, [value]);

  if (!open) return null;

  async function handleExplainWithAi() {
    if (value == null) return;
    if (!user) {
      setAiError('Sign in to use AI for Explain JSON feature.');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    try {
      const data = await explainJsonWithAi(value, blobName?.trim() || undefined);
      setAiExplanation(data.explanation);
      setAiModel(data.model);
    } catch (err) {
      setAiExplanation(null);
      setAiModel(null);
      setAiError(err instanceof ApiError ? err.message : 'Failed to explain JSON with AI.');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close explain panel backdrop"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-slate-700 bg-slate-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="explain-json-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-700 px-4 py-3">
          <div>
            <h2 id="explain-json-title" className="text-base font-semibold text-white">
              Explain JSON
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Local structure outline + optional Workers AI summary
            </p>
          </div>
          <button
            type="button"
            className="rounded px-2 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {!outline ? (
            <p className="text-sm text-slate-400">No valid JSON to explain.</p>
          ) : (
            <>
              <section className="space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  What is this?
                </div>
                <p className="text-sm leading-relaxed text-slate-200">{outline.summary}</p>
                <p className="text-xs text-slate-500">
                  Root type: <span className="font-mono text-slate-300">{outline.rootType}</span>
                  {blobName?.trim() ? (
                    <>
                      {' '}
                      · Name:{' '}
                      <span className="font-mono text-slate-300">{blobName.trim()}</span>
                    </>
                  ) : null}
                </p>
              </section>

              <section className="space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Key paths
                </div>
                <ul className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-slate-700 bg-slate-950/70 p-2 font-mono text-[11px] leading-relaxed text-slate-300">
                  {outline.paths.map((path) => (
                    <li key={path} className="break-all">
                      {path}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2 rounded-md border border-slate-700 bg-slate-950/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    AI summary
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleExplainWithAi()}
                    disabled={aiLoading || value == null}
                    className="rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-60"
                    title="Uses AI for Explain JSON feature"
                  >
                    {aiLoading ? 'Explaining…' : 'Explain with AI'}
                  </button>
                </div>

                {!user && (
                  <p className="text-xs text-slate-500">
                    <Link to="/login" className="text-brand hover:underline">
                      Sign in
                    </Link>{' '}
                    to generate a richer AI summary for this JSON blob.
                  </p>
                )}

                {aiError && (
                  <p className="rounded border border-red-900/60 bg-red-950/40 px-2.5 py-2 text-xs text-red-300">
                    {aiError}
                  </p>
                )}

                {aiExplanation && (
                  <div className="rounded-md border border-sky-900/50 bg-sky-950/30 px-3 py-2">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-sky-400/90">
                      <span>Workers AI</span>
                      {aiModel && (
                        <span className="normal-case tracking-normal text-slate-500">{aiModel}</span>
                      )}
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-200">
                      {aiExplanation}
                    </pre>
                  </div>
                )}

                {!aiExplanation && !aiError && user && (
                  <p className="text-xs text-slate-500">
                    Click Explain with AI for a prose summary of this blob.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
