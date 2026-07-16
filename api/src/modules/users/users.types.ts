import type { ObjectId } from 'mongoose';

export interface User {
  _id?: ObjectId;
  name: string;
  oderId?: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  plan?: ObjectId;                     // reference to the active plan document
  subscription?: {
    status: 'active' | 'canceled' | 'past_due'; // past_due = renewal failed, Stripe is retrying
    credits: {
      limit: number;                   // total credits for this cycle, snapshotted from plan
      used: number;                    // credits consumed in current cycle
    };
    currentPeriodStart: Date;          // when the current billing cycle started
    currentPeriodEnd: Date;            // when the current billing cycle ends
    canceledAt?: Date;                 // timestamp when user canceled
    planChangedAt?: Date;              // timestamp of last plan change
    // Present only on paid, gateway-driven subscriptions. Absent = internal cycle (free plan).
    gateway?: 'stripe' | 'abacatepay';
    gatewayCustomerIds?: { stripe?: string; abacatepay?: string };
    gatewaySubscriptionId?: string;
    cancelAtPeriodEnd?: boolean;       // user canceled; access runs until currentPeriodEnd
  };
  createdAt: Date;
  updatedAt: Date;
}
