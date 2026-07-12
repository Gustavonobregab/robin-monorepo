import { describe, test, expect } from 'bun:test';
import { createHmac } from 'crypto';
import { signWebhookPayload } from './webhooks.service';

describe('signWebhookPayload', () => {
  test('signs "{timestamp}.{body}" with sha256= prefix — the documented receiver contract', () => {
    const secret = 'whsec_test';
    const timestamp = '1760000000';
    const body = '{"event":"job.completed"}';

    const expected = `sha256=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;

    expect(signWebhookPayload(secret, timestamp, body)).toBe(expected);
  });

  test('different timestamp produces a different signature (replay protection input)', () => {
    const body = '{}';
    expect(signWebhookPayload('s', '1', body)).not.toBe(signWebhookPayload('s', '2', body));
  });
});
