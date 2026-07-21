import { clientApi } from './api'
import type { ApiResponse, WebhookDeliveryListResponse } from '@/types'

export const listWebhookDeliveries = (params: { limit?: number; cursor?: string } = {}) => {
  const searchParams = new URLSearchParams()
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.cursor) searchParams.set('cursor', params.cursor)

  return clientApi
    .get('webhooks/deliveries', { searchParams })
    .json<ApiResponse<WebhookDeliveryListResponse>>()
    .then((res) => res.data)
}
