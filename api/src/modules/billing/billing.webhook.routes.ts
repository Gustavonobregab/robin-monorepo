import { Elysia } from 'elysia';
import { stripeGateway } from './gateways/stripe.gateway';
import { abacatePayGateway } from './gateways/abacatepay.gateway';
import { billingService } from './billing.service';
import type { PaymentGateway } from './billing.types';

// Public. Signatures are verified over the raw body, so these routes must keep parse: 'text'.
function webhookHandler(gateway: PaymentGateway) {
  return async ({
    body,
    headers,
    query,
    set,
  }: {
    body: unknown;
    headers: Record<string, string | undefined>;
    query: Record<string, string | undefined>;
    set: { status?: number | string };
  }) => {
    let event;
    try {
      event = await gateway.parseWebhook(body as string, headers, query);
    } catch {
      set.status = 400;
      return { received: false };
    }

    if (event) await billingService.handleEvent(event);
    return { received: true };
  };
}

export const billingWebhookRoutes = new Elysia()
  .post('/webhooks/stripe', webhookHandler(stripeGateway), { parse: 'text' })
  .post('/webhooks/abacatepay', webhookHandler(abacatePayGateway), { parse: 'text' });
