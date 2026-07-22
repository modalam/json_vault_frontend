/**
 * Infer JSON Schema and TypeScript types from a JSON value — deterministic, no LLM.
 */

export type JsonSchema = {
  $schema?: string;
  title?: string;
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  additionalProperties?: boolean;
  enum?: unknown[];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeTypes(a: string | string[] | undefined, b: string | string[] | undefined): string | string[] {
  const set = new Set<string>();
  for (const value of [a, b]) {
    if (!value) continue;
    if (Array.isArray(value)) value.forEach((t) => set.add(t));
    else set.add(value);
  }
  const list = [...set];
  if (list.length === 0) return 'null';
  if (list.length === 1) return list[0]!;
  return list.sort();
}

/** Merge two inferred schemas (used for array item unification). */
export function mergeSchemas(a: JsonSchema, b: JsonSchema): JsonSchema {
  if (a.enum && b.enum) {
    const values = [...new Set([...a.enum, ...b.enum])];
    return { enum: values };
  }

  const type = mergeTypes(a.type, b.type);
  const types = Array.isArray(type) ? type : [type];

  if (types.includes('object') && (a.properties || b.properties)) {
    const keys = new Set([
      ...Object.keys(a.properties ?? {}),
      ...Object.keys(b.properties ?? {}),
    ]);
    const properties: Record<string, JsonSchema> = {};
    for (const key of [...keys].sort((x, y) => x.localeCompare(y))) {
      const left = a.properties?.[key];
      const right = b.properties?.[key];
      if (left && right) properties[key] = mergeSchemas(left, right);
      else if (left) properties[key] = left;
      else if (right) properties[key] = right;
    }
    const required = [...keys].filter(
      (key) => (a.required?.includes(key) ?? false) && (b.required?.includes(key) ?? false),
    );
    return {
      type: types.length === 1 ? types[0] : types,
      properties,
      ...(required.length ? { required: required.sort() } : {}),
      additionalProperties: false,
    };
  }

  if (types.includes('array') && (a.items || b.items)) {
    const items =
      a.items && b.items ? mergeSchemas(a.items, b.items) : (a.items ?? b.items);
    return {
      type: types.length === 1 ? types[0] : types,
      ...(items ? { items } : {}),
    };
  }

  return { type: types.length === 1 ? types[0]! : types };
}

export function inferJsonSchema(value: unknown, title?: string): JsonSchema {
  const schema = inferSchemaNode(value);
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    ...(title ? { title } : {}),
    ...schema,
  };
}

function inferSchemaNode(value: unknown): JsonSchema {
  if (value === null) return { type: 'null' };
  if (typeof value === 'boolean') return { type: 'boolean' };
  if (typeof value === 'string') return { type: 'string' };
  if (typeof value === 'number') {
    return { type: Number.isInteger(value) ? 'integer' : 'number' };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return { type: 'array', items: {} };
    let items = inferSchemaNode(value[0]);
    for (let i = 1; i < value.length; i += 1) {
      items = mergeSchemas(items, inferSchemaNode(value[i]));
    }
    return { type: 'array', items };
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort((a, b) => a.localeCompare(b));
    const properties: Record<string, JsonSchema> = {};
    for (const key of keys) {
      properties[key] = inferSchemaNode(value[key]);
    }
    return {
      type: 'object',
      properties,
      ...(keys.length ? { required: keys } : {}),
      additionalProperties: false,
    };
  }

  return {};
}

export function formatJsonSchema(value: unknown, title?: string): string {
  return JSON.stringify(inferJsonSchema(value, title), null, 2);
}

function toTypeName(raw: string | undefined, fallback: string): string {
  const cleaned = (raw ?? '')
    .replace(/[^\w\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  if (!cleaned) return fallback;
  if (/^\d/.test(cleaned)) return `T${cleaned}`;
  return cleaned;
}

function schemaToTsType(schema: JsonSchema, indent = 0): string {
  if (schema.enum?.length) {
    return schema.enum.map((v) => JSON.stringify(v)).join(' | ');
  }

  const type = schema.type;
  const types = Array.isArray(type) ? type : type ? [type] : [];

  if (types.includes('object') || schema.properties) {
    const props = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    const keys = Object.keys(props).sort((a, b) => a.localeCompare(b));
    if (keys.length === 0) return 'Record<string, unknown>';

    const pad = '  '.repeat(indent);
    const inner = '  '.repeat(indent + 1);
    const lines = keys.map((key) => {
      const optional = required.has(key) ? '' : '?';
      const safeKey = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
      return `${inner}${safeKey}${optional}: ${schemaToTsType(props[key]!, indent + 1)};`;
    });
    return `{\n${lines.join('\n')}\n${pad}}`;
  }

  if (types.includes('array') || schema.items) {
    const item = schema.items ? schemaToTsType(schema.items, indent) : 'unknown';
    if (item.startsWith('{')) {
      return `Array<${item}>`;
    }
    const needsParens = item.includes('|');
    return needsParens ? `(${item})[]` : `${item}[]`;
  }

  const mapped = types.map((t) => {
    if (t === 'integer' || t === 'number') return 'number';
    if (t === 'null') return 'null';
    if (t === 'boolean') return 'boolean';
    if (t === 'string') return 'string';
    return 'unknown';
  });
  const unique = [...new Set(mapped)];
  return unique.length ? unique.join(' | ') : 'unknown';
}

/**
 * Emit a TypeScript type alias (and interface-like object type) from JSON.
 */
export function formatTypeScript(value: unknown, typeName?: string): string {
  const name = toTypeName(typeName, 'Root');
  const schema = inferSchemaNode(value);
  const body = schemaToTsType(schema, 0);

  if (body.startsWith('{')) {
    return `export interface ${name} ${body}\n`;
  }
  return `export type ${name} = ${body};\n`;
}

export type ExportFormat = 'schema' | 'typescript';

export function exportFromJson(
  value: unknown,
  format: ExportFormat,
  name?: string,
): string {
  if (format === 'schema') return formatJsonSchema(value, name || undefined);
  return formatTypeScript(value, name || undefined);
}
