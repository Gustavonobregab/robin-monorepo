import { clientApi } from './api'
import type { ApiResponse, UserProfile } from '@/types'

export const getProfile = () =>
  clientApi.get('users/me').json<ApiResponse<UserProfile>>()

export const updateProfile = (name: string) =>
  clientApi.patch('users/me', { json: { name } }).json<ApiResponse<{ name: string }>>()

export const updateWebhookConfig = (url: string) =>
  clientApi
    .put('users/webhook-config', { json: { url } })
    .json<ApiResponse<{ webhookUrl: string; webhookSecret: string }>>()
