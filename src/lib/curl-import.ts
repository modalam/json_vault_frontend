import {
  createId,
  createRow,
  type Collection,
  type HttpMethod,
  type KeyValueRow,
  type SavedRequest,
} from '@/lib/request-workspace';
import type { ImportResult } from '@/lib/request-import';

const METHODS = new Set<HttpMethod>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

export type CurlParseResult =
  | { ok: true; request: SavedRequest }
  | { ok: false; error: string };

/** Normalize multiline curl (backslash continuations) into a single line. */
export function normalizeCurlText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\\\s*\n/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}

/**
 * Tokenize a curl command into argv-style tokens.
 * Supports single quotes, double quotes, and basic escapes inside double quotes.
 */
export function tokenizeCurl(command: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let i = 0;
  let quote: '"' | "'" | null = null;

  while (i < command.length) {
    const char = command[i]!;

    if (quote === "'") {
      if (char === "'") quote = null;
      else current += char;
      i += 1;
      continue;
    }

    if (quote === '"') {
      if (char === '\\' && i + 1 < command.length) {
        current += command[i + 1]!;
        i += 2;
        continue;
      }
      if (char === '"') {
        quote = null;
        i += 1;
        continue;
      }
      current += char;
      i += 1;
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      i += 1;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      i += 1;
      continue;
    }

    if (char === '\\' && i + 1 < command.length) {
      current += command[i + 1]!;
      i += 2;
      continue;
    }

    current += char;
    i += 1;
  }

  if (current) tokens.push(current);
  return tokens;
}

function looksLikeUrl(token: string): boolean {
  return /^(https?:\/\/|{{)/i.test(token) || token.startsWith('/');
}

function parseHeaderLine(line: string): { key: string; value: string } | null {
  const idx = line.indexOf(':');
  if (idx <= 0) return null;
  return {
    key: line.slice(0, idx).trim(),
    value: line.slice(idx + 1).trim(),
  };
}

function splitUrlAndQuery(rawUrl: string): { url: string; queryParams: KeyValueRow[] } {
  try {
    // Support {{baseUrl}}/path?x=1 — parse query from first ?
    const qIndex = rawUrl.indexOf('?');
    if (qIndex === -1) return { url: rawUrl, queryParams: [createRow()] };

    const base = rawUrl.slice(0, qIndex);
    const query = rawUrl.slice(qIndex + 1);
    const params: KeyValueRow[] = [];
    for (const part of query.split('&')) {
      if (!part) continue;
      const eq = part.indexOf('=');
      if (eq === -1) {
        params.push(createRow(decodeURIComponentSafe(part), ''));
      } else {
        params.push(
          createRow(
            decodeURIComponentSafe(part.slice(0, eq)),
            decodeURIComponentSafe(part.slice(eq + 1)),
          ),
        );
      }
    }
    return {
      url: base,
      queryParams: params.length > 0 ? params : [createRow()],
    };
  } catch {
    return { url: rawUrl, queryParams: [createRow()] };
  }
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function inferName(url: string, method: HttpMethod): string {
  try {
    if (/^https?:\/\//i.test(url)) {
      const parsed = new URL(url);
      const path = parsed.pathname === '/' ? parsed.host : parsed.pathname;
      return `${method} ${path}`.slice(0, 80);
    }
  } catch {
    // ignore
  }
  const short = url.replace(/\?.*$/, '').slice(0, 60);
  return short ? `${method} ${short}` : `${method} request`;
}

function basicAuthHeader(userPass: string): KeyValueRow {
  try {
    const encoded = btoa(userPass);
    return createRow('Authorization', `Basic ${encoded}`);
  } catch {
    // Non-Latin1 user:pass — keep raw hint for the user to fix.
    return createRow('Authorization', `Basic (encode ${userPass})`);
  }
}

function isJsonBody(body: string, headers: KeyValueRow[]): boolean {
  const contentType = headers.find((h) => h.key.toLowerCase() === 'content-type')?.value ?? '';
  if (/json/i.test(contentType)) return true;
  const trimmed = body.trim();
  return (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  );
}

/**
 * Parse a curl command into a SavedRequest.
 */
export function parseCurl(raw: string): CurlParseResult {
  const normalized = normalizeCurlText(raw);
  if (!normalized) return { ok: false, error: 'Paste a curl command to import.' };

  let tokens = tokenizeCurl(normalized);
  if (tokens.length === 0) return { ok: false, error: 'Could not parse the curl command.' };

  // Allow pasting without the word "curl"
  if (tokens[0]?.toLowerCase() === 'curl') {
    tokens = tokens.slice(1);
  }

  if (tokens.length === 0) {
    return { ok: false, error: 'curl command has no URL or options.' };
  }

  let method: HttpMethod | null = null;
  let url = '';
  const headers: KeyValueRow[] = [];
  const dataParts: string[] = [];
  let forceGet = false;
  let userAgent: string | null = null;
  let cookie: string | null = null;
  let referer: string | null = null;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]!;
    const next = () => {
      i += 1;
      return tokens[i];
    };

    if (token === '-X' || token === '--request') {
      const value = next();
      if (!value) return { ok: false, error: `${token} requires a method.` };
      const upper = value.toUpperCase() as HttpMethod;
      method = METHODS.has(upper) ? upper : 'GET';
      continue;
    }

    if (token.startsWith('-X') && token.length > 2 && !token.startsWith('--')) {
      const upper = token.slice(2).toUpperCase() as HttpMethod;
      method = METHODS.has(upper) ? upper : 'GET';
      continue;
    }

    if (token === '-H' || token === '--header') {
      const value = next();
      if (!value) return { ok: false, error: `${token} requires a header.` };
      const parsed = parseHeaderLine(value);
      if (parsed) headers.push(createRow(parsed.key, parsed.value));
      continue;
    }

    if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary' ||
      token === '--data-urlencode'
    ) {
      const value = next();
      if (value === undefined) return { ok: false, error: `${token} requires a value.` };
      dataParts.push(value);
      continue;
    }

    if (token.startsWith('--data-urlencode=') || token.startsWith('--data=') || token.startsWith('--data-raw=')) {
      dataParts.push(token.slice(token.indexOf('=') + 1));
      continue;
    }

    if (token === '-u' || token === '--user') {
      const value = next();
      if (!value) return { ok: false, error: `${token} requires user:password.` };
      headers.push(basicAuthHeader(value));
      continue;
    }

    if (token === '-A' || token === '--user-agent') {
      userAgent = next() ?? null;
      continue;
    }

    if (token === '-b' || token === '--cookie') {
      cookie = next() ?? null;
      continue;
    }

    if (token === '-e' || token === '--referer') {
      referer = next() ?? null;
      continue;
    }

    if (token === '-G' || token === '--get') {
      forceGet = true;
      continue;
    }

    // Ignore common no-arg / boolean flags
    if (
      token === '-s' ||
      token === '--silent' ||
      token === '-S' ||
      token === '--show-error' ||
      token === '-L' ||
      token === '--location' ||
      token === '-k' ||
      token === '--insecure' ||
      token === '-i' ||
      token === '--include' ||
      token === '-v' ||
      token === '--verbose' ||
      token === '-#' ||
      token === '--progress-bar' ||
      token === '--compressed' ||
      token === '-N' ||
      token === '--no-buffer'
    ) {
      continue;
    }

    // Ignore flags that take a value we don't map yet
    if (
      token === '-o' ||
      token === '--output' ||
      token === '-w' ||
      token === '--write-out' ||
      token === '--connect-timeout' ||
      token === '--max-time' ||
      token === '-m' ||
      token === '--proxy' ||
      token === '-x' ||
      token === '--cacert' ||
      token === '--cert' ||
      token === '--key'
    ) {
      next();
      continue;
    }

    if (token.startsWith('-')) {
      // Unknown short/long option — skip optional value if next doesn't look like URL
      const maybe = tokens[i + 1];
      if (maybe && !maybe.startsWith('-') && !looksLikeUrl(maybe) && !url) {
        // could be value for unknown flag
        i += 1;
      }
      continue;
    }

    if (!url && looksLikeUrl(token)) {
      url = token.replace(/^['"]|['"]$/g, '');
      continue;
    }

    // Bare host without scheme
    if (!url && /^[\w.-]+\.\w{2,}([/:].*)?$/.test(token)) {
      url = `https://${token}`;
    }
  }

  if (!url) {
    return { ok: false, error: 'No URL found in the curl command.' };
  }

  if (userAgent) headers.push(createRow('User-Agent', userAgent));
  if (cookie) headers.push(createRow('Cookie', cookie));
  if (referer) headers.push(createRow('Referer', referer));

  const bodyText = dataParts.join('&');
  let resolvedMethod: HttpMethod = method ?? (bodyText ? 'POST' : 'GET');
  if (forceGet) resolvedMethod = 'GET';

  let finalUrl = url;
  let queryParams = [createRow()];
  let body = '{\n  \n}\n';
  let bodyMode: SavedRequest['bodyMode'] = 'none';
  let rawLanguage: SavedRequest['rawLanguage'] = 'JSON';

  if (forceGet && bodyText) {
    const joiner = finalUrl.includes('?') ? '&' : '?';
    finalUrl = `${finalUrl}${joiner}${bodyText}`;
    const split = splitUrlAndQuery(finalUrl);
    finalUrl = split.url;
    queryParams = split.queryParams;
  } else {
    const split = splitUrlAndQuery(finalUrl);
    finalUrl = split.url;
    queryParams = split.queryParams;

    if (bodyText) {
      bodyMode = 'raw';
      if (isJsonBody(bodyText, headers)) {
        rawLanguage = 'JSON';
        try {
          body = JSON.stringify(JSON.parse(bodyText), null, 2);
        } catch {
          body = bodyText;
          rawLanguage = 'Text';
        }
      } else {
        rawLanguage = 'Text';
        body = bodyText;
        const hasContentType = headers.some((h) => h.key.toLowerCase() === 'content-type');
        if (!hasContentType && bodyText.includes('=') && !bodyText.trim().startsWith('{')) {
          headers.push(createRow('Content-Type', 'application/x-www-form-urlencoded'));
        }
      }
    }
  }

  if (headers.length === 0) {
    headers.push(createRow('Accept', 'application/json'));
  }

  const request: SavedRequest = {
    id: createId(),
    name: inferName(url, resolvedMethod),
    method: resolvedMethod,
    url: finalUrl,
    headers,
    queryParams,
    body,
    bodyMode,
    rawLanguage,
  };

  return { ok: true, request };
}

/** Build an ImportResult collection from one or more curl commands (separated by blank lines). */
export function importCurlText(raw: string): ImportResult {
  const result: ImportResult = { collections: [], environments: [], errors: [] };
  const chunks = raw
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const sources = chunks.length > 0 ? chunks : [raw.trim()];
  const requests: SavedRequest[] = [];

  for (const chunk of sources) {
    if (!/curl/i.test(chunk) && !looksLikeUrl(tokenizeCurl(normalizeCurlText(chunk))[0] ?? '')) {
      // Still try — user may paste without "curl"
    }
    const parsed = parseCurl(chunk);
    if (!parsed.ok) {
      result.errors.push(parsed.error);
      continue;
    }
    requests.push(parsed.request);
  }

  if (requests.length === 0) {
    if (result.errors.length === 0) {
      result.errors.push('No valid curl command found.');
    }
    return result;
  }

  const collection: Collection = {
    id: createId(),
    name: requests.length === 1 ? 'cURL Import' : `cURL Import (${requests.length})`,
    requests,
  };
  result.collections.push(collection);
  return result;
}
