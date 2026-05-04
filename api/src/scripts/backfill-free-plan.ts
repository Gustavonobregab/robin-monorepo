import { connectDatabase } from '../config/database';
import { PlanModel } from '../modules/plans/plans.model';
import { UserModel } from '../modules/users/users.model';
import { addDays } from 'date-fns';

async function backfill() {
  await connectDatabase();

  const freePlan = await PlanModel.findOne({ slug: 'free', active: true }).lean();
  if (!freePlan) {
    console.error('Free plan not found. Run `bun run seed:plans` first.');
    process.exit(1);
  }

  const now = new Date();
  const result = await UserModel.updateMany(
    {},
    {
      $set: {
        plan: freePlan._id,
        subscription: {
          status: 'active',
          credits: { limit: freePlan.credits, used: 0 },
          currentPeriodStart: now,
          currentPeriodEnd: addDays(now, 30),
        },
      },
    }
  );

  console.log(`Updated ${result.modifiedCount} user(s) to Free plan`);
  process.exit(0);
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
