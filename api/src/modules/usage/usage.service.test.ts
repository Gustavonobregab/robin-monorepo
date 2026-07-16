import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import mongoose from 'mongoose';
import { usageService } from './usage.service';
import { UsageEventModel } from './usage.model';
import type { RecordUsageInput } from './usage.types';

const MONGODB_URI = process.env.MONGODB_URI;

// Real userIds are ObjectId strings; getCurrentUsage casts them to _id
const USER_A = new mongoose.Types.ObjectId().toString();
const USER_B = new mongoose.Types.ObjectId().toString();

const baseEvent = (userId: string, idempotencyKey: string): RecordUsageInput => ({
  idempotencyKey,
  userId,
  jobId: 'job-1',
  pipelineType: 'text',
  operations: ['trim'],
  inputBytes: 100,
  outputBytes: 50,
  processingMs: 10,
  text: { characterCount: 100, wordCount: 20, encoding: 'utf-8' },
});

describe.skipIf(!MONGODB_URI)('usageService', () => {
  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI!, { dbName: 'robin-test' });
    await UsageEventModel.deleteMany({});
    await UsageEventModel.init();
  });

  afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
  });

  test('duplicate idempotency key returns the existing event', async () => {
    const input = baseEvent(USER_A, 'dup-key');

    const first = await usageService.record(input);
    const second = await usageService.record(input);

    expect(second.eventId).toBe(first.eventId);
    expect(await UsageEventModel.countDocuments({ idempotencyKey: 'dup-key' })).toBe(1);
  });

  test('concurrent records with the same key produce exactly one event', async () => {
    const input = baseEvent(USER_A, 'race-key');

    const results = await Promise.all(
      Array.from({ length: 5 }, () => usageService.record(input)),
    );

    expect(new Set(results.map((r) => r.eventId)).size).toBe(1);
    expect(await UsageEventModel.countDocuments({ idempotencyKey: 'race-key' })).toBe(1);
  });

  test('getCurrentUsage aggregates totals per pipeline', async () => {
    await usageService.record({
      ...baseEvent(USER_B, 'agg-audio'),
      pipelineType: 'audio',
      inputBytes: 1000,
      text: undefined,
      audio: { durationMs: 120_000, format: 'mp3', sampleRate: 44_100, channels: 2 },
    });
    await usageService.record({
      ...baseEvent(USER_B, 'agg-text-1'),
      inputBytes: 200,
      text: { characterCount: 500, wordCount: 80, encoding: 'utf-8' },
    });
    await usageService.record({
      ...baseEvent(USER_B, 'agg-text-2'),
      inputBytes: 100,
      sync: true,
      jobId: undefined,
      text: { characterCount: 300, wordCount: 50, encoding: 'utf-8' },
    });

    const usage = await usageService.getCurrentUsage(USER_B);

    expect(usage.audio.requests).toBe(1);
    expect(usage.audio.minutes).toBe(2);
    expect(usage.audio.inputBytes).toBe(1000);
    expect(usage.text.requests).toBe(2);
    expect(usage.text.characters).toBe(800);
    expect(usage.text.inputBytes).toBe(300);
    expect(usage.image.requests).toBe(0);
    expect(usage.video.requests).toBe(0);
  });

  test('getAnalytics aggregates summary and chart', async () => {
    const analytics = await usageService.getAnalytics(USER_B, '7d');

    expect(analytics.summary.totalRequests).toBe(3);
    expect(analytics.summary.totalInputBytes).toBe(1300);
    expect(analytics.summary.byPipeline.audio?.totalMinutes).toBe(2);
    expect(analytics.summary.byPipeline.text?.totalCharacters).toBe(800);
    expect(analytics.summary.byPipeline.text?.totalWords).toBe(130);
    expect(analytics.summary.byPipeline.image).toBeUndefined();

    expect(analytics.chart.reduce((acc, day) => acc + day.requests, 0)).toBe(3);
    expect(analytics.recent.length).toBe(3);
  });
});
