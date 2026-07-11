import { connectDatabase } from '../config/database';
import { PlanModel } from '../modules/plans/plans.model';

const KB = 1024;
const MB = 1024 * 1024;

// Credit costs are "credits per started perUnitBytes". These live in the
// database so they can be retuned by editing here and re-running the seed —
// reserveCredits reads them per request, no deploy needed.
const CREDIT_WEIGHTS = {
  text: { credits: 1, perUnitBytes: 100 * KB },
  audio: { credits: 1, perUnitBytes: 5 * MB },
  image: { credits: 1, perUnitBytes: 2 * MB },
  video: { credits: 2, perUnitBytes: 5 * MB },
};

const DEFAULT_PLANS = [
  {
    name: 'Free',
    slug: 'free',
    description: 'Get started with Robin Wood for free',
    credits: 100,
    creditWeights: CREDIT_WEIGHTS,
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
    creditWeights: CREDIT_WEIGHTS,
    prices: {},
    features: { maxFileSize: 100 * MB, maxApiKeys: 5, webhooks: true },
    isPublic: true,
    isDefault: false,
    active: true,
  },
];

async function seed() {
  await connectDatabase();

  for (const plan of DEFAULT_PLANS) {
    const existing = await PlanModel.findOneAndUpdate(
      { slug: plan.slug },
      { $set: plan },
      { upsert: true },
    );

    console.log(`${existing ? 'Updated' : 'Created'} plan "${plan.slug}" (${plan.credits} credits)`);
  }

  console.log('Done seeding plans');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
