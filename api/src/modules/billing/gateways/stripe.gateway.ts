import type Stripe from 'stripe';
import { stripe, getWebhookSecret } from '../../../config/stripe';
import type { BillingEvent, CheckoutResult, PaymentGateway } from '../billing.types';
import type { Plan } from '../../plans/plans.types';

function clientUrl(): string {
  return process.env.CLIENT_URL ?? 'http://localhost:3333';
}

// Newer API versions moved current_period_* onto the items.
function periodFromSubscription(sub: Stripe.Subscription): { start: Date; end: Date } {
  const item = sub.items.data[0];
  return {
    start: new Date(item.current_period_start * 1000),
    end: new Date(item.current_period_end * 1000),
  };
}

// invoice.subscription was reshaped across API versions; accept both forms.
function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const legacy = (invoice as unknown as { subscription?: string | { id: string } }).subscription;
  if (typeof legacy === 'string') return legacy;
  if (legacy?.id) return legacy.id;
  const parent = invoice.parent?.subscription_details?.subscription;
  if (typeof parent === 'string') return parent;
  if (parent && 'id' in parent) return parent.id;
  return null;
}

export const stripeGateway: PaymentGateway = {
  name: 'stripe',

  async createCheckout(user, plan: Plan): Promise<CheckoutResult> {
    const userId = String(user._id);
    const priceId = plan.gateways?.stripe?.priceId;
    if (!priceId) throw new Error(`Plan ${plan.slug} has no Stripe price`);

    let customerId = user.subscription?.gatewayCustomerIds?.stripe;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      metadata: { userId, planSlug: plan.slug },
      subscription_data: { metadata: { userId, planSlug: plan.slug } },
      success_url: `${clientUrl()}/dashboard/billing?checkout=success`,
      cancel_url: `${clientUrl()}/dashboard/billing?checkout=canceled`,
    });

    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return { url: session.url, customerId };
  },

  async cancelAtPeriodEnd(subscriptionId: string): Promise<void> {
    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  },

  async cancelNow(subscriptionId: string): Promise<void> {
    await stripe.subscriptions.cancel(subscriptionId);
  },

  async parseWebhook(rawBody, headers): Promise<BillingEvent | null> {
    const signature = headers['stripe-signature'];
    if (!signature) throw new Error('Missing stripe-signature header');
    const event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      getWebhookSecret(),
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription' || !session.subscription) return null;
        const userId = session.metadata?.userId ?? session.client_reference_id;
        const planSlug = session.metadata?.planSlug;
        if (!userId || !planSlug) return null;

        const subId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        const period = periodFromSubscription(sub);

        return {
          type: 'subscription_activated',
          gateway: 'stripe',
          eventId: event.id,
          userId,
          planSlug,
          customerId: typeof session.customer === 'string' ? session.customer : session.customer!.id,
          subscriptionId: subId,
          periodStart: period.start,
          periodEnd: period.end,
        };
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        if (invoice.billing_reason !== 'subscription_cycle') return null; // first one: see checkout.session.completed
        const subscriptionId = subscriptionIdFromInvoice(invoice);
        if (!subscriptionId) return null;
        const line = invoice.lines.data[0];
        return {
          type: 'subscription_renewed',
          gateway: 'stripe',
          eventId: event.id,
          subscriptionId,
          periodStart: new Date(line.period.start * 1000),
          periodEnd: new Date(line.period.end * 1000),
        };
      }

      case 'invoice.payment_failed': {
        const subscriptionId = subscriptionIdFromInvoice(event.data.object);
        if (!subscriptionId) return null;
        return {
          type: 'subscription_payment_failed',
          gateway: 'stripe',
          eventId: event.id,
          subscriptionId,
        };
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        return {
          type: 'subscription_updated',
          gateway: 'stripe',
          eventId: event.id,
          subscriptionId: sub.id,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        };
      }

      case 'customer.subscription.deleted': {
        return {
          type: 'subscription_deleted',
          gateway: 'stripe',
          eventId: event.id,
          subscriptionId: event.data.object.id,
        };
      }

      default:
        return null;
    }
  },
};
