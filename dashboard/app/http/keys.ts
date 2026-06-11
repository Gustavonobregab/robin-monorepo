// dashboard/app/http/keys.ts
import { clientApi } from './api'
import type { ApiResponse, ApiKey } from '@/types'

export const getApiKeys = () =>
  clientApi.get('keys').json<ApiResponse<ApiKey[]>>()

export const createApiKey = (name: string) =>
  clientApi.post('keys', { json: { name } }).json<ApiResponse<ApiKey & { key: string }>>()

export const revokeApiKey = (id: string) =>
  clientApi.delete(`keys/${id}`).json<ApiResponse<{ revoked: boolean }>>()
