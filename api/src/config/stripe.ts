import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;

export const stripeEnabled = Boolean(secretKey);

export const stripe = secretKey ? new Stripe(secretKey) : (null as unknown as Stripe);

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return secret;
}
