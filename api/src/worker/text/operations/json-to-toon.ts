import type { TextOperationHandler } from '../types';
import { encodeToon, findJsonBlocks } from '../../../utils/toon';

// Below this size the TOON header/structure overhead ("prompt tax") tends to
// cancel out the savings, so small blocks are left untouched.
const MIN_BLOCK_SIZE = 120;

export const jsonToToon: TextOperationHandler<'json-to-toon'> = {
  type: 'json-to-toon',

  async process(input) {
    const whole = tryConvert(input);
    if (whole !== null) return whole;

    let result = '';
    let cursor = 0;

    for (const block of findJsonBlocks(input)) {
      const raw = input.slice(block.start, block.end);
      const converted = tryConvert(raw);

      result += input.slice(cursor, block.start);
      result += converted ?? raw;
      cursor = block.end;
    }

    result += input.slice(cursor);
    return result;
  },
};

function tryConvert(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < MIN_BLOCK_SIZE) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;

  const toon = encodeToon(parsed);

  // Lossy-format guard: only swap formats when it actually shrinks the text
  return toon.length < trimmed.length ? toon : null;
}
