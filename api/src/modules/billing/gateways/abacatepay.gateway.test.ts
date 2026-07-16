import { describe, test, expect } from 'bun:test';
import { createHmac } from 'crypto';
import { normalizeAbacateEvent, verifyAbacateSignature } from './abacatepay.gateway';

const SECRET = 'whsec_test_secret_123';

function sign(rawBody: string): string {
  return createHmac('sha256', SECRET).update(rawBody).digest('base64');
}

describe('verifyAbacateSignature', () => {
  const body = '{"id":"log_1","event":"subscription.renewed"}';

  test('accepts valid query secret + valid HMAC header', () => {
    expect(verifyAbacateSignature(body, sign(body), SECRET, SECRET)).toBe(true);
  });

  test('rejects wrong query secret regardless of header', () => {
    expect(verifyAbacateSignature(body, sign(body), 'wrong', SECRET)).toBe(false);
    expect(verifyAbacateSignature(body, sign(body), undefined, SECRET)).toBe(false);
  });

  test('rejects tampered body when header is present', () => {
    expect(verifyAbacateSignature('{"tampered":true}', sign(body), SECRET, SECRET)).toBe(false);
  });

  test('accepts query secret alone when no signature header is sent', () => {
    expect(verifyAbacateSignature(body, undefined, SECRET, SECRET)).toBe(true);
  });
});

describe('normalizeAbacateEvent', () => {
  test('subscription.completed maps to activation with metadata ids', () => {
    const evt = normalizeAbacateEvent({
      id: 'log_1',
      event: 'subscription.completed',
      data: {
        subscription: {
          id: 'sub_abc',
          externalId: 'user123',
          metadata: { userId: 'user123', planSlug: 'pro' },
          customerId: 'cust_9',
          currentPeriodEnd: '2026-08-15T00:00:00.000Z',
        },
      },
    });
    expect(evt).toMatchObject({
      type: 'subscription_activated',
      gateway: 'abacatepay',
      eventId: 'log_1',
      userId: 'user123',
      planSlug: 'pro',
      customerId: 'cust_9',
      subscriptionId: 'sub_abc',
    });
    expect((evt as { periodEnd: Date }).periodEnd.toISOString()).toBe('2026-08-15T00:00:00.000Z');
  });

  test('falls back to externalId and a 30-day period when fields are missing', () => {
    const before = Date.now();
    const evt = normalizeAbacateEvent({
      id: 'log_2',
      event: 'subscription.completed',
      data: { id: 'sub_x', externalId: 'user9', metadata: { planSlug: 'pro' } },
    });
    expect(evt).toMatchObject({ type: 'subscription_activated', userId: 'user9' });
    const end = (evt as { periodEnd: Date }).periodEnd.getTime();
    expect(end).toBeGreaterThanOrEqual(before + 29 * 24 * 60 * 60 * 1000);
  });

  test('renewed and cancelled map to their lifecycle events', () => {
    expect(
      normalizeAbacateEvent({
        id: 'log_3',
        event: 'subscription.renewed',
        data: { subscription: { id: 'sub_abc' } },
      }),
    ).toMatchObject({ type: 'subscription_renewed', subscriptionId: 'sub_abc' });

    expect(
      normalizeAbacateEvent({
        id: 'log_4',
        event: 'subscription.cancelled',
        data: { subscription: { id: 'sub_abc' } },
      }),
    ).toMatchObject({ type: 'subscription_canceled', subscriptionId: 'sub_abc' });
  });

  test('ignores unknown events and activation without mapping ids', () => {
    expect(
      normalizeAbacateEvent({ id: 'log_5', event: 'checkout.completed', data: { id: 'bill_1' } }),
    ).toBeNull();
    expect(
      normalizeAbacateEvent({ id: 'log_6', event: 'subscription.completed', data: { id: 'sub_1' } }),
    ).toBeNull();
  });
});
