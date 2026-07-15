export function formatJson(value: string): string {
  const parsed = JSON.parse(value) as unknown;
  return JSON.stringify(parsed, null, 2);
}

export function isValidJson(value: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(value) as unknown };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid JSON',
    };
  }
}

export function byteSize(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}
