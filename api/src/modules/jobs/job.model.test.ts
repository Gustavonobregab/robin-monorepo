import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import mongoose from 'mongoose';
import { JobModel } from './job.model';
import { isDuplicateKeyError } from '../../utils/mongo';

const MONGODB_URI = process.env.MONGODB_URI;

const payload = {
  type: 'text',
  operations: [{ type: 'trim' }],
  source: { kind: 'inline', text: 'hello' },
};

describe.skipIf(!MONGODB_URI)('job idempotency index', () => {
  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI!, { dbName: 'robin-test' });
    await JobModel.deleteMany({});
    await JobModel.init();
  });

  afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
  });

  test('same user cannot create two jobs with the same idempotency key', async () => {
    await JobModel.create({ userId: 'u1', status: 'created', payload, idempotencyKey: 'k1' });

    let error: unknown;
    try {
      await JobModel.create({ userId: 'u1', status: 'created', payload, idempotencyKey: 'k1' });
    } catch (err) {
      error = err;
    }

    expect(isDuplicateKeyError(error)).toBe(true);
    expect(await JobModel.countDocuments({ userId: 'u1', idempotencyKey: 'k1' })).toBe(1);
  });

  test('different users can reuse the same idempotency key', async () => {
    await JobModel.create({ userId: 'u2', status: 'created', payload, idempotencyKey: 'k1' });

    expect(await JobModel.countDocuments({ idempotencyKey: 'k1' })).toBe(2);
  });

  test('jobs without idempotency key are not constrained', async () => {
    await JobModel.create({ userId: 'u3', status: 'created', payload });
    await JobModel.create({ userId: 'u3', status: 'created', payload });

    expect(await JobModel.countDocuments({ userId: 'u3' })).toBe(2);
  });
});
