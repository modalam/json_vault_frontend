import { describe, expect, it } from 'vitest';
import { diffJson, summarizeDiff } from '@/lib/json-diff';

describe('json-diff', () => {
  it('returns empty when objects are semantically equal', () => {
    expect(diffJson({ b: 1, a: 2 }, { a: 2, b: 1 })).toEqual([]);
  });

  it('detects added, removed, and changed fields', () => {
    const entries = diffJson(
      { name: 'Ada', age: 30, city: 'London' },
      { name: 'Ada', age: 31, country: 'UK' },
    );

    expect(entries).toEqual(
      expect.arrayContaining([
        { path: 'age', kind: 'changed', left: 30, right: 31 },
        { path: 'city', kind: 'removed', left: 'London' },
        { path: 'country', kind: 'added', right: 'UK' },
      ]),
    );
    expect(summarizeDiff(entries)).toEqual({ added: 1, removed: 1, changed: 1 });
  });

  it('diffs nested objects and arrays by path', () => {
    const entries = diffJson(
      { users: [{ id: 1, role: 'admin' }, { id: 2 }] },
      { users: [{ id: 1, role: 'editor' }] },
    );

    expect(entries).toEqual(
      expect.arrayContaining([
        { path: 'users[0].role', kind: 'changed', left: 'admin', right: 'editor' },
        { path: 'users[1]', kind: 'removed', left: { id: 2 } },
      ]),
    );
  });
});
