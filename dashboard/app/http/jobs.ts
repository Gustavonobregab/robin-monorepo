// dashboard/app/http/jobs.ts
import { clientApi } from './api'
import type { ApiResponse, Job } from '@/types'

export const getJobStatus = (id: string) =>
  clientApi.get(`jobs/${id}`).json<ApiResponse<Job>>().then((res) => res.data)
