import { Schema, model, type Model } from 'mongoose';
import type { Plan } from './plans.types';

const planSchema = new Schema<Plan>(
  {
    name: { type: String, required: true },             // display name, e.g. "Free", "Pro"
    slug: { type: String, required: true, unique: true }, // unique identifier for code and URLs
    description: { type: String },                       // optional description for UI
    credits: { type: Number, required: true },           // credits granted per billing cycle
    creditWeights: {
      // credits charged per started perUnitBytes of input
      text: { credits: { type: Number, required: true }, perUnitBytes: { type: Number, required: true } },
      image: { credits: { type: Number, required: true }, perUnitBytes: { type: Number, required: true } },
      audio: { credits: { type: Number, required: true }, perUnitBytes: { type: Number, required: true } },
      video: { credits: { type: Number, required: true }, perUnitBytes: { type: Number, required: true } },
    },
    prices: {
      brl: { type: Number },                             // monthly price; absent = not sellable yet
      usd: { type: Number },
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
