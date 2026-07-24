import mongoose from 'mongoose';
import { subDays, subHours, startOfDay } from 'date-fns';
import { UserModel } from '../users/users.model';
import { JobModel } from '../jobs/job.model';
import { UsageEventModel } from '../usage/usage.model';
import { WebhookDeliveryModel } from '../webhooks/webhooks.model';
import { ApiKeyModel } from '../keys/keys.model';
import { queues } from '../../queues/queue';
import { redisConnection } from '../../config/redis';
import { ApiError } from '../../utils/api-error';
import type {
  AdminOverview,
  AdminUserList,
  AdminUserDetail,
  AdminJobList,
  AdminMetrics,
  AdminDailyMetric,
  AdminHealth,
} from './admin.types';

const PING_TIMEOUT_MS = 2_000;

// Jobs/usage/keys store the session userId; users are matched by both id shapes
function userIdKeys(user: { _id: unknown; oderId?: string }): string[] {
  const keys = [String(user._id)];
  if (user.oderId) keys.push(user.oderId);
  return keys;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function processingMs(job: { createdAt?: Date; completedAt?: Date | null }): number | null {
  if (!job.createdAt || !job.completedAt) return null;
  return job.completedAt.getTime() - job.createdAt.getTime();
}

async function timedPing(ping: () => Promise<unknown>): Promise<{ ok: boolean; latencyMs: number }> {
  const start = performance.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      ping(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('ping timeout')), PING_TIMEOUT_MS);
      }),
    ]);
    return { ok: true, latencyMs: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - start) };
  } finally {
    clearTimeout(timer);
  }
}

export class AdminService {
  async getOverview(): Promise<AdminOverview> {
    const now = new Date();
    const since7d = subDays(now, 7);
    const since24h = subHours(now, 24);

    const [usersTotal, usersNew7d, usersNew30d, subscriptions, jobGroups, usageGroups, webhookGroups] =
      await Promise.all([
        UserModel.countDocuments(),
        UserModel.countDocuments({ createdAt: { $gte: since7d } }),
        UserModel.countDocuments({ createdAt: { $gte: subDays(now, 30) } }),
        UserModel.aggregate<{
          byPlan: { planName: string; count: number }[];
          byStatus: { _id: string | null; count: number }[];
        }>([
          {
            $facet: {
              byPlan: [
                { $match: { plan: { $ne: null } } },
                { $group: { _id: '$plan', count: { $sum: 1 } } },
                { $lookup: { from: 'plans', localField: '_id', foreignField: '_id', as: 'plan' } },
                {
                  $project: {
                    _id: 0,
                    planName: { $ifNull: [{ $first: '$plan.name' }, 'Unknown'] },
                    count: 1,
                  },
                },
                { $sort: { count: -1 } },
              ],
              byStatus: [{ $group: { _id: '$subscription.status', count: { $sum: 1 } } }],
            },
          },
        ]),
        JobModel.aggregate<{ _id: string; count: number }>([
          { $match: { createdAt: { $gte: since24h } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        UsageEventModel.aggregate<{
          _id: string;
          events: number;
          creditsConsumed: number;
          inputBytes: number;
          outputBytes: number;
        }>([
          { $match: { timestamp: { $gte: since7d } } },
          {
            $group: {
              _id: '$pipelineType',
              events: { $sum: 1 },
              creditsConsumed: { $sum: { $ifNull: ['$creditsConsumed', 0] } },
              inputBytes: { $sum: '$inputBytes' },
              outputBytes: { $sum: '$outputBytes' },
            },
          },
        ]),
        WebhookDeliveryModel.aggregate<{ _id: string; count: number }>([
          { $match: { createdAt: { $gte: since7d } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
      ]);

    const subStatus = new Map(subscriptions[0]!.byStatus.map((s) => [s._id, s.count]));
    const jobStatus = new Map(jobGroups.map((g) => [g._id, g.count]));

    const usage7d = { events: 0, creditsConsumed: 0, inputBytes: 0, outputBytes: 0 };
    for (const group of usageGroups) {
      usage7d.events += group.events;
      usage7d.creditsConsumed += group.creditsConsumed;
      usage7d.inputBytes += group.inputBytes;
      usage7d.outputBytes += group.outputBytes;
    }

    const webhookStatus = new Map(webhookGroups.map((g) => [g._id, g.count]));
    const webhookDeliveries = webhookGroups.reduce((sum, g) => sum + g.count, 0);

    return {
      users: { total: usersTotal, new7d: usersNew7d, new30d: usersNew30d },
      subscriptions: {
        byPlan: subscriptions[0]!.byPlan,
        active: subStatus.get('active') ?? 0,
        pastDue: subStatus.get('past_due') ?? 0,
        canceled: subStatus.get('canceled') ?? 0,
      },
      jobs24h: {
        total: jobGroups.reduce((sum, g) => sum + g.count, 0),
        completed: jobStatus.get('completed') ?? 0,
        failed: jobStatus.get('failed') ?? 0,
        processing: jobStatus.get('processing') ?? 0,
      },
      usage7d: {
        ...usage7d,
        byPipeline: usageGroups.map((g) => ({
          pipelineType: g._id,
          events: g.events,
          creditsConsumed: g.creditsConsumed,
        })),
      },
      webhooks7d: {
        deliveries: webhookDeliveries,
        failed: webhookStatus.get('failed') ?? 0,
      },
    };
  }

  async listUsers(params: { search?: string; page: number; limit: number }): Promise<AdminUserList> {
    const { search, page, limit } = params;
    const query = search
      ? {
          $or: [
            { name: { $regex: escapeRegex(search), $options: 'i' } },
            { email: { $regex: escapeRegex(search), $options: 'i' } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      UserModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate<{ plan: { name: string } | null }>('plan', 'name')
        .lean(),
      UserModel.countDocuments(query),
    ]);

    const idKeys = users.flatMap(userIdKeys);
    const lastEvents = idKeys.length
      ? await UsageEventModel.aggregate<{ _id: string; lastActivityAt: Date }>([
          { $match: { userId: { $in: idKeys } } },
          { $group: { _id: '$userId', lastActivityAt: { $max: '$timestamp' } } },
        ])
      : [];
    const lastActivityByUserId = new Map(lastEvents.map((e) => [e._id, e.lastActivityAt]));

    return {
      items: users.map((user) => ({
        id: String(user._id),
        name: user.name,
        email: user.email,
        planName: user.plan?.name ?? null,
        subscriptionStatus: user.subscription?.status ?? null,
        creditsUsed: user.subscription?.credits?.used ?? 0,
        creditsLimit: user.subscription?.credits?.limit ?? 0,
        createdAt: user.createdAt,
        lastActivityAt: userIdKeys(user).reduce<Date | null>((latest, key) => {
          const activity = lastActivityByUserId.get(key);
          return activity && (!latest || activity > latest) ? activity : latest;
        }, null),
      })),
      total,
      page,
      limit,
    };
  }

  async getUser(id: string): Promise<AdminUserDetail> {
    const user = await UserModel.findOne({
      $or: [{ oderId: id }, ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])],
    })
      .populate<{ plan: { name: string } | null }>('plan', 'name')
      .lean();

    if (!user) {
      throw new ApiError('USER_NOT_FOUND', 'User not found', 404);
    }

    const idKeys = userIdKeys(user);
    const [keysCount, usageGroups, recentJobs] = await Promise.all([
      ApiKeyModel.countDocuments({ userId: { $in: idKeys }, status: 'active' }),
      UsageEventModel.aggregate<{
        events: number;
        creditsConsumed: number;
        inputBytes: number;
        outputBytes: number;
      }>([
        { $match: { userId: { $in: idKeys }, timestamp: { $gte: subDays(new Date(), 30) } } },
        {
          $group: {
            _id: null,
            events: { $sum: 1 },
            creditsConsumed: { $sum: { $ifNull: ['$creditsConsumed', 0] } },
            inputBytes: { $sum: '$inputBytes' },
            outputBytes: { $sum: '$outputBytes' },
          },
        },
      ]),
      JobModel.find({ userId: { $in: idKeys } })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('status payload.type createdAt completedAt')
        .lean(),
    ]);

    const usage = usageGroups[0] ?? { events: 0, creditsConsumed: 0, inputBytes: 0, outputBytes: 0 };

    // gatewayCustomerIds/gatewaySubscriptionId stay internal — least exposure
    let subscription: AdminUserDetail['subscription'] = null;
    if (user.subscription) {
      const { gatewayCustomerIds, gatewaySubscriptionId, ...rest } = user.subscription;
      subscription = { ...rest, planName: user.plan?.name ?? null };
    }

    return {
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image ?? null,
        profile: user.profile ?? null,
        createdAt: user.createdAt,
      },
      subscription,
      keysCount,
      usage30d: {
        events: usage.events,
        creditsConsumed: usage.creditsConsumed,
        inputBytes: usage.inputBytes,
        outputBytes: usage.outputBytes,
      },
      recentJobs: recentJobs.map((job) => ({
        id: String(job._id),
        type: job.payload?.type ?? 'unknown',
        status: job.status,
        createdAt: job.createdAt,
        processingMs: processingMs(job),
      })),
    };
  }

  async listJobs(params: { status?: string; page: number; limit: number }): Promise<AdminJobList> {
    const { status, page, limit } = params;
    const query = status ? { status } : {};

    const [jobs, total] = await Promise.all([
      JobModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('userId status payload.type createdAt completedAt error')
        .lean(),
      JobModel.countDocuments(query),
    ]);

    const jobUserIds = [...new Set(jobs.map((job) => job.userId))];
    const objectIds = jobUserIds.filter((value) => mongoose.isValidObjectId(value));
    const users = jobUserIds.length
      ? await UserModel.find({
          $or: [{ oderId: { $in: jobUserIds } }, { _id: { $in: objectIds } }],
        })
          .select('email oderId')
          .lean()
      : [];

    const emailByUserId = new Map<string, string>();
    for (const user of users) {
      for (const key of userIdKeys(user)) emailByUserId.set(key, user.email);
    }

    return {
      items: jobs.map((job) => ({
        id: String(job._id),
        userEmail: emailByUserId.get(job.userId) ?? null,
        type: job.payload?.type ?? 'unknown',
        status: job.status,
        createdAt: job.createdAt,
        processingMs: processingMs(job),
        error: job.error ?? null,
      })),
      total,
      page,
      limit,
    };
  }

  async getMetrics(days: number): Promise<AdminMetrics> {
    const now = new Date();
    const start = startOfDay(subDays(now, days - 1));
    const byDay = (dateField: string) => ({
      $dateToString: { format: '%Y-%m-%d', date: `$${dateField}` },
    });

    const [userDaily, jobDaily, usageDaily] = await Promise.all([
      UserModel.aggregate<{ _id: string; newUsers: number }>([
        { $match: { createdAt: { $gte: start } } },
        { $group: { _id: byDay('createdAt'), newUsers: { $sum: 1 } } },
      ]),
      JobModel.aggregate<{ _id: string; jobs: number; jobsFailed: number }>([
        { $match: { createdAt: { $gte: start } } },
        {
          $group: {
            _id: byDay('createdAt'),
            jobs: { $sum: 1 },
            jobsFailed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          },
        },
      ]),
      UsageEventModel.aggregate<{
        _id: string;
        creditsConsumed: number;
        inputBytes: number;
        outputBytes: number;
      }>([
        { $match: { timestamp: { $gte: start } } },
        {
          $group: {
            _id: byDay('timestamp'),
            creditsConsumed: { $sum: { $ifNull: ['$creditsConsumed', 0] } },
            inputBytes: { $sum: '$inputBytes' },
            outputBytes: { $sum: '$outputBytes' },
          },
        },
      ]),
    ]);

    const usersByDate = new Map(userDaily.map((d) => [d._id, d]));
    const jobsByDate = new Map(jobDaily.map((d) => [d._id, d]));
    const usageByDate = new Map(usageDaily.map((d) => [d._id, d]));

    const result: AdminDailyMetric[] = [];
    const loopDate = new Date(start);
    while (loopDate <= now) {
      const date = loopDate.toISOString().slice(0, 10);
      result.push({
        date,
        newUsers: usersByDate.get(date)?.newUsers ?? 0,
        jobs: jobsByDate.get(date)?.jobs ?? 0,
        jobsFailed: jobsByDate.get(date)?.jobsFailed ?? 0,
        creditsConsumed: usageByDate.get(date)?.creditsConsumed ?? 0,
        inputBytes: usageByDate.get(date)?.inputBytes ?? 0,
        outputBytes: usageByDate.get(date)?.outputBytes ?? 0,
      });
      loopDate.setDate(loopDate.getDate() + 1);
    }

    return { days: result };
  }

  async getHealth(): Promise<AdminHealth> {
    const [mongo, redis] = await Promise.all([
      timedPing(() => mongoose.connection.db!.admin().ping()),
      // maxRetriesPerRequest: null means a ping to a down Redis queues forever instead of rejecting
      redisConnection.status === 'ready'
        ? timedPing(() => redisConnection.ping())
        : Promise.resolve({ ok: false, latencyMs: 0 }),
    ]);

    // getJobCounts also queues forever when Redis is down
    const queueCounts = redis.ok
      ? await Promise.all(
          Object.values(queues).map(async (queue) => {
            const counts = await queue.getJobCounts('waiting', 'active', 'failed', 'delayed');
            return {
              name: queue.name,
              waiting: counts.waiting ?? 0,
              active: counts.active ?? 0,
              failed: counts.failed ?? 0,
              delayed: counts.delayed ?? 0,
            };
          }),
        )
      : Object.values(queues).map((queue) => ({
          name: queue.name,
          waiting: 0,
          active: 0,
          failed: 0,
          delayed: 0,
        }));

    return { mongo, redis, queues: queueCounts, uptime: process.uptime() };
  }
}

export const adminService = new AdminService();
