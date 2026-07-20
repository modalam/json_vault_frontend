import type { KeyValueRow } from '@/lib/request-workspace';

export function rowsToVariableMap(rows: KeyValueRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (!row.enabled) continue;
    const key = row.key.trim();
    if (!key) continue;
    out[key] = row.value;
  }
  return out;
}

/** Replace `{{variable}}` placeholders (Postman-style). */
export function substituteVariables(
  input: string,
  variables: Record<string, string>,
): string {
  return input.replace(/\{\{\s*([^{}\s]+)\s*\}\}/g, (match, key: string) => {
    if (key in variables) return variables[key]!;
    return match;
  });
}
