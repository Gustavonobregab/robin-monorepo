const apiKey = process.env.ABACATEPAY_API_KEY;

export const abacatePayEnabled = Boolean(apiKey);

export const ABACATEPAY_BASE_URL =
  process.env.ABACATEPAY_BASE_URL ?? 'https://api.abacatepay.com/v1';

export function getAbacateApiKey(): string {
  if (!apiKey) throw new Error('ABACATEPAY_API_KEY is not set');
  return apiKey;
}

export function getAbacateWebhookSecret(): string {
  const secret = process.env.ABACATEPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error('ABACATEPAY_WEBHOOK_SECRET is not set');
  return secret;
}
