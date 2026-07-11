import type { ObjectId } from 'mongoose';

// "credits" charged per started "perUnitBytes" of input.
// Example: { credits: 1, perUnitBytes: 5MB } → a 12MB file costs 3 credits.
export interface CreditWeight {
  credits: number;
  perUnitBytes: number;
}

export interface CreditWeights {
  text: CreditWeight;
  image: CreditWeight;
  audio: CreditWeight;
  video: CreditWeight;
}

// Monthly price per currency; absent value = not sellable in that currency yet
export interface PlanPrices {
  brl?: number;
  usd?: number;
}

export interface PlanFeatures {
  maxFileSize: number;   // maximum upload file size in bytes
  maxApiKeys: number;    // maximum number of active API keys allowed
  webhooks: boolean;     // whether the plan includes webhook access
}

export interface Plan {
  _id?: ObjectId;
  name: string;            // display name, e.g. "Free", "Pro"
  slug: string;            // unique identifier used in code and URLs
  description?: string;    // optional plan description for UI display
  credits: number;         // total credits granted per billing cycle
  creditWeights: CreditWeights;
  prices: PlanPrices;
  features: PlanFeatures;
  isPublic: boolean;       // true = visible on pricing page
  isDefault: boolean;      // true = assigned to new users on signup
  active: boolean;         // false = soft-deleted, no longer assignable
  createdAt: Date;
  updatedAt: Date;
}