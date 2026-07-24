'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { FileClock } from 'lucide-react'
import { Card } from '@/app/components/ui/Card'
import { Chip } from '@/app/components/ui/Chip'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { RetryCard } from '@/app/components/ui/RetryCard'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { StatusBadge } from '@/app/components/ui/StatusBadge'
import { getAdminJobs } from '@/app/http/admin'
import { cn, formatDateTime } from '@/app/lib/utils'
import type { JobStatus } from '@/types'
import { Pagination } from './UsersTable'

const PAGE_SIZE = 20

const STATUS_CHIPS: { label: string; value: JobStatus }[] = [
  { label: 'Done', value: 'completed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Queued', value: 'pending' },
  { label: 'Failed', value: 'failed' },
]

const TYPE_LABEL: Record<string, string> = {
  text: 'Text',
  audio: 'Audio',
  image: 'Image',
  video: 'Video',
}

export function AdminJobsTable() {
  const [status, setStatus] = useState<JobStatus | undefined>()
  const [page, setPage] = useState(1)

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    `admin/jobs?status=${status ?? ''}&page=${page}`,
    () => getAdminJobs({ status, page, limit: PAGE_SIZE }),
    { keepPreviousData: true },
  )

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[0.9375rem] font-medium text-foreground">Recent jobs</h2>
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_CHIPS.map((chip) => (
            <Chip
              key={chip.value}
              active={status === chip.value}
              onClick={() => {
                setStatus((cur) => (cur === chip.value ? undefined : chip.value))
                setPage(1)
              }}
            >
              {chip.label}
            </Chip>
          ))}
        </div>
      </div>

      {error ? (
        <RetryCard message="Could not load jobs." onRetry={() => mutate()} />
      ) : isLoading || !data ? (
        <TableSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={<FileClock className="h-5 w-5" />}
          title={status ? 'No jobs with this status' : 'No jobs yet'}
          hint={status ? 'Try a different status filter.' : undefined}
        />
      ) : (
        <>
          <div className={cn('overflow-x-auto', isValidating && 'opacity-60')}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[13px] text-muted-foreground">
                  <th className="pb-2 pr-4 font-normal">User</th>
                  <th className="pb-2 pr-4 font-normal">Type</th>
                  <th className="pb-2 pr-4 font-normal">Status</th>
                  <th className="hidden pb-2 pr-4 text-right font-normal sm:table-cell">
                    Duration
                  </th>
                  <th className="hidden pb-2 font-normal md:table-cell">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((job) => {
                  const failed = job.status === 'failed'
                  return (
                    <tr
                      key={job.id}
                      className={cn(
                        'border-t border-border transition-colors hover:bg-muted',
                        failed && 'bg-destructive-subtle/60 hover:bg-destructive-subtle',
                      )}
                    >
                      <td className="max-w-[14rem] py-3 pr-4">
                        <p className="truncate text-foreground">{job.userEmail}</p>
                        {failed && job.error && (
                          <p className="truncate text-xs text-destructive">{job.error}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                        {TYPE_LABEL[job.type] ?? job.type}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="hidden whitespace-nowrap py-3 pr-4 text-right text-muted-foreground sm:table-cell">
                        {job.processingMs != null
                          ? `${job.processingMs.toLocaleString()} ms`
                          : null}
                      </td>
                      <td className="hidden whitespace-nowrap py-3 text-muted-foreground md:table-cell">
                        {formatDateTime(job.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={data.total}
            busy={isValidating}
            onPage={setPage}
          />
        </>
      )}
    </Card>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-0.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-t border-border py-3 first:border-t-0">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="hidden h-3 w-16 sm:block" />
          <Skeleton className="hidden h-3 w-24 md:block" />
        </div>
      ))}
    </div>
  )
}
