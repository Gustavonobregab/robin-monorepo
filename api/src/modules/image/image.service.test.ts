import { describe, test, expect } from 'bun:test';
import { IMAGE_OPERATIONS } from './image.types';
import { imageService } from './image.service';

const resolve = (ops: unknown): { type: string; params?: Record<string, unknown> }[] =>
  (imageService as unknown as {
    resolveOperations: (p?: string, o?: unknown) => { type: string; params?: Record<string, unknown> }[];
  }).resolveOperations(undefined, ops);

describe('image operation resolution', () => {
  test('fills defaults when params are omitted', () => {
    const ops = resolve([{ type: 'encode' }]);
    expect(ops[ops.length - 1].params?.format).toBe(IMAGE_OPERATIONS.encode.params.format.default);
    expect(ops[ops.length - 1].params?.quality).toBe(80);
  });

  test('appends a default webp encode when none is given', () => {
    const ops = resolve([{ type: 'resize', params: { width: 100 } }]);
    const last = ops[ops.length - 1];
    expect(last.type).toBe('encode');
    expect(last.params?.format).toBe('webp');
  });

  test('encode always ends up last, last one wins', () => {
    const ops = resolve([
      { type: 'encode', params: { format: 'jpeg' } },
      { type: 'resize', params: { width: 100 } },
      { type: 'encode', params: { format: 'avif' } },
    ]);
    expect(ops[ops.length - 1].type).toBe('encode');
    expect(ops[ops.length - 1].params?.format).toBe('avif');
    expect(ops.filter((op) => op.type === 'encode').length).toBe(1);
  });
});
