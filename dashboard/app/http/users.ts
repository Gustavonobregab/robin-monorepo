import { clientApi } from './api'
import type {
  ApiResponse,
  OnboardingProfile,
  OnboardingRole,
  OnboardingUsageMode,
  OnboardingUseCase,
  UserProfile,
} from '@/types'

export const getProfile = () =>
  clientApi.get('users/me').json<ApiResponse<UserProfile>>()

export const updateProfile = (name: string) =>
  clientApi.patch('users/me', { json: { name } }).json<ApiResponse<{ name: string }>>()

export const updateOnboarding = (data: {
  role?: OnboardingRole
  useCases?: OnboardingUseCase[]
  usageMode?: OnboardingUsageMode
  completed?: boolean
}) =>
  clientApi
    .patch('users/me/onboarding', { json: data })
    .json<ApiResponse<OnboardingProfile>>()

export const updateWebhookConfig = (url: string) =>
  clientApi
    .put('users/webhook-config', { json: { url } })
    .json<ApiResponse<{ webhookUrl: string; webhookSecret: string }>>()
