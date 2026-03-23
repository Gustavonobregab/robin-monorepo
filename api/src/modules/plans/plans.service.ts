import { PlanModel } from './plans.model';
import { ApiError } from '../../utils/api-error';
import type { Plan } from './plans.types';

export class PlansService {
  async getPublicPlans() {
    return PlanModel.find({ isPublic: true, active: true })
      .sort({ credits: 1 })
      .lean();
  }

  async getPlanBySlug(slug: string) {
    const plan = await PlanModel.findOne({ slug, active: true }).lean();
    if (!plan) {
      throw new ApiError('PLAN_NOT_FOUND', 'Plan not found', 404);
    }
    return plan;
  }

  async getDefaultPlan() {
    const plan = await PlanModel.findOne({ isDefault: true, active: true }).lean();
    if (!plan) {
      throw new ApiError('DEFAULT_PLAN_NOT_FOUND', 'No default plan configured', 500);
    }
    return plan;
  }

  async getPlanById(planId: string) {
    const plan = await PlanModel.findById(planId).lean();
    if (!plan) {
      throw new ApiError('PLAN_NOT_FOUND', 'Plan not found', 404);
    }
    return plan;
  }
}

export const plansService = new PlansService();
