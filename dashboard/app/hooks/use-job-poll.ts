// dashboard/app/hooks/use-job-poll.ts
'use client'
import useSWR from 'swr'
import { useRef } from 'react'
import type { Job } from '@/types'
import type { ApiResponse } from '@/types'

const POLL_INTERVAL_MS = 2000
const MAX_POLLS = 150 // 5 minutes

interface UseJobPollOptions {
  jobId: string | null
  fetcher: (id: string) => Promise<ApiResponse<Job>>
}

export function useJobPoll({ jobId, fetcher }: UseJobPollOptions) {
  const pollCount = useRef(0)

  const isTerminal = (status?: string) =>
    status === 'completed' || status === 'failed'

  const { data, error } = useSWR<ApiResponse<Job>>(
    jobId ? `job-poll-${jobId}` : null,
    () => fetcher(jobId!),
    {
      refreshInterval: (latestData) => {
        if (!latestData) return POLL_INTERVAL_MS
        if (isTerminal(latestData.data.status)) return 0
        pollCount.current += 1
        if (pollCount.current >= MAX_POLLS) return 0
        return POLL_INTERVAL_MS
      },
      revalidateOnFocus: false,
    }
  )

  const job = data?.data
  const timedOut = pollCount.current >= MAX_POLLS && !isTerminal(job?.status)

  return {
    job,
    isPolling: !!jobId && !isTerminal(job?.status) && !timedOut,
    isCompleted: job?.status === 'completed',
    isFailed: job?.status === 'failed',
    timedOut,
    error,
  }
}
