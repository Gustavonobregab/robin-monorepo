import { UsageEventModel } from './usage.model';
import { subDays, format, startOfMonth, endOfMonth } from 'date-fns';
import type {
  RecordUsageInput,
  RecordUsageResult,
  TimeRange,
  UsageAnalytics,
  CurrentUsage,
  UsageEvent,
} from './usage.types';

export class UsageService {
  async record(input: RecordUsageInput): Promise<RecordUsageResult> {
    const existingEvent = await UsageEventModel.findOne({
      idempotencyKey: input.idempotencyKey,
    });

    if (existingEvent) {
      return { eventId: existingEvent._id.toString() };
    }

    const event = await UsageEventModel.create({
      idempotencyKey: input.idempotencyKey,
      userId: input.userId,
      jobId: input.jobId,
      pipelineType: input.pipelineType,
      operations: input.operations,
      inputBytes: input.inputBytes,
      outputBytes: input.outputBytes,
      processingMs: input.processingMs,
      timestamp: new Date(),
      audio: input.audio,
      text: input.text,
      image: input.image,
      video: input.video,
      creditsConsumed: input.creditsConsumed,
    });

    return { eventId: event._id.toString() };
  }

  async getAnalytics(userId: string, range: TimeRange = '30d'): Promise<UsageAnalytics> {
    const now = new Date();
    const rangeDays: Record<TimeRange, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const startDate = subDays(now, rangeDays[range]);

    const events = await UsageEventModel.find({
      userId,
      timestamp: { $gte: startDate },
    }).sort({ timestamp: -1 }).lean();

    // Summary
    const totalRequests = events.length;
    const totalInputBytes = events.reduce((acc, e) => acc + e.inputBytes, 0);
    const totalOutputBytes = events.reduce((acc, e) => acc + e.outputBytes, 0);

    // Per-pipeline breakdown
    const byPipeline: UsageAnalytics['summary']['byPipeline'] = {};

    const audioEvents = events.filter(e => e.pipelineType === 'audio');
    if (audioEvents.length > 0) {
      byPipeline.audio = {
        requests: audioEvents.length,
        totalInputBytes: audioEvents.reduce((acc, e) => acc + e.inputBytes, 0),
        totalOutputBytes: audioEvents.reduce((acc, e) => acc + e.outputBytes, 0),
        totalMinutes: audioEvents.reduce((acc, e) => acc + (e.audio?.durationMs || 0), 0) / 60_000,
      };
    }

    const textEvents = events.filter(e => e.pipelineType === 'text');
    if (textEvents.length > 0) {
      byPipeline.text = {
        requests: textEvents.length,
        totalInputBytes: textEvents.reduce((acc, e) => acc + e.inputBytes, 0),
        totalOutputBytes: textEvents.reduce((acc, e) => acc + e.outputBytes, 0),
        totalCharacters: textEvents.reduce((acc, e) => acc + (e.text?.characterCount || 0), 0),
        totalWords: textEvents.reduce((acc, e) => acc + (e.text?.wordCount || 0), 0),
      };
    }

    const imageEvents = events.filter(e => e.pipelineType === 'image');
    if (imageEvents.length > 0) {
      byPipeline.image = {
        requests: imageEvents.length,
        totalInputBytes: imageEvents.reduce((acc, e) => acc + e.inputBytes, 0),
        totalOutputBytes: imageEvents.reduce((acc, e) => acc + e.outputBytes, 0),
        totalMegapixels: imageEvents.reduce((acc, e) => acc + (e.image?.megapixels || 0), 0),
      };
    }

    const videoEvents = events.filter(e => e.pipelineType === 'video');
    if (videoEvents.length > 0) {
      byPipeline.video = {
        requests: videoEvents.length,
        totalInputBytes: videoEvents.reduce((acc, e) => acc + e.inputBytes, 0),
        totalOutputBytes: videoEvents.reduce((acc, e) => acc + e.outputBytes, 0),
        totalMinutes: videoEvents.reduce((acc, e) => acc + (e.video?.durationMs || 0), 0) / 60_000,
      };
    }

    // Chart: daily request counts
    const chartMap = new Map<string, number>();
    let loopDate = new Date(startDate);
    while (loopDate <= now) {
      chartMap.set(format(loopDate, 'yyyy-MM-dd'), 0);
      loopDate.setDate(loopDate.getDate() + 1);
    }
    events.forEach(e => {
      const key = format(new Date(e.timestamp), 'yyyy-MM-dd');
      if (chartMap.has(key)) {
        chartMap.set(key, (chartMap.get(key) || 0) + 1);
      }
    });
    const chart = Array.from(chartMap.entries()).map(([date, requests]) => ({ date, requests }));

    // Recent: last 10 raw events
    const recent = events.slice(0, 10) as unknown as UsageEvent[];

    return {
      summary: { totalRequests, totalInputBytes, totalOutputBytes, byPipeline },
      chart,
      recent,
    };
  }

  async getCurrentUsage(userId: string): Promise<CurrentUsage> {
    const now = new Date();
    const periodStart = startOfMonth(now);
    const periodEnd = endOfMonth(now);

    const events = await UsageEventModel.find({
      userId,
      timestamp: { $gte: periodStart, $lte: periodEnd },
    }).lean();

    const audioEvents = events.filter(e => e.pipelineType === 'audio');
    const textEvents = events.filter(e => e.pipelineType === 'text');
    const imageEvents = events.filter(e => e.pipelineType === 'image');
    const videoEvents = events.filter(e => e.pipelineType === 'video');

    return {
      period: { start: periodStart, end: periodEnd },
      audio: {
        requests: audioEvents.length,
        minutes: audioEvents.reduce((acc, e) => acc + (e.audio?.durationMs || 0), 0) / 60_000,
        inputBytes: audioEvents.reduce((acc, e) => acc + e.inputBytes, 0),
      },
      text: {
        requests: textEvents.length,
        characters: textEvents.reduce((acc, e) => acc + (e.text?.characterCount || 0), 0),
        inputBytes: textEvents.reduce((acc, e) => acc + e.inputBytes, 0),
      },
      image: {
        requests: imageEvents.length,
        megapixels: imageEvents.reduce((acc, e) => acc + (e.image?.megapixels || 0), 0),
        inputBytes: imageEvents.reduce((acc, e) => acc + e.inputBytes, 0),
      },
      video: {
        requests: videoEvents.length,
        minutes: videoEvents.reduce((acc, e) => acc + (e.video?.durationMs || 0), 0) / 60_000,
        inputBytes: videoEvents.reduce((acc, e) => acc + e.inputBytes, 0),
      },
    };
  }

  async getUserStats(userId: string) {
    const totalRequests = await UsageEventModel.countDocuments({ userId });
    return { totalRequests };
  }
}

export const usageService = new UsageService();
