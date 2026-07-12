import { createHmac } from 'crypto';
import { JobModel } from '../jobs/job.model';
import { UserModel } from '../users/users.model';
import { ensureWebhookSecret } from '../users/users.service';
import type { WebhookEvent } from '../../queues/webhook.queue';

const DELIVERY_TIMEOUT_MS = 10_000;

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
  async deliverJobWebhook(jobId: string, event: WebhookEvent): Promise<void> {
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
      log(jobId, `Delivery to ${url} failed: ${err instanceof Error ? err.message : err}`);
      throw err;
    }

    if (!response.ok) {
      log(jobId, `Delivery to ${url} failed: HTTP ${response.status}`);
      throw new Error(`Webhook delivery failed: HTTP ${response.status}`);
    }

    log(jobId, `Delivered ${event} to ${url}`);
  }
}

export const webhooksService = new WebhooksService();
