import { describe, expect, it } from 'vitest';
import { byteSize, formatJson, isValidJson } from '@/lib/json-utils';

describe('json-utils', () => {
  it('validates JSON', () => {
    expect(isValidJson('{"a":1}').ok).toBe(true);
    expect(isValidJson('{').ok).toBe(false);
  });

  it('formats JSON', () => {
    expect(formatJson('{"a":1}')).toContain('\n');
  });

  it('measures bytes', () => {
    expect(byteSize('abc')).toBe(3);
  });
});
