import { UserModel } from './users.model';
import { ApiError } from '../../utils/api-error';
import { usageService } from '../usage/usage.service';
import { PlanModel } from '../plans/plans.model';

export class UsersService {
  async getProfile(userId: string) {
    const user = await UserModel.findOne({
      $or: [{ oderId: userId }, { _id: userId }],
    }).lean();

    if (!user) {
      throw new ApiError('USER_NOT_FOUND', 'User not found', 404);
    }

    const stats = await usageService.getUserStats(userId);

    // Fetch plan details if user has one
    let plan = null;
    if (user.plan) {
      plan = await PlanModel.findById(user.plan).lean();
    }

    // Use rolling cycle dates for current usage if available
    const currentUsage = await usageService.getCurrentUsage(
      userId,
      user.subscription?.currentPeriodStart,
      user.subscription?.currentPeriodEnd,
    );

    return {
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt,
      totalRequests: stats.totalRequests,
      plan: plan ? { name: plan.name, slug: plan.slug, credits: plan.credits } : null,
      subscription: user.subscription ? {
        status: user.subscription.status,
        credits: user.subscription.credits,
        currentPeriodStart: user.subscription.currentPeriodStart,
        currentPeriodEnd: user.subscription.currentPeriodEnd,
      } : null,
      currentUsage,
    };
  }

  async updateProfile(userId: string, data: { name: string }) {
    const user = await UserModel.findOneAndUpdate(
      { $or: [{ oderId: userId }, { _id: userId }] },
      { $set: { name: data.name } },
      { new: true },
    );

    if (!user) {
      throw new ApiError('USER_NOT_FOUND', 'User not found', 404);
    }

    return user;
  }

  async updateWebhookUrl(userId: string, url: string) {
    const user = await UserModel.findOne({
      $or: [{ oderId: userId }, { _id: userId }],
    }).lean();

    if (!user) {
      throw new ApiError('USER_NOT_FOUND', 'User not found', 404);
    }

    // Check if plan allows webhooks
    if (user.plan) {
      const plan = await PlanModel.findById(user.plan).lean();
      if (plan && !plan.features.webhooks) {
        throw new ApiError('FEATURE_NOT_AVAILABLE', 'Webhooks are not available on your current plan. Please upgrade.', 403);
      }
    }

    const updated = await UserModel.findOneAndUpdate(
      { $or: [{ oderId: userId }, { _id: userId }] },
      { $set: { webhookUrl: url } },
      { new: true },
    );

    return { webhookUrl: updated!.webhookUrl! };
  }
}

export const usersService = new UsersService();
