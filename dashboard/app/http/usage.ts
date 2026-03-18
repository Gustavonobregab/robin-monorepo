// dashboard/app/http/usage.ts
import { clientApi } from './api'
import type { ApiResponse, UsageAnalytics, CurrentUsage } from '@/types'

export const getUsageAnalytics = async (range: '7d' | '30d' | '90d' | '1y' = '30d') =>
  clientApi.get('usage/analytics', { searchParams: { range } }).json<ApiResponse<UsageAnalytics>>()

export const getCurrentUsage = async () =>
  clientApi.get('usage/current').json<ApiResponse<CurrentUsage>>()
