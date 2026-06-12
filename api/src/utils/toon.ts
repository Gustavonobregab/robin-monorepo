// Token-Oriented Object Notation encoder. Compact, indentation-based JSON
// alternative for LLM input. Uniform object arrays collapse into a tabular
// form (one header row + CSV-like rows), which is where the token savings
// actually come from.

export function encodeToon(value: unknown): string {
  return encodeValue(value, 0).trimEnd();
}

function encodeValue(value: unknown, depth: number): string {
  if (Array.isArray(value)) return encodeArray('', value, depth);
  if (isPlainObject(value)) return encodeObject(value, depth);
  return scalar(value);
}

function encodeObject(obj: Record<string, unknown>, depth: number): string {
  const indent = '  '.repeat(depth);
  const lines: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      lines.push(encodeArray(key, value, depth));
    } else if (isPlainObject(value)) {
      lines.push(`${indent}${safeKey(key)}:`);
      lines.push(encodeObject(value, depth + 1));
    } else {
      lines.push(`${indent}${safeKey(key)}: ${scalar(value)}`);
    }
  }

  return lines.join('\n');
}

function encodeArray(key: string, arr: unknown[], depth: number): string {
  const indent = '  '.repeat(depth);
  const label = key ? safeKey(key) : '';

  if (arr.length === 0) return `${indent}${label}[0]:`;

  const fields = uniformFields(arr);

  if (fields) {
    const rows = (arr as Record<string, unknown>[]).map(
      (item) => `${indent}  ${fields.map((field) => scalar(item[field])).join(',')}`,
    );
    return `${indent}${label}[${arr.length}]{${fields.join(',')}}:\n${rows.join('\n')}`;
  }

  if (arr.every((item) => !Array.isArray(item) && !isPlainObject(item))) {
    return `${indent}${label}[${arr.length}]: ${arr.map(scalar).join(',')}`;
  }

  const items = arr.map((item) => {
    if (Array.isArray(item) || isPlainObject(item)) {
      return `${indent}  -\n${encodeValue(item, depth + 2)}`;
    }
    return `${indent}  - ${scalar(item)}`;
  });
  return `${indent}${label}[${arr.length}]:\n${items.join('\n')}`;
}

// Tabular form only applies when every element is a flat object with the
// exact same keys — otherwise rows would be ambiguous.
function uniformFields(arr: unknown[]): string[] | null {
  if (!isPlainObject(arr[0])) return null;

  const fields = Object.keys(arr[0] as Record<string, unknown>);
  if (fields.length === 0) return null;

  for (const item of arr) {
    if (!isPlainObject(item)) return null;
    const keys = Object.keys(item as Record<string, unknown>);
    if (keys.length !== fields.length || keys.some((k, i) => k !== fields[i])) return null;
    if (Object.values(item as Record<string, unknown>).some((v) => Array.isArray(v) || isPlainObject(v))) {
      return null;
    }
  }

  return fields;
}

function scalar(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);

  const str = String(value);
  const needsQuotes =
    str === '' ||
    /[,:"\n\[\]{}]/.test(str) ||
    str !== str.trim() ||
    str === 'null' ||
    str === 'true' ||
    str === 'false' ||
    (str !== '' && !Number.isNaN(Number(str)));

  return needsQuotes ? `"${str.replace(/"/g, '\\"')}"` : str;
}

function safeKey(key: string): string {
  return /^[A-Za-z0-9_.-]+$/.test(key) ? key : `"${key.replace(/"/g, '\\"')}"`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Finds complete JSON objects/arrays in free text by scanning balanced
// brackets (string- and escape-aware). A regex cannot do this for nested
// structures.
export function findJsonBlocks(input: string): { start: number; end: number }[] {
  const blocks: { start: number; end: number }[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (char !== '{' && char !== '[') {
      i++;
      continue;
    }

    const end = matchBalanced(input, i);
    if (end === -1) {
      i++;
      continue;
    }

    blocks.push({ start: i, end: end + 1 });
    i = end + 1;
  }

  return blocks;
}

function matchBalanced(input: string, start: number): number {
  const open = input[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;

  for (let i = start; i < input.length; i++) {
    const char = input[i];

    if (inString) {
      if (char === '\\') i++;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') inString = true;
    else if (char === '{' || char === '[') depth++;
    else if (char === '}' || char === ']') {
      depth--;
      if (depth === 0) return input[i] === close ? i : -1;
    }
  }

  return -1;
}
