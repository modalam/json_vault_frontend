import { describe, expect, it } from 'vitest';
import { mergeImportIntoWorkspace, parseImportFile } from '@/lib/request-import';

const POSTMAN_COLLECTION = JSON.stringify({
  info: { name: 'API Tests' },
  item: [
    {
      name: 'Users',
      item: [
        {
          name: 'List users',
          request: {
            method: 'GET',
            header: [{ key: 'Accept', value: 'application/json' }],
            url: {
              raw: 'https://api.example.com/users?page=1',
              query: [{ key: 'page', value: '1' }],
            },
          },
        },
      ],
    },
    {
      name: 'Create user',
      request: {
        method: 'POST',
        header: [{ key: 'Content-Type', value: 'application/json' }],
        url: 'https://api.example.com/users',
        body: {
          mode: 'raw',
          raw: '{"name":"Ada"}',
          options: { raw: { language: 'json' } },
        },
      },
    },
  ],
});

const POSTMAN_ENV = JSON.stringify({
  name: 'Staging',
  values: [
    { key: 'baseUrl', value: 'https://staging.example.com', enabled: true },
    { key: 'token', value: 'abc', enabled: true },
  ],
});

describe('request-import', () => {
  it('imports Postman collection with nested folders', () => {
    const result = parseImportFile('api.postman_collection.json', POSTMAN_COLLECTION);
    expect(result.errors).toEqual([]);
    expect(result.collections).toHaveLength(1);
    expect(result.collections[0]?.name).toBe('API Tests');
    expect(result.collections[0]?.requests).toHaveLength(2);
    expect(result.collections[0]?.requests[0]?.name).toBe('Users / List users');
    expect(result.collections[0]?.requests[0]?.method).toBe('GET');
    expect(result.collections[0]?.requests[1]?.bodyMode).toBe('raw');
  });

  it('imports Postman environment', () => {
    const result = parseImportFile('staging.postman_environment.json', POSTMAN_ENV);
    expect(result.errors).toEqual([]);
    expect(result.environments).toHaveLength(1);
    expect(result.environments[0]?.name).toBe('Staging');
    expect(result.environments[0]?.variables).toHaveLength(2);
  });

  it('merges imported items with unique names', () => {
    const imported = parseImportFile('api.postman_collection.json', POSTMAN_COLLECTION);
    const merged = mergeImportIntoWorkspace(
      { collections: [{ id: '1', name: 'API Tests', requests: [] }], environments: [] },
      imported,
    );
    expect(merged.collections).toHaveLength(2);
    expect(merged.collections[1]?.name).toBe('API Tests (2)');
  });
});
