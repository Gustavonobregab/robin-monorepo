import { Schema, model } from 'mongoose';

const jobSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    idempotencyKey: { type: String },
    status: {
      type: String,
      enum: ['created', 'pending', 'processing', 'completed', 'failed'],
      default: 'created',
      index: true,
    },
    payload: {
      type: { type: String, enum: ['audio', 'text', 'image', 'video'], required: true },
      operations: { type: [Schema.Types.Mixed], required: true },
      source: { type: Schema.Types.Mixed },
      preset: { type: String },
      name: { type: String },
      creditCost: { type: Number },    // credits reserved, for rollback on failure
      webhookUrl: { type: String },    // per-job override; falls back to user.webhookUrl
    },
    completedAt: { type: Date },
    error: { type: String },
    result: {
      outputKey: { type: String },
      outputText: { type: String },
      metrics: { type: Schema.Types.Mixed },
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ userId: 1, createdAt: -1 });
jobSchema.index({ status: 1, createdAt: 1 });
jobSchema.index({ userId: 1, _id: -1 });
jobSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $exists: true } } },
);

export const JobModel = model('Job', jobSchema);
