// dashboard/app/http/jobs.ts
import { clientApi } from './api'
import type { Job } from '@/types'

export const getTextJobStatus = (id: string) =>
  clientApi.get(`text/jobs/${id}`).json<Job>()

export const getAudioJobStatus = (id: string) =>
  clientApi.get(`audio/jobs/${id}`).json<Job>()
