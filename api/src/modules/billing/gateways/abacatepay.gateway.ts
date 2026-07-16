import { createHmac, timingSafeEqual } from 'crypto';
import {
  ABACATEPAY_BASE_URL,
  getAbacateApiKey,
  getAbacateWebhookSecret,
} from '../../../config/abacatepay';
import type { BillingEvent, CheckoutResult, PaymentGateway } from '../billing.types';
import type { Plan } from '../../plans/plans.types';

function clientUrl(): string {
  return process.env.CLIENT_URL ?? 'http://localhost:3333';
}

async function api<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${ABACATEPAY_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAbacateApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { data?: T; error?: unknown };
  if (!res.ok || json.error) {
    throw new Error(`AbacatePay ${path} failed: ${JSON.stringify(json.error ?? res.status)}`);
  }
  return json.data as T;
}

// Two layers per their docs: shared secret in the query, HMAC-SHA256 of the raw body in the header.
export function verifyAbacateSignature(
  rawBody: string,
  signature: string | undefined,
  querySecret: string | undefined,
  secret: string,
): boolean {
  const secretBuf = Buffer.from(secret);
  const queryOk =
    !!querySecret &&
    querySecret.length === secret.length &&
    timingSafeEqual(Buffer.from(querySecret), secretBuf);
  if (!queryOk) return false;
  if (!signature) return true; // header absent on some event types; query secret still required

  const expected = createHmac('sha256', secret).update(rawBody).digest('base64');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  return sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
}

// Their docs don't pin the `data` shape of subscription events, so extraction reads every
// plausible path and falls back to a 30-day period. Verify against a real dev-mode webhook.
type AbacateWebhookBody = {
  id?: string;
  event?: string;
  devMode?: boolean;
  data?: {
    id?: string;
    externalId?: string;
    metadata?: { userId?: string; planSlug?: string };
    customer?: { id?: string } | string;
    customerId?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    nextBilling?: string;
    subscription?: {
      id?: string;
      externalId?: string;
      metadata?: { userId?: string; planSlug?: string };
      customerId?: string;
      currentPeriodStart?: string;
      currentPeriodEnd?: string;
      nextBilling?: string;
    };
  };
};

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export function normalizeAbacateEvent(body: AbacateWebhookBody): BillingEvent | null {
  const eventId = body.id;
  if (!eventId || !body.event) return null;

  const data = body.data ?? {};
  const sub = data.subscription ?? data;
  const subscriptionId = data.subscription?.id ?? data.id;
  if (!subscriptionId) return null;

  switch (body.event) {
    case 'subscription.completed': {
      const userId =
        data.subscription?.metadata?.userId ??
        data.metadata?.userId ??
        data.subscription?.externalId ??
        data.externalId;
      const planSlug = data.subscription?.metadata?.planSlug ?? data.metadata?.planSlug;
      if (!userId || !planSlug) return null;

      const customerId =
        data.customerId ??
        data.subscription?.customerId ??
        (typeof data.customer === 'string' ? data.customer : data.customer?.id) ??
        '';

      const start = sub.currentPeriodStart ? new Date(sub.currentPeriodStart) : new Date();
      const end = sub.currentPeriodEnd
        ? new Date(sub.currentPeriodEnd)
        : sub.nextBilling
          ? new Date(sub.nextBilling)
          : new Date(start.getTime() + THIRTY_DAYS);

      return {
        type: 'subscription_activated',
        gateway: 'abacatepay',
        eventId,
        userId,
        planSlug,
        customerId,
        subscriptionId,
        periodStart: start,
        periodEnd: end,
      };
    }

    case 'subscription.renewed': {
      const start = sub.currentPeriodStart ? new Date(sub.currentPeriodStart) : new Date();
      const end = sub.currentPeriodEnd
        ? new Date(sub.currentPeriodEnd)
        : sub.nextBilling
          ? new Date(sub.nextBilling)
          : new Date(start.getTime() + THIRTY_DAYS);
      return {
        type: 'subscription_renewed',
        gateway: 'abacatepay',
        eventId,
        subscriptionId,
        periodStart: start,
        periodEnd: end,
      };
    }

    case 'subscription.cancelled':
      return {
        type: 'subscription_canceled',
        gateway: 'abacatepay',
        eventId,
        subscriptionId,
      };

    default:
      return null;
  }
}

export const abacatePayGateway: PaymentGateway = {
  name: 'abacatepay',

  async createCheckout(user, plan: Plan): Promise<CheckoutResult> {
    const userId = String(user._id);
    const productId = plan.gateways?.abacatepay?.productId;
    if (!productId) throw new Error(`Plan ${plan.slug} has no AbacatePay product`);

    let customerId = user.subscription?.gatewayCustomerIds?.abacatepay;
    if (!customerId) {
      const customer = await api<{ id: string }>('/customers/create', {
        email: user.email,
        name: user.name,
      });
      customerId = customer.id;
    }

    const session = await api<{ id: string; url: string }>('/subscriptions/create', {
      items: [{ id: productId, quantity: 1 }],
      customerId,
      externalId: userId,
      metadata: { userId, planSlug: plan.slug },
      completionUrl: `${clientUrl()}/dashboard/billing?checkout=success`,
      returnUrl: `${clientUrl()}/dashboard/billing?checkout=canceled`,
    });

    return { url: session.url, customerId };
  },

  // Their cancel already keeps access until the cycle closes.
  async cancelAtPeriodEnd(subscriptionId: string): Promise<void> {
    await api('/subscriptions/cancel', { id: subscriptionId });
  },

  // No immediate-cancel API; stopping the renewal is enough for a plan switch.
  async cancelNow(subscriptionId: string): Promise<void> {
    await api('/subscriptions/cancel', { id: subscriptionId });
  },

  async parseWebhook(rawBody, headers, query): Promise<BillingEvent | null> {
    const ok = verifyAbacateSignature(
      rawBody,
      headers['x-webhook-signature'],
      query.webhookSecret,
      getAbacateWebhookSecret(),
    );
    if (!ok) throw new Error('Invalid AbacatePay webhook signature');
    return normalizeAbacateEvent(JSON.parse(rawBody) as AbacateWebhookBody);
  },
};
