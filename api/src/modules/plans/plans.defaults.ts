import type { CreditWeights } from './plans.types';

const KB = 1024;
const MB = 1024 * 1024;

// Pricing source of truth: retune here, run `bun run seed:plans`, and the next job is charged the new rate
export const DEFAULT_CREDIT_WEIGHTS: CreditWeights = {
  text: { credits: 1, perUnitBytes: 100 * KB },
  audio: { credits: 1, perUnitBytes: 5 * MB },
  image: { credits: 1, perUnitBytes: 2 * MB },
  video: { credits: 2, perUnitBytes: 5 * MB },
};

export const DEFAULT_PLANS = [
  {
    name: 'Free',
    slug: 'free',
    description: 'Get started with Robin for free',
    credits: 100,
    creditWeights: DEFAULT_CREDIT_WEIGHTS,
    prices: { brl: 0, usd: 0 },
    features: { maxFileSize: 25 * MB, maxApiKeys: 2, webhooks: false },
    isPublic: true,
    isDefault: true,
    active: true,
  },
  {
    name: 'Pro',
    slug: 'pro',
    description: 'For professionals who need more processing power',
    credits: 1000,
    creditWeights: DEFAULT_CREDIT_WEIGHTS,
    prices: { brl: 97, usd: 19 },
    features: { maxFileSize: 100 * MB, maxApiKeys: 5, webhooks: true },
    isPublic: true,
    isDefault: false,
    active: true,
  },
  {
    name: 'Pro Max',
    slug: 'pro-max',
    description: 'For teams compressing at scale',
    credits: 5000,
    creditWeights: DEFAULT_CREDIT_WEIGHTS,
    prices: { brl: 249, usd: 49 },
    features: { maxFileSize: 500 * MB, maxApiKeys: 15, webhooks: true },
    isPublic: true,
    isDefault: false,
    active: true,
  },
];
