import { describe, test, expect } from 'bun:test';
import { TEXT_OPERATIONS, TEXT_PRESETS } from './text.types';
import { textService } from './text.service';
import { processText } from '../../worker/text/pipeline';

// Private; reached through the service so the test sees what a real request produces
const resolve = (ops: unknown): { type: string; params?: Record<string, unknown> }[] =>
  (textService as unknown as {
    resolveOperations: (p?: string, o?: unknown) => { type: string; params?: Record<string, unknown> }[];
  }).resolveOperations(undefined, ops);

describe('text operation defaults', () => {
  // A schema-valid { type: 'trim' } used to reach the handler with undefined params and crash
  test('fills defaults when params are omitted', () => {
    const [op] = resolve([{ type: 'trim' }]);
    expect(op.params?.intensity).toBe(TEXT_OPERATIONS.trim.params.intensity.default);
  });

  test('fills missing keys without overriding provided ones', () => {
    const [op] = resolve([{ type: 'trim', params: {} }]);
    expect(op.params?.intensity).toBe(TEXT_OPERATIONS.trim.params.intensity.default);

    const [custom] = resolve([{ type: 'trim', params: { intensity: 90 } }]);
    expect(custom.params?.intensity).toBe(90);
  });

  test('a bare operation runs end to end without throwing', async () => {
    const ops = resolve([{ type: 'trim' }]);
    await expect(processText('  hello   world  ', ops as never)).resolves.toBeString();
  });

  test('every preset resolves to operations the pipeline can run', async () => {
    for (const preset of Object.keys(TEXT_PRESETS)) {
      const ops = (textService as unknown as {
        resolveOperations: (p?: string) => unknown[];
      }).resolveOperations(preset);

      await expect(processText('hello world', ops as never)).resolves.toBeString();
    }
  });
});
