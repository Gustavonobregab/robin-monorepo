// dashboard/app/http/jobs.ts
import { clientApi } from './api'
import type { ApiResponse, Job, JobListResponse, JobPipeline, JobStatus } from '@/types'

export const getJobStatus = (id: string) =>
  clientApi.get(`jobs/${id}`).json<ApiResponse<Job>>().then((res) => res.data)

export const listJobs = (params: {
  type?: JobPipeline
  status?: JobStatus
  limit?: number
  cursor?: string
}) => {
  const searchParams = new URLSearchParams()
  if (params.type) searchParams.set('type', params.type)
  if (params.status) searchParams.set('status', params.status)
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.cursor) searchParams.set('cursor', params.cursor)

  return clientApi
    .get('jobs', { searchParams })
    .json<ApiResponse<JobListResponse>>()
    .then((res) => res.data)
}
