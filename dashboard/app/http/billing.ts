import { clientApi } from './api'
import type { ApiResponse } from '@/types'

export const createCheckout = async (
  planSlug: string,
  gateway: 'stripe' | 'abacatepay',
): Promise<ApiResponse<{ url: string }>> => {
  return clientApi.post('billing/checkout', { json: { planSlug, gateway } }).json()
}

export const cancelSubscription = async (): Promise<ApiResponse<{ endsAt?: string }>> => {
  return clientApi.post('billing/cancel').json()
}
