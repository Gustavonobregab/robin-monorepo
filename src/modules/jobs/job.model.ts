import { Schema, model } from 'mongoose';

const jobSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['created', 'pending', 'processing', 'completed', 'failed'],
      default: 'created',
      index: true,
    },
    payload: {
      type: { type: String, enum: ['audio', 'text'], required: true },
      operations: { type: [Schema.Types.Mixed], required: true },
      source: { type: Schema.Types.Mixed },
      preset: { type: String },
      name: { type: String },
    },
    completedAt: { type: Date },
    error: { type: String },
    result: {
      outputUrl: { type: String },
      metrics: { type: Schema.Types.Mixed },
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ userId: 1, createdAt: -1 });
jobSchema.index({ status: 1, createdAt: 1 });

export const JobModel = model('Job', jobSchema);
