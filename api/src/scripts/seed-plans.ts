import { connectDatabase } from '../config/database';
import { PlanModel } from '../modules/plans/plans.model';
import { DEFAULT_PLANS } from '../modules/plans/plans.defaults';

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
