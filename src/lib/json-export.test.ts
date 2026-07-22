import { describe, expect, it } from 'vitest';
import {
  exportFromJson,
  formatJsonSchema,
  formatTypeScript,
  inferJsonSchema,
  mergeSchemas,
} from '@/lib/json-export';

describe('json-export', () => {
  it('infers object schema with required keys', () => {
    const schema = inferJsonSchema({ name: 'Ada', age: 30, active: true });
    expect(schema.type).toBe('object');
    expect(schema.required).toEqual(['active', 'age', 'name']);
    expect(schema.properties?.age?.type).toBe('integer');
    expect(schema.properties?.name?.type).toBe('string');
    expect(schema.properties?.active?.type).toBe('boolean');
  });

  it('infers array item schemas and merges object keys', () => {
    const schema = inferJsonSchema([
      { id: 1, name: 'a' },
      { id: 2, role: 'admin' },
    ]);
    expect(schema.type).toBe('array');
    expect(schema.items?.type).toBe('object');
    expect(schema.items?.properties?.id?.type).toBe('integer');
    expect(schema.items?.required).toEqual(['id']);
    expect(schema.items?.properties?.name?.type).toBe('string');
    expect(schema.items?.properties?.role?.type).toBe('string');
  });

  it('merges nullability across array items', () => {
    const merged = mergeSchemas({ type: 'string' }, { type: 'null' });
    expect(merged.type).toEqual(['null', 'string']);
  });

  it('formats typescript interface from object', () => {
    const ts = formatTypeScript({ name: 'Ada', tags: ['x'] }, 'User');
    expect(ts).toContain('export interface User');
    expect(ts).toContain('name: string;');
    expect(ts).toContain('tags: string[];');
  });

  it('formats typescript for root arrays', () => {
    const ts = formatTypeScript([{ id: 1 }], 'ItemList');
    expect(ts).toContain('export type ItemList');
    expect(ts).toContain('id: number');
  });

  it('exportFromJson switches formats', () => {
    const value = { ok: true };
    expect(JSON.parse(exportFromJson(value, 'schema'))).toMatchObject({
      type: 'object',
      properties: { ok: { type: 'boolean' } },
    });
    expect(exportFromJson(value, 'typescript', 'Flag')).toContain('interface Flag');
  });

  it('formatJsonSchema is valid JSON text', () => {
    const text = formatJsonSchema({ a: 1 }, 'Sample');
    expect(JSON.parse(text).title).toBe('Sample');
  });
});
