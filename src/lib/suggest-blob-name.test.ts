import { describe, expect, it } from 'vitest';
import {
  sanitizeBlobName,
  shouldAutoSuggestName,
  suggestBlobName,
} from '@/lib/suggest-blob-name';

describe('suggestBlobName', () => {
  it('uses root title-like string fields', () => {
    expect(suggestBlobName({ name: 'companyList', items: [1] })).toBe('companyList');
    expect(suggestBlobName({ title: 'Referral List' })).toBe('referralList');
  });

  it('names arrays of objects from domain keys', () => {
    expect(
      suggestBlobName({
        status: 1000,
        data: [{ cmp_id: 1, comp_name: 'rapo' }, { cmp_id: 2, comp_name: 'sudha' }],
      }),
    ).toBe('companies');
  });

  it('names root arrays', () => {
    expect(suggestBlobName([{ user_id: 1 }, { user_id: 2 }])).toMatch(/user/i);
    expect(suggestBlobName([])).toBe('emptyList');
  });

  it('handles empty object and primitives', () => {
    expect(suggestBlobName({})).toBe('emptyObject');
    expect(suggestBlobName(null)).toBe('nullValue');
  });

  it('sanitizes names', () => {
    expect(sanitizeBlobName('Hello World!')).toBe('helloWorld');
  });

  it('detects placeholder names for auto-suggest', () => {
    expect(shouldAutoSuggestName('')).toBe(true);
    expect(shouldAutoSuggestName('Untitled blob')).toBe(true);
    expect(shouldAutoSuggestName('companyList')).toBe(false);
  });
});
