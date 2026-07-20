import { describe, expect, it } from 'vitest';
import { rowsToVariableMap, substituteVariables } from '@/lib/request-variables';
import { createRow } from '@/lib/request-workspace';

describe('request-variables', () => {
  it('substitutes {{variable}} placeholders', () => {
    const vars = { baseUrl: 'https://api.example.com', id: '42' };
    expect(substituteVariables('{{baseUrl}}/users/{{id}}', vars)).toBe(
      'https://api.example.com/users/42',
    );
  });

  it('leaves unknown placeholders unchanged', () => {
    expect(substituteVariables('{{missing}}', {})).toBe('{{missing}}');
  });

  it('builds variable map from enabled rows only', () => {
    const map = rowsToVariableMap([
      createRow('token', 'abc'),
      { ...createRow('disabled', 'x'), enabled: false },
    ]);
    expect(map).toEqual({ token: 'abc' });
  });
});
