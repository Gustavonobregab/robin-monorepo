import type { ObjectId } from 'mongoose';

export interface CreditWeights {
  text: number;    // credits consumed per text processing request
  image: number;   // credits consumed per image processing request
  audio: number;   // credits consumed per audio processing request
  video: number;   // credits consumed per video processing request
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
  features: PlanFeatures;
  isPublic: boolean;       // true = visible on pricing page
  isDefault: boolean;      // true = assigned to new users on signup
  active: boolean;         // false = soft-deleted, no longer assignable
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionStatus = 'active' | 'canceled';

export interface Subscription {
  status: SubscriptionStatus;         // subscription state
  credits: {
    limit: number;                    // total credits for this cycle, snapshotted from plan
    used: number;                     // credits consumed in the current billing cycle
  };
  currentPeriodStart: Date;           // when the current billing cycle started
  currentPeriodEnd: Date;             // when the current billing cycle ends
  canceledAt?: Date;                  // timestamp when the user canceled
  planChangedAt?: Date;               // timestamp of last plan change
}
