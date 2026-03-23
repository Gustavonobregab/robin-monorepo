import { Schema, model, type Model } from 'mongoose';
import type { Plan } from './plans.types';

const planSchema = new Schema<Plan>(
  {
    name: { type: String, required: true },             // display name, e.g. "Free", "Pro"
    slug: { type: String, required: true, unique: true }, // unique identifier for code and URLs
    description: { type: String },                       // optional description for UI
    credits: { type: Number, required: true },           // credits granted per billing cycle
    creditWeights: {
      text: { type: Number, required: true },            // credits per text request
      image: { type: Number, required: true },           // credits per image request
      audio: { type: Number, required: true },           // credits per audio request
      video: { type: Number, required: true },           // credits per video request
    },
    features: {
      maxFileSize: { type: Number, required: true },     // max upload size in bytes
      maxApiKeys: { type: Number, required: true },      // max active API keys
      webhooks: { type: Boolean, required: true },       // webhook access enabled
    },
    isPublic: { type: Boolean, default: true },          // visible on pricing page
    isDefault: { type: Boolean, default: false },        // auto-assigned to new users
    active: { type: Boolean, default: true },            // soft-delete flag
  },
  { timestamps: true }
);

export const PlanModel: Model<Plan> = model<Plan>('Plan', planSchema);
