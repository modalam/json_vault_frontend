import { describe, expect, it } from 'vitest';
import { importCurlText, normalizeCurlText, parseCurl, tokenizeCurl } from '@/lib/curl-import';

describe('curl-import', () => {
  it('tokenizes quoted arguments', () => {
    expect(tokenizeCurl(`curl -H 'Accept: application/json' "https://api.example.com"`)).toEqual([
      'curl',
      '-H',
      'Accept: application/json',
      'https://api.example.com',
    ]);
  });

  it('parses a GET with headers and query', () => {
    const result = parseCurl(`
      curl -X GET 'https://api.example.com/users?page=1&limit=10' \\
        -H 'Accept: application/json' \\
        -H 'Authorization: Bearer tok_abc'
    `);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.method).toBe('GET');
    expect(result.request.url).toBe('https://api.example.com/users');
    expect(result.request.queryParams.map((r) => `${r.key}=${r.value}`)).toEqual(
      expect.arrayContaining(['page=1', 'limit=10']),
    );
    expect(result.request.headers.some((h) => h.key === 'Authorization')).toBe(true);
    expect(result.request.bodyMode).toBe('none');
  });

  it('parses POST JSON body and defaults method to POST when -d is used', () => {
    const result = parseCurl(
      `curl https://api.example.com/users -H 'Content-Type: application/json' -d '{"name":"Ada"}'`,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.method).toBe('POST');
    expect(result.request.bodyMode).toBe('raw');
    expect(result.request.rawLanguage).toBe('JSON');
    expect(result.request.body).toContain('"name"');
    expect(result.request.body).toContain('Ada');
  });

  it('supports -G to move data into query string', () => {
    const result = parseCurl(`curl -G https://api.example.com/search -d 'q=json' -d 'page=1'`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.method).toBe('GET');
    expect(result.request.bodyMode).toBe('none');
    expect(result.request.url).toBe('https://api.example.com/search');
    expect(result.request.queryParams.some((r) => r.key === 'q' && r.value === 'json')).toBe(true);
  });

  it('normalizes backslash continuations', () => {
    expect(normalizeCurlText('curl \\\n https://x.test')).toContain('https://x.test');
  });

  it('importCurlText builds a collection', () => {
    const imported = importCurlText(
      `curl -X POST https://httpbin.org/post -H 'Content-Type: application/json' -d '{"ok":true}'`,
    );
    expect(imported.errors).toEqual([]);
    expect(imported.collections).toHaveLength(1);
    expect(imported.collections[0]?.requests).toHaveLength(1);
    expect(imported.collections[0]?.requests[0]?.method).toBe('POST');
  });

  it('returns a clear error when URL is missing', () => {
    const result = parseCurl('curl -H "Accept: application/json"');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/URL/i);
  });
});
