import { describe, expect, it } from 'vitest';
import { outlineJson } from '@/lib/json-outline';

describe('outlineJson', () => {
  it('summarizes a plain object', () => {
    const outline = outlineJson({
      userDetails: { name: 'Ada', id: 1 },
      tags: ['a', 'b'],
    });
    expect(outline.rootType).toBe('object');
    expect(outline.summary).toMatch(/2 top-level/);
    expect(outline.topLevelKeys).toEqual(['userDetails', 'tags']);
    expect(outline.paths.some((p) => p.startsWith('userDetails'))).toBe(true);
    expect(outline.paths.some((p) => p.startsWith('tags'))).toBe(true);
  });

  it('summarizes an array root', () => {
    const outline = outlineJson([{ id: 1 }, { id: 2 }]);
    expect(outline.rootType).toBe('array(2)');
    expect(outline.summary).toMatch(/2 item/);
    expect(outline.paths[0]).toMatch(/array\(2\)/);
  });

  it('handles primitives', () => {
    const outline = outlineJson('hello');
    expect(outline.rootType).toBe('string');
    expect(outline.paths[0]).toMatch(/hello/);
  });
});
