import { describe, test, expect } from 'bun:test';
import { encodeToon, findJsonBlocks } from './toon';
import { jsonToToon } from '../worker/text/operations/json-to-toon';

describe('encodeToon', () => {
  test('uniform object arrays collapse into tabular form', () => {
    const result = encodeToon({
      items: [
        { id: 1, name: 'foo', price: 3.5 },
        { id: 2, name: 'bar', price: 10 },
      ],
    });

    expect(result).toBe('items[2]{id,name,price}:\n  1,foo,3.5\n  2,bar,10');
  });

  test('nested objects use indentation', () => {
    const result = encodeToon({ user: { name: 'Ana', active: true }, count: 2 });

    expect(result).toBe('user:\n  name: Ana\n  active: true\ncount: 2');
  });

  test('quotes strings that would be ambiguous', () => {
    const result = encodeToon({
      a: 'has, comma',
      b: '42',
      c: 'true',
      d: 'plain',
    });

    expect(result).toContain('a: "has, comma"');
    expect(result).toContain('b: "42"');
    expect(result).toContain('c: "true"');
    expect(result).toContain('d: plain');
  });

  test('scalar arrays inline', () => {
    expect(encodeToon({ tags: ['a', 'b', 'c'] })).toBe('tags[3]: a,b,c');
  });

  test('null and booleans use standard literals', () => {
    expect(encodeToon({ a: null, b: false })).toBe('a: null\nb: false');
  });
});

describe('findJsonBlocks scan budget', () => {
  // Unmatched openers used to rescan to EOF from every position, pinning a CPU for hours
  test('bails out fast on a pathological unbalanced input', () => {
    const bomb = '{'.repeat(200_000);

    const start = performance.now();
    const blocks = findJsonBlocks(bomb);
    const elapsed = performance.now() - start;

    expect(blocks).toEqual([]);
    expect(elapsed).toBeLessThan(2_000);
  });
});

describe('findJsonBlocks', () => {
  test('matches nested objects fully (regex could not)', () => {
    const input = 'before {"a":{"b":{"c":1}},"d":[1,2]} after';
    const blocks = findJsonBlocks(input);

    expect(blocks.length).toBe(1);
    expect(input.slice(blocks[0].start, blocks[0].end)).toBe('{"a":{"b":{"c":1}},"d":[1,2]}');
  });

  test('ignores braces inside strings', () => {
    const input = '{"text":"closing } inside"}';
    const blocks = findJsonBlocks(input);

    expect(input.slice(blocks[0].start, blocks[0].end)).toBe(input);
  });
});

describe('json-to-toon operation', () => {
  const bigJson = JSON.stringify({
    products: Array.from({ length: 6 }, (_, i) => ({
      id: i,
      name: `product-${i}`,
      price: i * 10,
      inStock: i % 2 === 0,
    })),
  });

  test('converts large JSON blocks embedded in prose', async () => {
    const input = `Use this catalog: ${bigJson} and answer.`;
    const output = await jsonToToon.process(input, undefined as never);

    expect(output).toContain('products[6]{id,name,price,inStock}:');
    expect(output).toContain('Use this catalog:');
    expect(output).toContain('and answer.');
    expect(output.length).toBeLessThan(input.length);
  });

  test('leaves small JSON blocks untouched (prompt tax gate)', async () => {
    const input = 'config: {"debug": true, "level": 2}';
    expect(await jsonToToon.process(input, undefined as never)).toBe(input);
  });

  test('converts whole-document JSON', async () => {
    const output = await jsonToToon.process(bigJson, undefined as never);
    expect(output).toContain('products[6]{id,name,price,inStock}:');
    expect(output.length).toBeLessThan(bigJson.length);
  });

  test('leaves invalid JSON untouched', async () => {
    const input = 'this { is not json } at all';
    expect(await jsonToToon.process(input, undefined as never)).toBe(input);
  });
});
