import { addDays } from 'date-fns';
import { UserModel } from '../users/users.model';
import { PlanModel } from '../plans/plans.model';
import { BillingEventModel } from './billing-events.model';
import { stripeGateway } from './gateways/stripe.gateway';
import { abacatePayGateway } from './gateways/abacatepay.gateway';
import { ApiError } from '../../utils/api-error';
import { isDuplicateKeyError } from '../../utils/mongo';
import { CYCLE_DAYS } from '../../middlewares/credits';
import { stripeEnabled } from '../../config/stripe';
import { abacatePayEnabled } from '../../config/abacatepay';
import type { BillingEvent, GatewayName, PaymentGateway } from './billing.types';

const gatewayEnabled: Record<GatewayName, boolean> = {
  stripe: stripeEnabled,
  abacatepay: abacatePayEnabled,
};

function requireGatewayConfigured(name: GatewayName) {
  if (!gatewayEnabled[name]) {
    throw new ApiError('BILLING_UNAVAILABLE', 'This payment method is not available yet', 503);
  }
}

// Check the id the gateway actually charges with: a half-seeded ref must fail as 400, not 500.
function planSellableOn(
  plan: { gateways?: { stripe?: { priceId?: string }; abacatepay?: { productId?: string } } },
  name: GatewayName,
): boolean {
  if (name === 'stripe') return Boolean(plan.gateways?.stripe?.priceId);
  return Boolean(plan.gateways?.abacatepay?.productId);
}

const gateways: Record<GatewayName, PaymentGateway> = {
  stripe: stripeGateway,
  abacatepay: abacatePayGateway,
};

async function findUserById(userId: string) {
  return UserModel.findOne({ $or: [{ oderId: userId }, { _id: userId }] });
}

class BillingService {
  async checkout(
    userId: string,
    planSlug: string,
    gatewayName: GatewayName = 'stripe',
  ): Promise<{ url: string }> {
    requireGatewayConfigured(gatewayName);
    const user = await findUserById(userId);
    if (!user) throw new ApiError('USER_NOT_FOUND', 'User not found', 404);

    const plan = await PlanModel.findOne({ slug: planSlug, active: true }).lean();
    if (!plan) throw new ApiError('PLAN_NOT_FOUND', 'Plan not found', 404);
    if (!planSellableOn(plan, gatewayName)) {
      throw new ApiError('PLAN_NOT_SELLABLE', 'This plan cannot be purchased yet', 400);
    }
    if (user.plan && String(user.plan) === String(plan._id) && user.subscription?.gateway) {
      throw new ApiError('ALREADY_SUBSCRIBED', 'You are already on this plan', 400);
    }

    // The old subscription dies on activation, not here: an abandoned checkout must change nothing.
    const { url, customerId } = await gateways[gatewayName].createCheckout(user, plan);

    await UserModel.updateOne(
      { _id: user._id },
      { $set: { [`subscription.gatewayCustomerIds.${gatewayName}`]: customerId } },
    );

    return { url };
  }

  // Access runs until the cycle closes; the drop to free happens on the gateway's end event.
  async cancel(userId: string): Promise<{ endsAt: Date | undefined }> {
    const user = await findUserById(userId);
    const sub = user?.subscription;
    if (!user || !sub?.gateway || !sub.gatewaySubscriptionId) {
      throw new ApiError('NO_ACTIVE_SUBSCRIPTION', 'There is no paid subscription to cancel', 400);
    }
    requireGatewayConfigured(sub.gateway);

    await gateways[sub.gateway].cancelAtPeriodEnd(sub.gatewaySubscriptionId);

    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          'subscription.cancelAtPeriodEnd': true,
          'subscription.canceledAt': new Date(),
        },
      },
    );

    return { endsAt: sub.currentPeriodEnd };
  }

  // Record AFTER applying, so a failed apply is retried by the gateway instead of
  // deduped away. Handlers are idempotent $sets, so a concurrent double-apply is harmless.
  async handleEvent(event: BillingEvent): Promise<void> {
    const seen = await BillingEventModel.exists({
      gateway: event.gateway,
      eventId: event.eventId,
    });
    if (seen) return;

    await this.applyEvent(event);

    try {
      await BillingEventModel.create({
        gateway: event.gateway,
        eventId: event.eventId,
        type: event.type,
      });
    } catch (err: unknown) {
      if (!isDuplicateKeyError(err)) throw err;
    }
  }

  private async applyEvent(event: BillingEvent): Promise<void> {
    switch (event.type) {
      case 'subscription_activated': {
        const plan = await PlanModel.findOne({ slug: event.planSlug }).lean();
        if (!plan) return;

        const user = await UserModel.findOne({
          $or: [{ oderId: event.userId }, { _id: event.userId }],
        }).lean();
        if (!user) return;

        const previous = user.subscription;
        await UserModel.updateOne(
          { _id: user._id },
          {
            $set: {
              plan: plan._id,
              subscription: {
                status: 'active',
                gateway: event.gateway,
                gatewayCustomerIds: {
                  ...previous?.gatewayCustomerIds,
                  [event.gateway]: event.customerId,
                },
                gatewaySubscriptionId: event.subscriptionId,
                cancelAtPeriodEnd: false,
                credits: { limit: plan.credits, used: 0 },
                currentPeriodStart: event.periodStart,
                currentPeriodEnd: event.periodEnd,
                planChangedAt: new Date(),
              },
            },
          },
        );

        // Retire the replaced subscription. Best-effort: never roll back a paid activation.
        if (
          previous?.gateway &&
          previous.gatewaySubscriptionId &&
          previous.gatewaySubscriptionId !== event.subscriptionId
        ) {
          try {
            await gateways[previous.gateway].cancelNow(previous.gatewaySubscriptionId);
          } catch (err) {
            console.error(
              `[BILLING] Failed to cancel replaced subscription ${previous.gatewaySubscriptionId} (${previous.gateway}) for user ${user._id}:`,
              err,
            );
          }
        }
        return;
      }

      case 'subscription_renewed': {
        const user = await UserModel.findOne({
          'subscription.gatewaySubscriptionId': event.subscriptionId,
        }).lean();
        if (!user) return;
        const plan = user.plan ? await PlanModel.findById(user.plan).lean() : null;
        await UserModel.updateOne(
          { _id: user._id },
          {
            $set: {
              'subscription.status': 'active',
              'subscription.credits.used': 0,
              // Re-snapshot the limit so plan retuning applies on renewal
              ...(plan ? { 'subscription.credits.limit': plan.credits } : {}),
              'subscription.currentPeriodStart': event.periodStart,
              'subscription.currentPeriodEnd': event.periodEnd,
            },
          },
        );
        return;
      }

      case 'subscription_payment_failed': {
        await UserModel.updateOne(
          { 'subscription.gatewaySubscriptionId': event.subscriptionId },
          { $set: { 'subscription.status': 'past_due' } },
        );
        return;
      }

      case 'subscription_updated': {
        await UserModel.updateOne(
          { 'subscription.gatewaySubscriptionId': event.subscriptionId },
          { $set: { 'subscription.cancelAtPeriodEnd': event.cancelAtPeriodEnd } },
        );
        return;
      }

      case 'subscription_canceled': {
        // Access runs until currentPeriodEnd; the expired sweep in credits.ts takes it from there.
        await UserModel.updateOne(
          { 'subscription.gatewaySubscriptionId': event.subscriptionId },
          {
            $set: {
              'subscription.status': 'canceled',
              'subscription.cancelAtPeriodEnd': true,
              'subscription.canceledAt': new Date(),
            },
          },
        );
        return;
      }

      case 'subscription_deleted': {
        const user = await UserModel.findOne({
          'subscription.gatewaySubscriptionId': event.subscriptionId,
        }).lean();
        if (!user) return;

        const freePlan = await PlanModel.findOne({ isDefault: true, active: true }).lean();
        if (!freePlan) return;

        const now = new Date();
        await UserModel.updateOne(
          { _id: user._id },
          {
            $set: {
              plan: freePlan._id,
              subscription: {
                status: 'active',
                gatewayCustomerIds: user.subscription?.gatewayCustomerIds, // reused on re-subscribe
                credits: { limit: freePlan.credits, used: 0 },
                currentPeriodStart: now,
                currentPeriodEnd: addDays(now, CYCLE_DAYS),
                planChangedAt: now,
              },
            },
          },
        );
        return;
      }
    }
  }
}

export const billingService = new BillingService();
