// dashboard/app/http/plans.ts
import { api } from './api'
import type { ApiResponse, PublicPlan } from '@/types'

export const getPublicPlans = () =>
  api.get('plans').json<ApiResponse<PublicPlan[]>>()
