import { createHmac } from 'crypto';
import { JobModel } from '../jobs/job.model';
import { UserModel } from '../users/users.model';
import { ensureWebhookSecret } from '../users/users.service';

export type WebhookEvent = 'job.completed' | 'job.failed';

const DELIVERY_TIMEOUT_MS = 10_000;

const log = (jobId: string, msg: string) => console.log(`[WEBHOOK:${jobId}] ${msg}`);

export class WebhooksService {
  // Delivery failures are logged, never thrown: the job result is already
  // persisted and must not be affected by the receiver being down.
  async sendJobWebhook(jobId: string, event: WebhookEvent): Promise<void> {
    const job = await JobModel.findById(jobId).lean();
    if (!job) return;

    const user = await UserModel.findOne({
      $or: [{ oderId: job.userId }, { _id: job.userId }],
    }).lean();
    if (!user) return;

    const url = (job.payload as { webhookUrl?: string } | undefined)?.webhookUrl ?? user.webhookUrl;
    if (!url) return;

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
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Robin-Event': event,
          'X-Robin-Timestamp': timestamp,
          'X-Robin-Signature': `sha256=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });

      if (!response.ok) {
        log(jobId, `Delivery to ${url} failed: HTTP ${response.status}`);
        return;
      }

      log(jobId, `Delivered ${event} to ${url}`);
    } catch (err) {
      log(jobId, `Delivery to ${url} failed: ${err instanceof Error ? err.message : err}`);
    }
  }
}

export const webhooksService = new WebhooksService();
