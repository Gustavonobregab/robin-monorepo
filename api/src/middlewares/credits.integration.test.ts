import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import mongoose from 'mongoose';
import { reserveCredits, rollbackCredits } from './credits';
import { UserModel } from '../modules/users/users.model';
import { PlanModel } from '../modules/plans/plans.model';
import { ApiError } from '../utils/api-error';

const MONGODB_URI = process.env.MONGODB_URI;

const KB = 1024;
const MB = 1024 * 1024;

const WEIGHTS = {
  text: { credits: 1, perUnitBytes: 100 * KB },
  audio: { credits: 1, perUnitBytes: 5 * MB },
  image: { credits: 1, perUnitBytes: 2 * MB },
  video: { credits: 2, perUnitBytes: 5 * MB },
};

async function createUserWithCredits(limit: number, used = 0) {
  const plan = await PlanModel.create({
    name: 'Test',
    slug: `test-${new mongoose.Types.ObjectId().toString()}`,
    credits: limit,
    creditWeights: WEIGHTS,
    prices: { brl: 0, usd: 0 },
    features: { maxFileSize: 100 * MB, maxApiKeys: 5, webhooks: true },
    isPublic: false,
    isDefault: false,
    active: true,
  });

  const now = new Date();
  const user = await UserModel.create({
    name: 'Test User',
    email: `test-${plan.slug}@robin.test`,
    plan: plan._id,
    subscription: {
      status: 'active',
      credits: { limit, used },
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return user._id.toString();
}

describe.skipIf(!MONGODB_URI)('reserveCredits (integration)', () => {
  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI!, { dbName: 'robin-wood-test' });
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
    await PlanModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
  });

  test('charges size-based cost and increments used atomically', async () => {
    const userId = await createUserWithCredits(100);

    const cost = await reserveCredits(userId, 'text', 250 * KB);

    expect(cost).toBe(3);
    const user = await UserModel.findById(userId).lean();
    expect(user?.subscription?.credits.used).toBe(3);
  });

  test('rejects with INSUFFICIENT_CREDITS when the cost exceeds the remaining quota', async () => {
    const userId = await createUserWithCredits(2);

    let error: unknown;
    try {
      await reserveCredits(userId, 'audio', 25 * MB); // costs 5
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError & { code: string }).code).toBe('INSUFFICIENT_CREDITS');

    const user = await UserModel.findById(userId).lean();
    expect(user?.subscription?.credits.used).toBe(0);
  });

  test('rollback returns exactly the reserved amount', async () => {
    const userId = await createUserWithCredits(100);

    const cost = await reserveCredits(userId, 'audio', 12 * MB); // 3 credits
    await rollbackCredits(userId, cost);

    const user = await UserModel.findById(userId).lean();
    expect(user?.subscription?.credits.used).toBe(0);
  });

  test('concurrent reservations never overspend the quota', async () => {
    const userId = await createUserWithCredits(3);

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => reserveCredits(userId, 'text', 1 * KB)), // 1 credit each
    );

    const granted = results.filter((r) => r.status === 'fulfilled').length;
    expect(granted).toBe(3);

    const user = await UserModel.findById(userId).lean();
    expect(user?.subscription?.credits.used).toBe(3);
  });
});
