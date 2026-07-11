import type { Job } from 'bullmq';
import type { WebhookQueueJob } from '../queues/webhook.queue';
import { webhooksService } from '../modules/webhooks/webhooks.service';

export default async function (job: Job<WebhookQueueJob>) {
  await webhooksService.deliverJobWebhook(job.data.jobId, job.data.event);
}
