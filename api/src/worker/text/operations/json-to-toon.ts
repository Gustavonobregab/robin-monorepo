import type { TextOperationHandler } from '../types';

export const jsonToToon: TextOperationHandler<'json-to-toon'> = {
  type: 'json-to-toon',

  async process(input) {
    return replaceJsonBlocks(input);
  },
};

const JSON_BLOCK_RE = /(?:\{[\s\S]*?\}|\[[\s\S]*?\])/g;

function replaceJsonBlocks(input: string): string {
  let isWholeDocument = false;
  try {
    const parsed = JSON.parse(input);
    isWholeDocument = typeof parsed === 'object' && parsed !== null;
  } catch {}

  if (isWholeDocument) {
    return toToon(JSON.parse(input), 0);
  }

  let hasReplacement = false;
  const result = input.replace(JSON_BLOCK_RE, (match) => {
    try {
      const parsed = JSON.parse(match);
      if (typeof parsed === 'object' && parsed !== null) {
        hasReplacement = true;
        return toToon(parsed, 0);
      }
    } catch {}
    return match;
  });

  return hasReplacement ? result : input;
}

function toToon(value: unknown, depth: number): string {
  if (value === null || value === undefined) return '~';
  if (typeof value === 'boolean') return value ? '+' : '-';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value.includes(' ') ? `"${value}"` : value;

  const indent = '  '.repeat(depth);

  if (Array.isArray(value)) {
    const items = value.map((item) => `${indent}${toToon(item, depth + 1)}`);
    return `[\n${items.join('\n')}\n]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const lines = entries.map(([key, val]) => {
      return `${indent}${key}:${toToon(val, depth + 1)}`;
    });
    return lines.join('\n');
  }

  return String(value);
}
