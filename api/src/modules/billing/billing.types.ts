import type { Plan } from '../plans/plans.types';
import type { User } from '../users/users.types';

export type GatewayName = 'stripe' | 'abacatepay';

// Every gateway webhook normalizes into one of these, so billing.service never sees a gateway.
export type BillingEvent =
  | {
      type: 'subscription_activated'; // first successful payment of a new subscription
      gateway: GatewayName;
      eventId: string;
      userId: string;
      planSlug: string;
      customerId: string;
      subscriptionId: string;
      periodStart: Date;
      periodEnd: Date;
    }
  | {
      type: 'subscription_renewed'; // recurring charge succeeded → reset the credit cycle
      gateway: GatewayName;
      eventId: string;
      subscriptionId: string;
      periodStart: Date;
      periodEnd: Date;
    }
  | {
      type: 'subscription_payment_failed'; // gateway is retrying (dunning)
      gateway: GatewayName;
      eventId: string;
      subscriptionId: string;
    }
  | {
      type: 'subscription_updated'; // status / cancel-at-period-end sync
      gateway: GatewayName;
      eventId: string;
      subscriptionId: string;
      cancelAtPeriodEnd: boolean;
    }
  | {
      type: 'subscription_canceled'; // user canceled; access runs until the period closes
      gateway: GatewayName;
      eventId: string;
      subscriptionId: string;
    }
  | {
      type: 'subscription_deleted'; // gateway gave up or cycle ended after cancel → back to free
      gateway: GatewayName;
      eventId: string;
      subscriptionId: string;
    }

export interface CheckoutResult {
  url: string;
  customerId: string; // persisted immediately so abandoned checkouts don't create duplicate customers
}

// The seam each gateway implements.
export interface PaymentGateway {
  name: GatewayName;
  /** Hosted checkout for `plan`; must carry userId for webhook mapping. */
  createCheckout(user: User & { _id: unknown }, plan: Plan): Promise<CheckoutResult>;
  cancelAtPeriodEnd(subscriptionId: string): Promise<void>;
  cancelNow(subscriptionId: string): Promise<void>;
  /** Verifies the signature and normalizes. Null = event we ignore. */
  parseWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>,
    query: Record<string, string | undefined>,
  ): Promise<BillingEvent | null>;
}
