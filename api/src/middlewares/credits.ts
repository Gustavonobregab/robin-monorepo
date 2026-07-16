import { addDays } from 'date-fns';
import { UserModel } from '../modules/users/users.model';
import { PlanModel } from '../modules/plans/plans.model';
import { ApiError } from '../utils/api-error';
import type { PipelineType } from '../modules/usage/usage.types';
import type { CreditWeight } from '../modules/plans/plans.types';

// credits charged per started perUnitBytes of input, minimum one unit
export function calculateCreditCost(weight: CreditWeight, inputBytes: number): number {
  return weight.credits * Math.max(1, Math.ceil(inputBytes / weight.perUnitBytes));
}

export const CYCLE_DAYS = 30;

// Must land on a period covering now, or each request renews again and re-zeroes used
export function advanceCycle(periodEnd: Date, now: Date): { start: Date; end: Date } {
  let start = periodEnd;
  let end = addDays(periodEnd, CYCLE_DAYS);

  while (end <= now) {
    start = end;
    end = addDays(end, CYCLE_DAYS);
  }

  return { start, end };
}

async function renewCycleIfExpired(userId: string) {
  const now = new Date();

  const user = await UserModel.findOne({
    $or: [{ oderId: userId }, { _id: userId }],
  }).lean();

  const subscription = user?.subscription;
  if (!user || !subscription) return;

  // Paid cycles renew only on a gateway payment webhook — renewing here would hand out
  // free credits. Exception: sweep canceled+expired to free (AbacatePay has no end event).
  if (subscription.gateway) {
    if (
      subscription.status === 'canceled' &&
      subscription.currentPeriodEnd &&
      subscription.currentPeriodEnd < now
    ) {
      const freePlan = await PlanModel.findOne({ isDefault: true, active: true }).lean();
      if (!freePlan) return;
      await UserModel.updateOne(
        { _id: user._id, 'subscription.currentPeriodEnd': subscription.currentPeriodEnd },
        {
          $set: {
            plan: freePlan._id,
            subscription: {
              status: 'active',
              gatewayCustomerIds: subscription.gatewayCustomerIds,
              credits: { limit: freePlan.credits, used: 0 },
              currentPeriodStart: now,
              currentPeriodEnd: addDays(now, CYCLE_DAYS),
              planChangedAt: now,
            },
          },
        },
      );
    }
    return;
  }

  if (subscription.status !== 'active') return;
  if (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > now) return;

  const plan = await PlanModel.findById(user.plan).lean();
  if (!plan) return;

  const { start, end } = advanceCycle(subscription.currentPeriodEnd, now);

  // CAS on the old period end: only one concurrent renewal lands, and the quota rides the same write
  await UserModel.updateOne(
    { _id: user._id, 'subscription.currentPeriodEnd': subscription.currentPeriodEnd },
    {
      $set: {
        'subscription.currentPeriodStart': start,
        'subscription.currentPeriodEnd': end,
        'subscription.credits.used': 0,
        'subscription.credits.limit': plan.credits,
      },
    },
  );
}

export async function reserveCredits(
  userId: string,
  pipelineType: PipelineType,
  inputBytes: number,
): Promise<number> {
  await renewCycleIfExpired(userId);

  const user = await UserModel.findOne({
    $or: [{ oderId: userId }, { _id: userId }],
  }).lean();

  if (!user?.plan) {
    throw new ApiError('NO_PLAN', 'No active plan found. Please contact support.', 403);
  }

  if (user.subscription?.status === 'canceled' && user.subscription.currentPeriodEnd < new Date()) {
    throw new ApiError('SUBSCRIPTION_ENDED', 'Your subscription has ended. Please reactivate your plan.', 403);
  }

  const plan = await PlanModel.findById(user.plan).lean();
  if (!plan) {
    throw new ApiError('PLAN_NOT_FOUND', 'Plan not found', 500);
  }

  const cost = calculateCreditCost(plan.creditWeights[pipelineType], inputBytes);

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
