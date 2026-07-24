// dashboard/app/http/admin.ts
import { clientApi } from './api'
import type {
  AdminHealth,
  AdminJobListResponse,
  AdminMetrics,
  AdminOverview,
  AdminUserDetail,
  AdminUserListResponse,
  ApiResponse,
  JobStatus,
} from '@/types'

export const getAdminOverview = () =>
  clientApi.get('admin/overview').json<ApiResponse<AdminOverview>>().then((res) => res.data)

export const getAdminUsers = (params: { search?: string; page?: number; limit?: number }) => {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  if (params.page) searchParams.set('page', String(params.page))
  if (params.limit) searchParams.set('limit', String(params.limit))

  return clientApi
    .get('admin/users', { searchParams })
    .json<ApiResponse<AdminUserListResponse>>()
    .then((res) => res.data)
}

export const getAdminUser = (id: string) =>
  clientApi.get(`admin/users/${id}`).json<ApiResponse<AdminUserDetail>>().then((res) => res.data)

export const getAdminJobs = (params: { status?: JobStatus; page?: number; limit?: number }) => {
  const searchParams = new URLSearchParams()
  if (params.status) searchParams.set('status', params.status)
  if (params.page) searchParams.set('page', String(params.page))
  if (params.limit) searchParams.set('limit', String(params.limit))

  return clientApi
    .get('admin/jobs', { searchParams })
    .json<ApiResponse<AdminJobListResponse>>()
    .then((res) => res.data)
}

export const getAdminMetrics = (days = 30) =>
  clientApi
    .get('admin/metrics', { searchParams: { days: String(days) } })
    .json<ApiResponse<AdminMetrics>>()
    .then((res) => res.data)

export const getAdminHealth = () =>
  clientApi.get('admin/health').json<ApiResponse<AdminHealth>>().then((res) => res.data)
