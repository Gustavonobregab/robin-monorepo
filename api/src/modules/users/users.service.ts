import { randomBytes } from 'crypto';
import { UserModel } from './users.model';
import type { OnboardingRole, OnboardingUsageMode, OnboardingUseCase } from './users.types';
import { ApiError } from '../../utils/api-error';
import { usageService } from '../usage/usage.service';
import { PlanModel } from '../plans/plans.model';
import { isSuperAdminEmail } from '../../middlewares/super-admin';

export async function ensureWebhookSecret(user: { _id: unknown; webhookSecret?: string | null }): Promise<string> {
  if (user.webhookSecret) return user.webhookSecret;

  const secret = `whsec_${randomBytes(24).toString('hex')}`;
  await UserModel.updateOne({ _id: user._id }, { $set: { webhookSecret: secret } });
  return secret;
}

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
      isSuperAdmin: isSuperAdminEmail(user.email),
      createdAt: user.createdAt,
      profile: user.profile ?? null,
      onboardingCompleted: Boolean(user.profile?.onboardingCompletedAt),
      totalRequests: stats.totalRequests,
      webhookUrl: user.webhookUrl ?? null,
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

  async updateOnboarding(userId: string, data: {
    role?: OnboardingRole;
    useCases?: OnboardingUseCase[];
    usageMode?: OnboardingUsageMode;
    completed?: boolean;
  }) {
    const $set: Record<string, unknown> = {};
    if (data.role) $set['profile.role'] = data.role;
    if (data.useCases) $set['profile.useCases'] = data.useCases;
    if (data.usageMode) $set['profile.usageMode'] = data.usageMode;
    if (data.completed) $set['profile.onboardingCompletedAt'] = new Date();

    const user = await UserModel.findOneAndUpdate(
      { $or: [{ oderId: userId }, { _id: userId }] },
      { $set },
      { new: true },
    ).lean();

    if (!user) {
      throw new ApiError('USER_NOT_FOUND', 'User not found', 404);
    }

    return user.profile ?? {};
  }

  async updateWebhookUrl(userId: string, url: string) {
    const updated = await UserModel.findOneAndUpdate(
      { $or: [{ oderId: userId }, { _id: userId }] },
      { $set: { webhookUrl: url } },
      { new: true },
    );

    const webhookSecret = await ensureWebhookSecret(updated!);

    return { webhookUrl: updated!.webhookUrl!, webhookSecret };
  }
}

export const usersService = new UsersService();
