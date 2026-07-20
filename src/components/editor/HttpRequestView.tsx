import { useMemo, useState } from 'react';
import { JsonViewer } from '@/components/editor/JsonViewer';
import { formatJson, isValidJson } from '@/lib/json-utils';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

type KeyValueRow = {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
};

type ResponseTab = 'body' | 'headers';
type BodyMode = 'none' | 'raw';
type RawLanguage = 'JSON' | 'Text';

type RequestResult = {
  status: number;
  statusText: string;
  ok: boolean;
  headers: Array<{ key: string; value: string }>;
  body: string;
  durationMs: number;
  sizeBytes: number;
};

type HttpRequestViewProps = {
  initialBody?: string;
  onBack: () => void;
};

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const BODY_METHODS = new Set<HttpMethod>(['POST', 'PUT', 'PATCH', 'DELETE']);
const CONTENT_TYPE_BY_RAW: Record<RawLanguage, string> = {
  JSON: 'application/json',
  Text: 'text/plain',
};

function createRow(key = '', value = ''): KeyValueRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    enabled: true,
    key,
    value,
  };
}

function rowsToRecord(rows: KeyValueRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (!row.enabled) continue;
    const key = row.key.trim();
    if (!key) continue;
    out[key] = row.value;
  }
  return out;
}

function upsertHeader(rows: KeyValueRow[], key: string, value: string): KeyValueRow[] {
  const lower = key.toLowerCase();
  const existing = rows.find((row) => row.key.trim().toLowerCase() === lower);
  if (existing) {
    return rows.map((row) =>
      row.id === existing.id ? { ...row, enabled: true, key, value } : row,
    );
  }
  return [...rows, createRow(key, value)];
}

function removeHeader(rows: KeyValueRow[], key: string): KeyValueRow[] {
  const lower = key.toLowerCase();
  const next = rows.filter((row) => row.key.trim().toLowerCase() !== lower);
  return next.length > 0 ? next : [createRow()];
}

function buildUrl(rawUrl: string, queryRows: KeyValueRow[]): string {
  const trimmed = rawUrl.trim();
  const url = new URL(trimmed);
  for (const row of queryRows) {
    if (!row.enabled) continue;
    const key = row.key.trim();
    if (!key) continue;
    url.searchParams.set(key, row.value);
  }
  return url.toString();
}

function prettyBody(raw: string, contentType: string | null): string {
  if (!raw) return '';
  if (contentType?.includes('application/json') || isValidJson(raw).ok) {
    try {
      return formatJson(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

function statusTone(status: number): string {
  if (status >= 200 && status < 300) return 'text-emerald-400';
  if (status >= 300 && status < 400) return 'text-amber-300';
  if (status >= 400) return 'text-red-400';
  return 'text-slate-300';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function KeyValueEditor({
  title,
  rows,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
}: {
  title: string;
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
}) {
  function updateRow(id: string, patch: Partial<KeyValueRow>) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    onChange(rows.length <= 1 ? [createRow()] : rows.filter((row) => row.id !== id));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">{title}</h3>
        <button
          type="button"
          onClick={() => onChange([...rows, createRow()])}
          className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
        >
          Add
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={row.enabled}
              onChange={(e) => updateRow(row.id, { enabled: e.target.checked })}
              className="h-4 w-4 accent-brand"
              aria-label={`Enable ${title.slice(0, -1).toLowerCase()}`}
            />
            <input
              value={row.key}
              onChange={(e) => updateRow(row.id, { key: e.target.value })}
              placeholder={keyPlaceholder}
              className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-brand"
            />
            <input
              value={row.value}
              onChange={(e) => updateRow(row.id, { value: e.target.value })}
              placeholder={valuePlaceholder}
              className="min-w-0 flex-[1.4] rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              className="rounded px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              aria-label="Remove row"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HttpRequestView({ initialBody = '', onBack }: HttpRequestViewProps) {
  const [method, setMethod] = useState<HttpMethod>('POST');
  const [url, setUrl] = useState('https://httpbin.org/post');
  const [headers, setHeaders] = useState<KeyValueRow[]>([
    createRow('Content-Type', 'application/json'),
    createRow('Accept', 'application/json'),
  ]);
  const [queryParams, setQueryParams] = useState<KeyValueRow[]>([createRow()]);
  const [body, setBody] = useState(initialBody.trim() ? initialBody : '{\n  \n}\n');
  const [bodyMode, setBodyMode] = useState<BodyMode>('raw');
  const [rawLanguage, setRawLanguage] = useState<RawLanguage>('JSON');
  const [bodyMessage, setBodyMessage] = useState<string | null>(null);
  const [requestTab, setRequestTab] = useState<'params' | 'headers' | 'body'>('body');
  const [responseTab, setResponseTab] = useState<ResponseTab>('body');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RequestResult | null>(null);

  const supportsBody = BODY_METHODS.has(method);

  const activeRequestTab = !supportsBody && requestTab === 'body' ? 'headers' : requestTab;

  function applyBodyMode(mode: BodyMode) {
    setBodyMode(mode);
    setBodyMessage(null);
    if (mode === 'none') {
      setHeaders((rows) => removeHeader(rows, 'Content-Type'));
      return;
    }
    setRawLanguage('JSON');
    setHeaders((rows) => upsertHeader(rows, 'Content-Type', CONTENT_TYPE_BY_RAW.JSON));
  }

  function applyRawLanguage(language: RawLanguage) {
    setRawLanguage(language);
    setBodyMessage(null);
    setHeaders((rows) => upsertHeader(rows, 'Content-Type', CONTENT_TYPE_BY_RAW[language]));
  }

  function handleBeautify() {
    if (rawLanguage !== 'JSON') {
      setBodyMessage('Beautify is available for JSON only.');
      return;
    }
    try {
      setBody(formatJson(body));
      setBodyMessage(null);
    } catch {
      setBodyMessage('Cannot beautify invalid JSON.');
    }
  }

  const previewUrl = useMemo(() => {
    try {
      return buildUrl(url, queryParams);
    } catch {
      return url;
    }
  }, [url, queryParams]);

  async function handleSend() {
    setSending(true);
    setError(null);
    setResult(null);

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Enter a request URL.');
      setSending(false);
      return;
    }

    let finalUrl: string;
    try {
      finalUrl = buildUrl(trimmedUrl, queryParams);
    } catch {
      setError('Enter a valid URL (including https://).');
      setSending(false);
      return;
    }

    const headerMap = rowsToRecord(headers);
    const init: RequestInit = {
      method,
      headers: headerMap,
    };

    if (supportsBody && bodyMode === 'raw' && body.trim()) {
      init.body = body;
    }

    const started = performance.now();
    try {
      const response = await fetch(finalUrl, init);
      const durationMs = Math.round(performance.now() - started);
      const responseHeaders = [...response.headers.entries()].map(([key, value]) => ({
        key,
        value,
      }));
      const rawBody = method === 'HEAD' ? '' : await response.text();
      const contentType = response.headers.get('content-type');
      const pretty = prettyBody(rawBody, contentType);

      setResult({
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: responseHeaders,
        body: pretty,
        durationMs,
        sizeBytes: new TextEncoder().encode(rawBody).byteLength,
      });
      setResponseTab('body');
    } catch (err) {
      const message =
        err instanceof TypeError
          ? 'Request failed — the endpoint may block browser CORS, or the network is unavailable.'
          : err instanceof Error
            ? err.message
            : 'Request failed.';
      setError(message);
    } finally {
      setSending(false);
    }
  }

  function loadFromEditor() {
    setBodyMode('raw');
    setRawLanguage('JSON');
    setHeaders((rows) => upsertHeader(rows, 'Content-Type', CONTENT_TYPE_BY_RAW.JSON));
    setBody(initialBody.trim() ? initialBody : '{\n  \n}\n');
    setBodyMessage(null);
    setRequestTab('body');
  }

  const tabBtn = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm transition ${
      active
        ? 'bg-slate-700 text-white'
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 bg-surface px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-slate-700"
        >
          ← Back to editor
        </button>
        <h2 className="text-sm font-semibold text-white">HTTP Request</h2>
        <p className="hidden text-xs text-slate-400 sm:block">
          Send the current JSON as an API request (Postman-style)
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100 outline-none focus:border-brand"
              aria-label="HTTP method"
            >
              {METHODS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/endpoint"
              className="min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending}
              className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>

          <p className="truncate font-mono text-xs text-slate-500" title={previewUrl}>
            {previewUrl || 'Enter a URL to preview the final request'}
          </p>

          <div className="rounded-lg border border-slate-700 bg-slate-900/40">
            <div className="flex flex-wrap items-center gap-1 border-b border-slate-700 px-2 py-2">
              <button
                type="button"
                className={tabBtn(activeRequestTab === 'params')}
                onClick={() => setRequestTab('params')}
              >
                Params
              </button>
              <button
                type="button"
                className={tabBtn(activeRequestTab === 'headers')}
                onClick={() => setRequestTab('headers')}
              >
                Headers
              </button>
              <button
                type="button"
                className={tabBtn(activeRequestTab === 'body')}
                onClick={() => setRequestTab('body')}
                disabled={!supportsBody}
              >
                Body
              </button>
              {supportsBody && (
                <button
                  type="button"
                  onClick={loadFromEditor}
                  className="ml-auto rounded-md px-3 py-1.5 text-xs text-brand hover:underline"
                >
                  Use editor JSON
                </button>
              )}
            </div>

            <div className="p-3">
              {activeRequestTab === 'params' && (
                <KeyValueEditor
                  title="Query params"
                  rows={queryParams}
                  onChange={setQueryParams}
                  keyPlaceholder="Key"
                  valuePlaceholder="Value"
                />
              )}
              {activeRequestTab === 'headers' && (
                <KeyValueEditor
                  title="Headers"
                  rows={headers}
                  onChange={setHeaders}
                  keyPlaceholder="Header"
                  valuePlaceholder="Value"
                />
              )}
              {activeRequestTab === 'body' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="radio"
                        name="body-mode"
                        checked={bodyMode === 'none'}
                        onChange={() => applyBodyMode('none')}
                        className="accent-brand"
                      />
                      none
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="radio"
                        name="body-mode"
                        checked={bodyMode === 'raw'}
                        onChange={() => applyBodyMode('raw')}
                        className="accent-brand"
                      />
                      raw
                    </label>
                    {bodyMode === 'raw' && (
                      <select
                        value={rawLanguage}
                        onChange={(e) => applyRawLanguage(e.target.value as RawLanguage)}
                        className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-brand outline-none focus:border-brand"
                        aria-label="Raw body language"
                      >
                        <option value="JSON">JSON</option>
                        <option value="Text">Text</option>
                      </select>
                    )}
                    {bodyMode === 'raw' && (
                      <button
                        type="button"
                        onClick={handleBeautify}
                        className="ml-auto text-sm text-brand hover:underline"
                      >
                        Beautify
                      </button>
                    )}
                  </div>

                  {bodyMode === 'none' ? (
                    <p className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-8 text-center text-sm text-slate-400">
                      This request does not have a body
                    </p>
                  ) : (
                    <textarea
                      value={body}
                      onChange={(e) => {
                        setBody(e.target.value);
                        setBodyMessage(null);
                      }}
                      spellCheck={false}
                      className="min-h-[220px] w-full resize-y rounded-md border border-slate-600 bg-slate-950 p-3 font-mono text-[13px] text-slate-100 outline-none focus:border-brand"
                      placeholder={
                        rawLanguage === 'JSON' ? '{\n  "key": "value"\n}' : 'Enter raw request body'
                      }
                    />
                  )}

                  {bodyMessage && <p className="text-sm text-amber-300">{bodyMessage}</p>}
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          {result && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/40">
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-700 px-3 py-2 text-sm">
                <span className="font-medium text-white">Response</span>
                <span className={`font-mono font-semibold ${statusTone(result.status)}`}>
                  {result.status} {result.statusText}
                </span>
                <span className="text-slate-400">{result.durationMs} ms</span>
                <span className="text-slate-400">{formatBytes(result.sizeBytes)}</span>
              </div>

              <div className="flex gap-1 border-b border-slate-700 px-2 py-2">
                <button
                  type="button"
                  className={tabBtn(responseTab === 'body')}
                  onClick={() => setResponseTab('body')}
                >
                  Body
                </button>
                <button
                  type="button"
                  className={tabBtn(responseTab === 'headers')}
                  onClick={() => setResponseTab('headers')}
                >
                  Headers ({result.headers.length})
                </button>
              </div>

              <div className="p-3">
                {responseTab === 'body' ? (
                  result.body ? (
                    isValidJson(result.body).ok ? (
                      <JsonViewer value={result.body} />
                    ) : (
                      <pre className="max-h-[360px] overflow-auto rounded-md border border-slate-800 bg-slate-950/80 p-3 font-mono text-[13px] text-slate-200 whitespace-pre-wrap">
                        {result.body}
                      </pre>
                    )
                  ) : (
                    <p className="rounded-md border border-slate-800 bg-slate-950/80 px-3 py-6 text-center text-sm text-slate-400">
                      (empty body)
                    </p>
                  )
                ) : (
                  <ul className="space-y-1.5 font-mono text-xs text-slate-300">
                    {result.headers.length === 0 ? (
                      <li className="text-slate-500">No response headers.</li>
                    ) : (
                      result.headers.map((header) => (
                        <li key={`${header.key}:${header.value}`}>
                          <span className="text-rose-300">{header.key}</span>
                          <span className="text-slate-500">: </span>
                          <span>{header.value}</span>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500">
            Requests run in your browser. Some APIs block cross-origin calls (CORS); use endpoints
            that allow browser access, or a local/dev proxy.
          </p>
        </div>
      </div>
    </div>
  );
}
