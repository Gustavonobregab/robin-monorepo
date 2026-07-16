import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import mongoose from 'mongoose';
import { addDays } from 'date-fns';
import { billingService } from './billing.service';
import { BillingEventModel } from './billing-events.model';
import { UserModel } from '../users/users.model';
import { PlanModel } from '../plans/plans.model';
import { reserveCredits } from '../../middlewares/credits';
import type { BillingEvent } from './billing.types';

const MONGODB_URI = process.env.MONGODB_URI;

const KB = 1024;
const MB = 1024 * 1024;
const WEIGHTS = {
  text: { credits: 1, perUnitBytes: 100 * KB },
  audio: { credits: 1, perUnitBytes: 5 * MB },
  image: { credits: 1, perUnitBytes: 2 * MB },
  video: { credits: 2, perUnitBytes: 5 * MB },
};

function uid() {
  return new mongoose.Types.ObjectId().toString();
}

async function createPlan(overrides: Partial<Parameters<typeof PlanModel.create>[0]> = {}) {
  return PlanModel.create({
    name: 'Paid Test',
    slug: `paid-${uid()}`,
    credits: 1000,
    creditWeights: WEIGHTS,
    prices: { usd: 19 },
    features: { maxFileSize: 100 * MB, maxApiKeys: 5, webhooks: true },
    isPublic: false,
    isDefault: false,
    active: true,
    ...overrides,
  });
}

async function createUser() {
  return UserModel.create({
    name: 'Billing Test',
    email: `billing-${uid()}@robin.test`,
    subscription: {
      status: 'active',
      credits: { limit: 100, used: 40 },
      currentPeriodStart: new Date(),
      currentPeriodEnd: addDays(new Date(), 30),
    },
  });
}

function activatedEvent(
  userId: string,
  planSlug: string,
  subId: string,
): Extract<BillingEvent, { type: 'subscription_activated' }> {
  return {
    type: 'subscription_activated',
    gateway: 'stripe',
    eventId: `evt_${uid()}`,
    userId,
    planSlug,
    customerId: `cus_${uid()}`,
    subscriptionId: subId,
    periodStart: new Date(),
    periodEnd: addDays(new Date(), 30),
  };
}

describe.skipIf(!MONGODB_URI)('billingService.handleEvent', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI!, { dbName: 'robin-test' });
    }
    await BillingEventModel.init(); // ensure the unique index exists
  });

  afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.connection.close();
  });

  test('activation links the gateway subscription and grants full credits', async () => {
    const plan = await createPlan();
    const user = await createUser();
    const subId = `sub_${uid()}`;

    await billingService.handleEvent(activatedEvent(String(user._id), plan.slug, subId));

    const updated = await UserModel.findById(user._id).lean();
    expect(String(updated!.plan)).toBe(String(plan._id));
    expect(updated!.subscription!.gateway).toBe('stripe');
    expect(updated!.subscription!.gatewaySubscriptionId).toBe(subId);
    expect(updated!.subscription!.credits).toEqual({ limit: 1000, used: 0 });
  });

  test('duplicate event ids are applied exactly once', async () => {
    const plan = await createPlan();
    const user = await createUser();
    const subId = `sub_${uid()}`;
    const event = activatedEvent(String(user._id), plan.slug, subId);

    await billingService.handleEvent(event);
    // burn some credits, then replay the same event — it must NOT re-reset
    await UserModel.updateOne({ _id: user._id }, { $set: { 'subscription.credits.used': 77 } });
    await billingService.handleEvent(event);

    const updated = await UserModel.findById(user._id).lean();
    expect(updated!.subscription!.credits.used).toBe(77);
  });

  test('renewal resets usage and advances the period', async () => {
    const plan = await createPlan();
    const user = await createUser();
    const subId = `sub_${uid()}`;
    await billingService.handleEvent(activatedEvent(String(user._id), plan.slug, subId));
    await UserModel.updateOne({ _id: user._id }, { $set: { 'subscription.credits.used': 500 } });

    const periodEnd = addDays(new Date(), 60);
    await billingService.handleEvent({
      type: 'subscription_renewed',
      gateway: 'stripe',
      eventId: `evt_${uid()}`,
      subscriptionId: subId,
      periodStart: addDays(new Date(), 30),
      periodEnd,
    });

    const updated = await UserModel.findById(user._id).lean();
    expect(updated!.subscription!.credits.used).toBe(0);
    expect(updated!.subscription!.status).toBe('active');
    expect(updated!.subscription!.currentPeriodEnd!.getTime()).toBe(periodEnd.getTime());
  });

  test('payment failure marks past_due; deletion falls back to the free plan', async () => {
    // Use the environment's real default plan when one exists (dev DB is seeded)
    const free =
      (await PlanModel.findOne({ isDefault: true, active: true }).lean()) ??
      (await createPlan({ slug: `free-${uid()}`, credits: 100, isDefault: true }));
    const plan = await createPlan();
    const user = await createUser();
    const subId = `sub_${uid()}`;
    await billingService.handleEvent(activatedEvent(String(user._id), plan.slug, subId));

    await billingService.handleEvent({
      type: 'subscription_payment_failed',
      gateway: 'stripe',
      eventId: `evt_${uid()}`,
      subscriptionId: subId,
    });
    let updated = await UserModel.findById(user._id).lean();
    expect(updated!.subscription!.status).toBe('past_due');

    await billingService.handleEvent({
      type: 'subscription_deleted',
      gateway: 'stripe',
      eventId: `evt_${uid()}`,
      subscriptionId: subId,
    });
    updated = await UserModel.findById(user._id).lean();
    expect(String(updated!.plan)).toBe(String(free._id));
    expect(updated!.subscription!.gateway).toBeUndefined();
    expect(updated!.subscription!.credits).toEqual({ limit: free.credits, used: 0 });
  });

  test('lazy internal renewal skips gateway-driven subscriptions', async () => {
    const plan = await createPlan();
    const user = await createUser();
    const subId = `sub_${uid()}`;
    await billingService.handleEvent(activatedEvent(String(user._id), plan.slug, subId));

    // Force an expired period: without the gateway guard, reserveCredits would
    // lazily renew and hand out free credits.
    const staleEnd = addDays(new Date(), -5);
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          'subscription.currentPeriodEnd': staleEnd,
          'subscription.credits.used': 900,
        },
      },
    );

    await reserveCredits(String(user._id), 'text', 1);

    const updated = await UserModel.findById(user._id).lean();
    expect(updated!.subscription!.credits.used).toBe(901); // not reset to 0/1
    expect(updated!.subscription!.currentPeriodEnd!.getTime()).toBe(staleEnd.getTime());
  });

  test('canceled gateway subscription past its period sweeps to the free plan on next request', async () => {
    const free =
      (await PlanModel.findOne({ isDefault: true, active: true }).lean()) ??
      (await createPlan({ slug: `free-${uid()}`, credits: 100, isDefault: true }));
    const plan = await createPlan();
    const user = await createUser();
    const subId = `sub_${uid()}`;
    await billingService.handleEvent(activatedEvent(String(user._id), plan.slug, subId));
    await billingService.handleEvent({
      type: 'subscription_canceled',
      gateway: 'abacatepay',
      eventId: `evt_${uid()}`,
      subscriptionId: subId,
    });
    await UserModel.updateOne(
      { _id: user._id },
      { $set: { 'subscription.currentPeriodEnd': addDays(new Date(), -1) } },
    );

    await reserveCredits(String(user._id), 'text', 1);

    const updated = await UserModel.findById(user._id).lean();
    expect(String(updated!.plan)).toBe(String(free._id));
    expect(updated!.subscription!.status).toBe('active');
    expect(updated!.subscription!.gateway).toBeUndefined();
    // customer map survives the downgrade for future checkouts
    expect(updated!.subscription!.gatewayCustomerIds?.stripe).toBeDefined();
  });

  test('activation after a plan switch replaces the subscription and keeps the customer map', async () => {
    const planA = await createPlan();
    const planB = await createPlan();
    const user = await createUser();
    await billingService.handleEvent(activatedEvent(String(user._id), planA.slug, `sub_${uid()}`));

    const newSub = `sub_${uid()}`;
    await billingService.handleEvent({
      ...activatedEvent(String(user._id), planB.slug, newSub),
      gateway: 'abacatepay',
      customerId: 'cust_abacate_1',
    });

    const updated = await UserModel.findById(user._id).lean();
    expect(String(updated!.plan)).toBe(String(planB._id));
    expect(updated!.subscription!.gatewaySubscriptionId).toBe(newSub);
    expect(updated!.subscription!.gateway).toBe('abacatepay');
    expect(updated!.subscription!.gatewayCustomerIds?.abacatepay).toBe('cust_abacate_1');
    expect(updated!.subscription!.gatewayCustomerIds?.stripe).toBeDefined(); // preserved
  });
});
