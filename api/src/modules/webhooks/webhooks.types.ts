import type { WebhookEvent } from '../../queues/webhook.queue';

export interface WebhookDelivery {
  userId: string;
  jobId: string;
  event: WebhookEvent;
  url: string;
  attempt: number;
  status: 'success' | 'failed';
  httpStatus?: number;
  error?: string;
  durationMs: number;
  createdAt: Date;
}

export interface WebhookDeliveryListQuery {
  limit?: number;
  cursor?: string;
}

export interface WebhookDeliveryListItem {
  id: string;
  jobId: string;
  event: WebhookEvent;
  url: string;
  attempt: number;
  status: 'success' | 'failed';
  httpStatus?: number;
  error?: string;
  durationMs: number;
  createdAt: Date;
}
