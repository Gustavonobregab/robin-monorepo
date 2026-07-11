export type WebhookEvent = 'job.completed' | 'job.failed';

export type WebhookQueueJob = { jobId: string; event: WebhookEvent };

export const WEBHOOK_QUEUE = 'WEBHOOK_QUEUE';
