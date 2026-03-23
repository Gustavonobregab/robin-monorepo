import { UserModel } from '../modules/users/users.model';
import { PlanModel } from '../modules/plans/plans.model';
import { ApiError } from '../utils/api-error';
import type { PipelineType } from '../modules/usage/usage.types';

async function renewCycleIfExpired(userId: string) {
  const now = new Date();

  // Atomically try to renew the cycle. The condition on currentPeriodEnd prevents double renewal.
  const renewed = await UserModel.findOneAndUpdate(
    {
      $or: [{ oderId: userId }, { _id: userId }],
      'subscription.currentPeriodEnd': { $lt: now },
      'subscription.status': 'active',
    },
    [
      {
        $set: {
          'subscription.currentPeriodStart': '$subscription.currentPeriodEnd',
          'subscription.currentPeriodEnd': {
            $dateAdd: { startDate: '$subscription.currentPeriodEnd', unit: 'day', amount: 30 },
          },
          'subscription.credits.used': 0,
        },
      },
    ],
    { new: true }
  );

  if (renewed) {
    // Re-snapshot credits.limit from the plan
    const plan = await PlanModel.findById(renewed.plan).lean();
    if (plan) {
      await UserModel.updateOne(
        { _id: renewed._id },
        { $set: { 'subscription.credits.limit': plan.credits } }
      );
    }
  }
}

export async function reserveCredits(userId: string, pipelineType: PipelineType): Promise<number> {
  await renewCycleIfExpired(userId);

  // Get the user's plan to look up credit weight
  const user = await UserModel.findOne({
    $or: [{ oderId: userId }, { _id: userId }],
  }).lean();

  if (!user?.plan) {
    throw new ApiError('NO_PLAN', 'No active plan found. Please contact support.', 403);
  }

  // Check if subscription is canceled and period has ended
  if (user.subscription?.status === 'canceled' && user.subscription.currentPeriodEnd < new Date()) {
    throw new ApiError('SUBSCRIPTION_ENDED', 'Your subscription has ended. Please reactivate your plan.', 403);
  }

  const plan = await PlanModel.findById(user.plan).lean();
  if (!plan) {
    throw new ApiError('PLAN_NOT_FOUND', 'Plan not found', 500);
  }

  const cost = plan.creditWeights[pipelineType];

  // Atomic reservation: only succeeds if user has enough credits
  const result = await UserModel.findOneAndUpdate(
    {
      $or: [{ oderId: userId }, { _id: userId }],
      $expr: {
        $lte: [
          { $add: ['$subscription.credits.used', cost] },
          '$subscription.credits.limit',
        ],
      },
    },
    { $inc: { 'subscription.credits.used': cost } },
    { new: true }
  );

  if (!result) {
    throw new ApiError(
      'INSUFFICIENT_CREDITS',
      'You have reached your credit limit for this billing cycle. Please upgrade your plan.',
      429
    );
  }

  return cost;
}

export async function rollbackCredits(userId: string, cost: number) {
  await UserModel.findOneAndUpdate(
    { $or: [{ oderId: userId }, { _id: userId }] },
    { $inc: { 'subscription.credits.used': -cost } }
  );
}
