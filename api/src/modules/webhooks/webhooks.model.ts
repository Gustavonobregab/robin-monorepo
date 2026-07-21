import { Schema, model, Model } from 'mongoose';
import type { WebhookDelivery } from './webhooks.types';

const webhookDeliverySchema = new Schema<WebhookDelivery>({
  userId: { type: String, required: true },
  jobId: { type: String, required: true },
  event: { type: String, enum: ['job.completed', 'job.failed'], required: true },
  url: { type: String, required: true },
  attempt: { type: Number, required: true },
  status: { type: String, enum: ['success', 'failed'], required: true },
  httpStatus: Number,
  error: String,
  durationMs: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

webhookDeliverySchema.index({ userId: 1, _id: -1 });
webhookDeliverySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const WebhookDeliveryModel: Model<WebhookDelivery> = model<WebhookDelivery>(
  'WebhookDelivery',
  webhookDeliverySchema
);
