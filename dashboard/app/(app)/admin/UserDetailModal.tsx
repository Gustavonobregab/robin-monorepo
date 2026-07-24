'use client'

import useSWR from 'swr'
import { FileClock } from 'lucide-react'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { Modal } from '@/app/components/ui/Modal'
import { RetryCard } from '@/app/components/ui/RetryCard'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { StatusBadge } from '@/app/components/ui/StatusBadge'
import { getAdminUser } from '@/app/http/admin'
import { formatBytes, formatDate, formatDateTime } from '@/app/lib/utils'
import type { AdminUserDetail } from '@/types'

const TYPE_LABEL: Record<string, string> = {
  text: 'Text',
  audio: 'Audio',
  image: 'Image',
  video: 'Video',
}

export function UserDetailModal({
  userId,
  onClose,
}: {
  userId: string | null
  onClose: () => void
}) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `admin/users/${userId}` : null,
    () => getAdminUser(userId as string),
  )

  return (
    <Modal
      open={Boolean(userId)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={data?.user.name ?? 'User'}
      description={data?.user.email}
      className="max-w-lg"
    >
      {error ? (
        <RetryCard message="Could not load this user." onRetry={() => mutate()} />
      ) : isLoading || !data ? (
        <DetailSkeleton />
      ) : (
        <Detail detail={data} />
      )}
    </Modal>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <p className="shrink-0 text-[13px] text-muted-foreground">{label}</p>
      <p className="truncate text-sm text-foreground">{value}</p>
    </div>
  )
}

function Detail({ detail }: { detail: AdminUserDetail }) {
  const { user, subscription, keysCount, usage30d, recentJobs } = detail
  const bytesSaved = Math.max(usage30d.inputBytes - usage30d.outputBytes, 0)

  return (
    <div className="space-y-5">
      <div>
        <Row label="Joined" value={formatDate(user.createdAt)} />
        <Row label="Email verified" value={user.emailVerified ? 'Yes' : 'No'} />
        <Row label="API keys" value={keysCount.toLocaleString()} />
        {subscription ? (
          <>
            <Row label="Plan" value={subscription.planName} />
            <Row label="Subscription status" value={subscription.status} />
            <Row
              label="Credits"
              value={`${subscription.credits.used.toLocaleString()} of ${subscription.credits.limit.toLocaleString()}`}
            />
          </>
        ) : (
          <Row label="Plan" value="No subscription" />
        )}
      </div>

      <div>
        <p className="mb-1 text-[13px] font-medium text-foreground">Usage in the last 30 days</p>
        <Row label="Events" value={usage30d.events.toLocaleString()} />
        <Row label="Credits consumed" value={usage30d.creditsConsumed.toLocaleString()} />
        <Row
          label="Data"
          value={`${formatBytes(usage30d.inputBytes)} in, ${formatBytes(bytesSaved)} saved`}
        />
      </div>

      <div>
        <p className="mb-2 text-[13px] font-medium text-foreground">Recent jobs</p>
        {recentJobs.length === 0 ? (
          <EmptyState
            icon={<FileClock className="h-5 w-5" />}
            title="No jobs yet"
            className="py-8"
          />
        ) : (
          <div className="space-y-0.5">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
                <p className="w-14 shrink-0 text-sm text-foreground">
                  {TYPE_LABEL[job.type] ?? job.type}
                </p>
                <StatusBadge status={job.status} className="w-24 shrink-0" />
                <p className="flex-1 truncate text-right text-[13px] text-muted-foreground">
                  {job.processingMs != null && `${job.processingMs.toLocaleString()} ms, `}
                  {formatDateTime(job.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      ))}
    </div>
  )
}
