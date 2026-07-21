import { createHmac } from 'crypto';
import { JobModel } from '../jobs/job.model';
import { UserModel } from '../users/users.model';
import { ensureWebhookSecret } from '../users/users.service';
import { WebhookDeliveryModel } from './webhooks.model';
import type { WebhookDelivery, WebhookDeliveryListItem, WebhookDeliveryListQuery } from './webhooks.types';
import type { WebhookEvent } from '../../queues/webhook.queue';

const DELIVERY_TIMEOUT_MS = 10_000;
const OBJECT_ID = /^[a-f0-9]{24}$/;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const log = (jobId: string, msg: string) => console.log(`[WEBHOOK:${jobId}] ${msg}`);

// Documented contract: receivers verify HMAC-SHA256 over "{timestamp}.{body}"
export function signWebhookPayload(secret: string, timestamp: string, body: string): string {
  return `sha256=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
}

type WebhookTarget = {
  job: NonNullable<Awaited<ReturnType<typeof resolveJob>>>;
  user: NonNullable<Awaited<ReturnType<typeof resolveUser>>>;
  url: string;
};

const resolveJob = (jobId: string) => JobModel.findById(jobId).lean();
const resolveUser = (userId: string) =>
  UserModel.findOne({ $or: [{ oderId: userId }, { _id: userId }] }).lean();

async function resolveWebhookTarget(jobId: string): Promise<WebhookTarget | null> {
  const job = await resolveJob(jobId);
  if (!job) return null;

  const user = await resolveUser(job.userId);
  if (!user) return null;

  const url = (job.payload as { webhookUrl?: string } | undefined)?.webhookUrl ?? user.webhookUrl;
  if (!url) return null;

  return { job, user, url };
}

export class WebhooksService {
  // Telemetry to the processors: failing to enqueue must never fail a job that succeeded
  async enqueueJobWebhook(jobId: string, event: WebhookEvent): Promise<void> {
    try {
      const target = await resolveWebhookTarget(jobId);
      if (!target) return;

      const { queues } = await import('../../queues/queue');
      // BullMQ rejects custom ids containing ':'
      await queues.webhook.add(event, { jobId, event }, { jobId: `${jobId}-${event}` });
    } catch (err) {
      log(jobId, `Failed to enqueue ${event}: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Throws on any delivery failure so BullMQ retries with backoff.
  async deliverJobWebhook(jobId: string, event: WebhookEvent, attempt = 1): Promise<void> {
    const target = await resolveWebhookTarget(jobId);
    if (!target) return;

    const { job, user, url } = target;
    const secret = await ensureWebhookSecret(user);

    const body = JSON.stringify({
      event,
      job: {
        id: job._id.toString(),
        type: job.payload?.type,
        status: job.status,
        result: job.result ?? null,
        error: job.error ?? null,
        createdAt: job.createdAt,
        completedAt: job.completedAt ?? null,
      },
    });

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = signWebhookPayload(secret, timestamp, body);
    const startedAt = Date.now();

    const record = (outcome: { status: 'success' | 'failed'; httpStatus?: number; error?: string }) =>
      this.recordDelivery({
        userId: user._id.toString(),
        jobId,
        event,
        url,
        attempt,
        durationMs: Date.now() - startedAt,
        ...outcome,
      });

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Robin-Event': event,
          'X-Robin-Timestamp': timestamp,
          'X-Robin-Signature': signature,
        },
        body,
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(jobId, `Delivery to ${url} failed: ${message}`);
      await record({ status: 'failed', error: message });
      throw err;
    }

    if (!response.ok) {
      log(jobId, `Delivery to ${url} failed: HTTP ${response.status}`);
      await record({ status: 'failed', httpStatus: response.status, error: `HTTP ${response.status}` });
      throw new Error(`Webhook delivery failed: HTTP ${response.status}`);
    }

    await record({ status: 'success', httpStatus: response.status });
    log(jobId, `Delivered ${event} to ${url}`);
  }

  async listDeliveries(
    userId: string,
    query: WebhookDeliveryListQuery
  ): Promise<{ items: WebhookDeliveryListItem[]; nextCursor: string | null }> {
    const limit = Math.min(query.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const docs = await WebhookDeliveryModel.find({
      userId,
      ...(query.cursor && OBJECT_ID.test(query.cursor) && { _id: { $lt: query.cursor } }),
    })
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const page = docs.slice(0, limit);

    return {
      items: page.map((doc) => ({
        id: doc._id.toString(),
        jobId: doc.jobId,
        event: doc.event,
        url: doc.url,
        attempt: doc.attempt,
        status: doc.status,
        httpStatus: doc.httpStatus ?? undefined,
        error: doc.error ?? undefined,
        durationMs: doc.durationMs,
        createdAt: doc.createdAt,
      })),
      nextCursor: docs.length > limit ? page[page.length - 1]._id.toString() : null,
    };
  }

  // Telemetry: a failed log write must never fail (or retry) the delivery itself.
  private async recordDelivery(delivery: Omit<WebhookDelivery, 'createdAt'>): Promise<void> {
    try {
      await WebhookDeliveryModel.create(delivery);
    } catch (err) {
      log(delivery.jobId, `Failed to record delivery: ${err instanceof Error ? err.message : err}`);
    }
  }
}

export const webhooksService = new WebhooksService();
