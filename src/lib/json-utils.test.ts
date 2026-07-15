import { describe, expect, it } from 'vitest';
import { byteSize, compactJson, formatJson, isValidJson, repairJson, sortJson } from '@/lib/json-utils';

describe('json-utils', () => {
  it('validates JSON', () => {
    expect(isValidJson('{"a":1}').ok).toBe(true);
    expect(isValidJson('{').ok).toBe(false);
  });

  it('formats JSON', () => {
    expect(formatJson('{"a":1}')).toContain('\n');
  });

  it('compacts JSON', () => {
    expect(compactJson('{\n  "a": 1\n}')).toBe('{"a":1}');
  });

  it('sorts object keys recursively without sorting arrays', () => {
    expect(sortJson('{"z":{"b":1,"a":2},"a":[{"d":1,"c":2}]}')).toBe(
      '{\n  "a": [\n    {\n      "c": 2,\n      "d": 1\n    }\n  ],\n  "z": {\n    "a": 2,\n    "b": 1\n  }\n}',
    );
  });

  it('repairs comments and trailing commas without touching strings', () => {
    expect(repairJson('{\n // note\n "url": "https://example.com",\n "items": [1,],\n}')).toBe(
      '{\n  "url": "https://example.com",\n  "items": [\n    1\n  ]\n}',
    );
  });

  it('measures bytes', () => {
    expect(byteSize('abc')).toBe(3);
  });
});
