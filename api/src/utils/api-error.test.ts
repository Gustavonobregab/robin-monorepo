import { describe, test, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { ApiError, apiErrorPlugin } from './api-error';

const app = new Elysia()
  .use(apiErrorPlugin)
  .get('/plain', () => ({ id: '1', status: 'completed' }))
  // Job payloads carry an optional `error` field; without the envelope every client reads undefined
  .get('/with-error-field', () => ({ id: '1', status: 'completed', error: undefined }))
  .get('/failing', () => {
    throw new ApiError('INSUFFICIENT_CREDITS', 'no credits', 429);
  });

type Envelope = { success: boolean; data?: Record<string, unknown>; error?: unknown };

const json = (path: string) =>
  app.handle(new Request(`http://localhost${path}`)).then(async (res) => ({
    status: res.status,
    body: (await res.json()) as Envelope,
  }));

describe('response envelope', () => {
  test('wraps handler payloads in { success, data }', async () => {
    const { body } = await json('/plain');
    expect(body).toEqual({ success: true, data: { id: '1', status: 'completed' } });
  });

  test('wraps payloads that carry an optional error field', async () => {
    const { body } = await json('/with-error-field');
    expect(body.success).toBe(true);
    expect(body.data?.id).toBe('1');
    expect(body.data?.status).toBe('completed');
  });

  test('ApiError becomes { success: false, error } with its status', async () => {
    const { status, body } = await json('/failing');
    expect(status).toBe(429);
    expect(body).toEqual({
      success: false,
      error: { code: 'INSUFFICIENT_CREDITS', message: 'no credits' },
    });
  });
});
