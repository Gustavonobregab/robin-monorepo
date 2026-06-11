import { Schema, model, Model } from 'mongoose';
import type { UsageEvent } from './usage.types';

const usageEventSchema = new Schema<UsageEvent>({
  idempotencyKey: { type: String, required: true, unique: true },

  userId: { type: String, required: true, index: true },
  jobId: { type: String },
  sync: { type: Boolean, default: false },

  pipelineType: { type: String, enum: ['audio', 'text', 'image', 'video'], required: true },
  operations: { type: [String], required: true },

  inputBytes: { type: Number, required: true },
  outputBytes: { type: Number, required: true },

  processingMs: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  creditsConsumed: { type: Number },   // credits consumed for this event

  // Per-pipeline metadata (only one is populated per event)
  audio: {
    durationMs: Number,
    format: String,
    sampleRate: Number,
    channels: Number,
  },
  text: {
    characterCount: Number,
    wordCount: Number,
    encoding: String,
  },
  image: {
    width: Number,
    height: Number,
    format: String,
    megapixels: Number,
  },
  video: {
    durationMs: Number,
    width: Number,
    height: Number,
    format: String,
    fps: Number,
    codec: String,
  },
});

usageEventSchema.index({ userId: 1, timestamp: -1 });
usageEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

export const UsageEventModel: Model<UsageEvent> = model<UsageEvent>('UsageEvent', usageEventSchema);
