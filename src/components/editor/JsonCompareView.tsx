import { useId, useState } from 'react';
import {
  collectDiffPaths,
  diffJson,
  explainDiff,
  formatJsonValue,
  summarizeDiff,
  type DiffEntry,
} from '@/lib/json-diff';
import { isValidJson } from '@/lib/json-utils';
import * as api from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Link } from 'react-router-dom';

type JsonCompareViewProps = {
  initialLeft?: string;
  onBack: () => void;
};

const SAMPLE_LEFT = `{
  "name": "JSON Vault",
  "version": 1,
  "features": ["edit", "share"],
  "owner": {
    "email": "ada@example.com",
    "plan": "free"
  }
}`;

const SAMPLE_RIGHT = `{
  "name": "JSON Vault",
  "version": 2,
  "features": ["edit", "share", "compare"],
  "owner": {
    "email": "ada@example.com",
    "plan": "pro"
  },
  "public": true
}`;

const PLACEHOLDER = 'Enter JSON to compare, or a URL to JSON';

async function resolveInput(raw: string): Promise<{ ok: true; value: unknown; text: string } | { ok: false; error: string }> {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: 'JSON is empty.' };

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const response = await fetch(trimmed);
      if (!response.ok) {
        return { ok: false, error: `Failed to fetch URL (${response.status}).` };
      }
      const text = await response.text();
      const parsed = isValidJson(text);
      if (!parsed.ok) return { ok: false, error: `URL did not return valid JSON: ${parsed.error}` };
      return { ok: true, value: parsed.value, text: formatJsonValue(parsed.value) };
    } catch {
      return { ok: false, error: 'Unable to fetch JSON from URL (network or CORS error).' };
    }
  }

  const parsed = isValidJson(trimmed);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  return { ok: true, value: parsed.value, text: formatJsonValue(parsed.value) };
}

function DiffPanel({
  title,
  value,
  highlightPaths,
  side,
}: {
  title: string;
  value: unknown;
  highlightPaths: Set<string>;
  side: 'left' | 'right';
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950/60">
      <div className="border-b border-slate-800 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        {title}
      </div>
      <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[13px] leading-relaxed text-slate-200">
        <AnnotatedJson value={value} path="" highlightPaths={highlightPaths} side={side} />
      </pre>
    </section>
  );
}

function AnnotatedJson({
  value,
  path,
  highlightPaths,
  side,
  indent = 0,
  isLast = true,
}: {
  value: unknown;
  path: string;
  highlightPaths: Set<string>;
  side: 'left' | 'right';
  indent?: number;
  isLast?: boolean;
}) {
  const pad = '  '.repeat(indent);
  const mark = path && highlightPaths.has(path);
  const tone =
    mark && side === 'left'
      ? 'bg-red-950/50 text-red-300'
      : mark && side === 'right'
        ? 'bg-emerald-950/50 text-emerald-300'
        : '';

  if (value === null || typeof value !== 'object') {
    const literal = JSON.stringify(value);
    return (
      <span className={tone}>
        {literal}
        {!isLast ? ',' : ''}
        {'\n'}
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <span className={tone}>
          []{!isLast ? ',' : ''}
          {'\n'}
        </span>
      );
    }
    return (
      <span className={tone || undefined}>
        {'[\n'}
        {value.map((item, index) => {
          const childPath = path ? `${path}[${index}]` : String(index);
          return (
            <span key={childPath}>
              {pad}{'  '}
              <AnnotatedJson
                value={item}
                path={childPath}
                highlightPaths={highlightPaths}
                side={side}
                indent={indent + 1}
                isLast={index === value.length - 1}
              />
            </span>
          );
        })}
        {pad}]{!isLast ? ',' : ''}
        {'\n'}
      </span>
    );
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return (
      <span className={tone}>
        {'{}'}
        {!isLast ? ',' : ''}
        {'\n'}
      </span>
    );
  }

  return (
    <span className={tone || undefined}>
      {'{\n'}
      {entries.map(([key, child], index) => {
        const childPath = path ? `${path}.${key}` : key;
        const childMark = highlightPaths.has(childPath);
        const keyTone =
          childMark && side === 'left'
            ? 'bg-red-950/50 text-red-300'
            : childMark && side === 'right'
              ? 'bg-emerald-950/50 text-emerald-300'
              : 'text-rose-300';
        return (
          <span key={childPath}>
            {pad}{'  '}
            <span className={keyTone}>"{key}"</span>
            <span className="text-slate-500">: </span>
            <AnnotatedJson
              value={child}
              path={childPath}
              highlightPaths={highlightPaths}
              side={side}
              indent={indent + 1}
              isLast={index === entries.length - 1}
            />
          </span>
        );
      })}
      {pad}
      {'}'}
      {!isLast ? ',' : ''}
      {'\n'}
    </span>
  );
}

function ChangeList({ entries }: { entries: DiffEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-emerald-400">No differences — the JSON documents are equal.</p>;
  }

  return (
    <ul className="space-y-1.5 font-mono text-xs">
      {entries.map((entry) => {
        const color =
          entry.kind === 'added'
            ? 'text-emerald-400'
            : entry.kind === 'removed'
              ? 'text-red-400'
              : 'text-amber-300';
        const label =
          entry.kind === 'added' ? 'added' : entry.kind === 'removed' ? 'removed' : 'changed';
        return (
          <li key={`${entry.kind}:${entry.path}`} className={color}>
            <span className="font-semibold uppercase">{label}</span> {entry.path}
            {entry.kind === 'changed' && (
              <span className="text-slate-400">
                {' '}
                ({JSON.stringify(entry.left)} → {JSON.stringify(entry.right)})
              </span>
            )}
            {entry.kind === 'added' && (
              <span className="text-slate-400"> = {JSON.stringify(entry.right)}</span>
            )}
            {entry.kind === 'removed' && (
              <span className="text-slate-400"> = {JSON.stringify(entry.left)}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ComparePane({
  label,
  value,
  onChange,
  onFile,
  fileInputId,
  fileName,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFile: (file: File | null) => void;
  fileInputId: string;
  fileName: string | null;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={PLACEHOLDER}
        spellCheck={false}
        className="min-h-[280px] flex-1 resize-y rounded-lg border border-slate-600 bg-slate-950/80 p-3 font-mono text-[13px] text-slate-100 outline-none placeholder:text-slate-500 focus:border-brand"
      />
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
        <span>or</span>
        <label
          htmlFor={fileInputId}
          className="cursor-pointer rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-slate-100 hover:bg-slate-700"
        >
          Choose file
        </label>
        <input
          id={fileInputId}
          type="file"
          accept=".json,application/json,text/plain"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            onFile(file);
            e.target.value = '';
          }}
        />
        <span className="truncate text-slate-500">{fileName ?? 'No file chosen'}</span>
      </div>
    </div>
  );
}

export function JsonCompareView({ initialLeft = '', onBack }: JsonCompareViewProps) {
  const leftFileId = useId();
  const rightFileId = useId();
  const user = useAuthStore((state) => state.user);
  const [leftText, setLeftText] = useState(initialLeft);
  const [rightText, setRightText] = useState('');
  const [leftFileName, setLeftFileName] = useState<string | null>(null);
  const [rightFileName, setRightFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<{
    left: unknown;
    right: unknown;
    entries: DiffEntry[];
  } | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function readFile(file: File | null, side: 'left' | 'right') {
    if (!file) return;
    try {
      const text = await file.text();
      if (side === 'left') {
        setLeftText(text);
        setLeftFileName(file.name);
      } else {
        setRightText(text);
        setRightFileName(file.name);
      }
      setResult(null);
      setError(null);
    } catch {
      setError(`Failed to read ${file.name}.`);
    }
  }

  async function handleCompare() {
    setComparing(true);
    setError(null);
    try {
      const [left, right] = await Promise.all([resolveInput(leftText), resolveInput(rightText)]);
      if (!left.ok) {
        setError(`Left: ${left.error}`);
        setResult(null);
        return;
      }
      if (!right.ok) {
        setError(`Right: ${right.error}`);
        setResult(null);
        return;
      }
      setLeftText(left.text);
      setRightText(right.text);
      const entries = diffJson(left.value, right.value);
      setResult({ left: left.value, right: right.value, entries });
      setAiExplanation(null);
      setAiModel(null);
      setAiError(null);
    } finally {
      setComparing(false);
    }
  }

  function loadSample() {
    setLeftText(SAMPLE_LEFT);
    setRightText(SAMPLE_RIGHT);
    setLeftFileName(null);
    setRightFileName(null);
    setResult(null);
    setError(null);
    setAiExplanation(null);
    setAiModel(null);
    setAiError(null);
  }

  async function handleExplainWithAi() {
    if (!result) return;
    if (!user) {
      setAiError('Sign in to use Workers AI explain (uses your free Cloudflare AI quota).');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    try {
      const data = await api.explainDiffWithAi(result.entries);
      setAiExplanation(data.explanation);
      setAiModel(data.model);
    } catch (err) {
      setAiExplanation(null);
      setAiModel(null);
      setAiError(err instanceof Error ? err.message : 'AI explain failed.');
    } finally {
      setAiLoading(false);
    }
  }

  const summary = result ? summarizeDiff(result.entries) : null;
  const paths = result ? collectDiffPaths(result.entries) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 bg-surface px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-slate-700"
        >
          ← Dashboard
        </button>
        <h2 className="text-sm font-semibold text-white">JSON Compare</h2>
        <p className="hidden text-xs text-slate-400 sm:block">
          Semantic diff — object key order does not matter
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <ComparePane
              label="Left"
              value={leftText}
              onChange={(value) => {
                setLeftText(value);
                setLeftFileName(null);
                setResult(null);
                setAiExplanation(null);
                setAiError(null);
              }}
              onFile={(file) => void readFile(file, 'left')}
              fileInputId={leftFileId}
              fileName={leftFileName}
            />

            <div className="flex shrink-0 flex-col items-center justify-center gap-3 py-2 lg:w-36">
              <button
                type="button"
                onClick={() => void handleCompare()}
                disabled={comparing}
                className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60 lg:w-auto"
              >
                {comparing ? 'Comparing…' : 'Compare'}
              </button>
              <p className="text-center text-xs text-slate-400">
                or try some{' '}
                <button type="button" onClick={loadSample} className="text-brand hover:underline">
                  sample data
                </button>
              </p>
            </div>

            <ComparePane
              label="Right"
              value={rightText}
              onChange={(value) => {
                setRightText(value);
                setRightFileName(null);
                setResult(null);
                setAiExplanation(null);
                setAiError(null);
              }}
              onFile={(file) => void readFile(file, 'right')}
              fileInputId={rightFileId}
              fileName={rightFileName}
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          {result && paths && summary && (
            <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/40 p-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium text-white">Diff result</span>
                <span className="text-emerald-400">{summary.added} added</span>
                <span className="text-red-400">{summary.removed} removed</span>
                <span className="text-amber-300">{summary.changed} changed</span>
              </div>

              <div className="rounded-md border border-slate-700 bg-slate-950/70 px-3 py-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Explanation
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleExplainWithAi()}
                    disabled={aiLoading}
                    className="rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-60"
                    title="Uses Cloudflare Workers AI free daily quota"
                  >
                    {aiLoading ? 'Explaining…' : 'Explain with AI'}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-300">
                  {explainDiff(result.entries)}
                </pre>

                {!user && (
                  <p className="mt-3 text-xs text-slate-500">
                    <Link to="/login" className="text-brand hover:underline">
                      Sign in
                    </Link>{' '}
                    to generate a richer AI explanation (Cloudflare Workers AI free tier).
                  </p>
                )}

                {aiError && (
                  <p className="mt-3 rounded border border-red-900/60 bg-red-950/40 px-2.5 py-2 text-xs text-red-300">
                    {aiError}
                  </p>
                )}

                {aiExplanation && (
                  <div className="mt-3 rounded-md border border-sky-900/50 bg-sky-950/30 px-3 py-2">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-sky-400/90">
                      <span>AI explanation</span>
                      {aiModel && (
                        <span className="normal-case tracking-normal text-slate-500">{aiModel}</span>
                      )}
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-200">
                      {aiExplanation}
                    </pre>
                  </div>
                )}
              </div>

              <ChangeList entries={result.entries} />

              <div className="grid min-h-[240px] grid-cols-1 gap-3 md:grid-cols-2">
                <DiffPanel title="Left" value={result.left} highlightPaths={paths.left} side="left" />
                <DiffPanel
                  title="Right"
                  value={result.right}
                  highlightPaths={paths.right}
                  side="right"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
