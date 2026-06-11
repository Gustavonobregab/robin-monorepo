import { UsageEventModel } from './usage.model';
import { subDays, startOfMonth, endOfMonth } from 'date-fns';
import { isDuplicateKeyError } from '../../utils/mongo';
import type {
  RecordUsageInput,
  RecordUsageResult,
  TimeRange,
  UsageAnalytics,
  CurrentUsage,
  UsageEvent,
  PipelineType,
} from './usage.types';

const RANGE_DAYS: Record<TimeRange, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };

// Sums every per-pipeline counter in one pass; irrelevant fields stay 0
const PIPELINE_TOTALS = {
  requests: { $sum: 1 },
  inputBytes: { $sum: '$inputBytes' },
  outputBytes: { $sum: '$outputBytes' },
  durationMs: { $sum: { $ifNull: ['$audio.durationMs', { $ifNull: ['$video.durationMs', 0] }] } },
  characters: { $sum: { $ifNull: ['$text.characterCount', 0] } },
  words: { $sum: { $ifNull: ['$text.wordCount', 0] } },
  megapixels: { $sum: { $ifNull: ['$image.megapixels', 0] } },
} as const;

type PipelineTotals = {
  requests: number;
  inputBytes: number;
  outputBytes: number;
  durationMs: number;
  characters: number;
  words: number;
  megapixels: number;
};

const EMPTY_TOTALS: PipelineTotals = {
  requests: 0,
  inputBytes: 0,
  outputBytes: 0,
  durationMs: 0,
  characters: 0,
  words: 0,
  megapixels: 0,
};

export class UsageService {
  // The unique index on idempotencyKey is the concurrency guarantee:
  // a duplicate insert means the event was already recorded.
  async record(input: RecordUsageInput): Promise<RecordUsageResult> {
    try {
      const event = await UsageEventModel.create({
        ...input,
        timestamp: new Date(),
      });

      return { eventId: event._id.toString() };
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        const existing = await UsageEventModel.findOne({
          idempotencyKey: input.idempotencyKey,
        }).lean();

        if (existing) return { eventId: existing._id.toString() };
      }

      throw err;
    }
  }

  async getAnalytics(userId: string, range: TimeRange = '30d'): Promise<UsageAnalytics> {
    const now = new Date();
    const startDate = subDays(now, RANGE_DAYS[range]);
    const match = { userId, timestamp: { $gte: startDate } };

    const [groups, daily, recent] = await Promise.all([
      this.totalsByPipeline(match),
      UsageEventModel.aggregate<{ _id: string; requests: number }>([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            requests: { $sum: 1 },
          },
        },
      ]),
      UsageEventModel.find(match).sort({ timestamp: -1 }).limit(10).lean(),
    ]);

    const summary: UsageAnalytics['summary'] = {
      totalRequests: 0,
      totalInputBytes: 0,
      totalOutputBytes: 0,
      byPipeline: {},
    };

    for (const [type, totals] of groups) {
      summary.totalRequests += totals.requests;
      summary.totalInputBytes += totals.inputBytes;
      summary.totalOutputBytes += totals.outputBytes;

      const base = {
        requests: totals.requests,
        totalInputBytes: totals.inputBytes,
        totalOutputBytes: totals.outputBytes,
      };

      switch (type) {
        case 'audio':
          summary.byPipeline.audio = { ...base, totalMinutes: totals.durationMs / 60_000 };
          break;
        case 'text':
          summary.byPipeline.text = { ...base, totalCharacters: totals.characters, totalWords: totals.words };
          break;
        case 'image':
          summary.byPipeline.image = { ...base, totalMegapixels: totals.megapixels };
          break;
        case 'video':
          summary.byPipeline.video = { ...base, totalMinutes: totals.durationMs / 60_000 };
          break;
      }
    }

    const requestsByDay = new Map(daily.map((day) => [day._id, day.requests]));
    const chart: UsageAnalytics['chart'] = [];
    const loopDate = new Date(startDate);

    while (loopDate <= now) {
      const key = loopDate.toISOString().slice(0, 10);
      chart.push({ date: key, requests: requestsByDay.get(key) ?? 0 });
      loopDate.setDate(loopDate.getDate() + 1);
    }

    return { summary, chart, recent: recent as unknown as UsageEvent[] };
  }

  async getCurrentUsage(userId: string, periodStart?: Date, periodEnd?: Date): Promise<CurrentUsage> {
    const now = new Date();
    const start = periodStart || startOfMonth(now);
    const end = periodEnd || endOfMonth(now);

    const groups = await this.totalsByPipeline({ userId, timestamp: { $gte: start, $lte: end } });
    const totals = (type: PipelineType) => groups.get(type) ?? EMPTY_TOTALS;

    return {
      period: { start, end },
      audio: {
        requests: totals('audio').requests,
        minutes: totals('audio').durationMs / 60_000,
        inputBytes: totals('audio').inputBytes,
      },
      text: {
        requests: totals('text').requests,
        characters: totals('text').characters,
        inputBytes: totals('text').inputBytes,
      },
      image: {
        requests: totals('image').requests,
        megapixels: totals('image').megapixels,
        inputBytes: totals('image').inputBytes,
      },
      video: {
        requests: totals('video').requests,
        minutes: totals('video').durationMs / 60_000,
        inputBytes: totals('video').inputBytes,
      },
    };
  }

  async getUserStats(userId: string) {
    const totalRequests = await UsageEventModel.countDocuments({ userId });
    return { totalRequests };
  }

  private async totalsByPipeline(match: Record<string, unknown>): Promise<Map<PipelineType, PipelineTotals>> {
    const groups = await UsageEventModel.aggregate<PipelineTotals & { _id: PipelineType }>([
      { $match: match },
      { $group: { _id: '$pipelineType', ...PIPELINE_TOTALS } },
    ]);

    return new Map(groups.map(({ _id, ...totals }) => [_id, totals]));
  }
}

export const usageService = new UsageService();
