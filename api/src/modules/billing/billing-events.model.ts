import { Schema, model, type Model } from 'mongoose';

// Idempotency ledger: one doc per processed gateway event.
interface BillingEventRecord {
  gateway: string;
  eventId: string;
  type: string;
  createdAt: Date;
}

const billingEventSchema = new Schema<BillingEventRecord>({
  gateway: { type: String, required: true },
  eventId: { type: String, required: true },
  type: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

billingEventSchema.index({ gateway: 1, eventId: 1 }, { unique: true });

export const BillingEventModel: Model<BillingEventRecord> = model<BillingEventRecord>(
  'BillingEvent',
  billingEventSchema,
);
