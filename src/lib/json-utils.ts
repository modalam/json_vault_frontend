export function formatJson(value: string): string {
  const parsed = JSON.parse(value) as unknown;
  return JSON.stringify(parsed, null, 2);
}

export function compactJson(value: string): string {
  return JSON.stringify(JSON.parse(value) as unknown);
}

/**
 * Repairs common JSON copied from configuration files: a leading BOM, comments,
 * and trailing commas. It deliberately does not guess at malformed values.
 */
export function repairJson(value: string): string {
  let withoutComments = '';
  let inString = false;
  let escaping = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]!;
    const next = value[index + 1];
    if (inString) {
      withoutComments += char;
      if (escaping) escaping = false;
      else if (char === '\\') escaping = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      withoutComments += char;
    } else if (char === '/' && next === '/') {
      index += 1;
      while (index + 1 < value.length && value[index + 1] !== '\n') index += 1;
    } else if (char === '/' && next === '*') {
      const end = value.indexOf('*/', index + 2);
      if (end === -1) throw new SyntaxError('Unterminated block comment');
      index = end + 1;
    } else {
      withoutComments += char;
    }
  }

  let repaired = '';
  inString = false;
  escaping = false;
  for (let index = 0; index < withoutComments.length; index += 1) {
    const char = withoutComments[index]!;
    if (inString) {
      repaired += char;
      if (escaping) escaping = false;
      else if (char === '\\') escaping = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      repaired += char;
      continue;
    }
    if (char === ',') {
      let nextIndex = index + 1;
      while (/\s/.test(withoutComments[nextIndex] ?? '')) nextIndex += 1;
      if (withoutComments[nextIndex] === '}' || withoutComments[nextIndex] === ']') continue;
    }
    repaired += char;
  }

  return formatJson(repaired.replace(/^\uFEFF/, ''));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortJsonValue(child)]),
    );
  }
  return value;
}

/** Sort object keys recursively while preserving array order. */
export function sortJson(value: string): string {
  return JSON.stringify(sortJsonValue(JSON.parse(value) as unknown), null, 2);
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
