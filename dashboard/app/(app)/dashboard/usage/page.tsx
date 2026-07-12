'use client'
import useSWR from 'swr'
import Link from 'next/link'
import { Skeleton } from '@/app/components/ui/skeleton'
import { getProfile } from '@/app/http/users'
import { cn, formatBytes, formatDate } from '@/app/lib/utils'
import type { ApiResponse, CurrentUsage, UserProfile } from '@/types'

interface PipelineRow {
  label: string
  requests: number
  detail: string
  data: string
}

function pipelineRows(usage: CurrentUsage): PipelineRow[] {
  return [
    usage.audio.requests > 0 && {
      label: 'Audio',
      requests: usage.audio.requests,
      detail: `${usage.audio.minutes.toFixed(1)} min`,
      data: formatBytes(usage.audio.inputBytes),
    },
    usage.text.requests > 0 && {
      label: 'Text',
      requests: usage.text.requests,
      detail: `${usage.text.characters.toLocaleString()} chars`,
      data: formatBytes(usage.text.inputBytes),
    },
    usage.image.requests > 0 && {
      label: 'Image',
      requests: usage.image.requests,
      detail: `${usage.image.megapixels.toFixed(1)} MP`,
      data: formatBytes(usage.image.inputBytes),
    },
    usage.video.requests > 0 && {
      label: 'Video',
      requests: usage.video.requests,
      detail: `${usage.video.minutes.toFixed(1)} min`,
      data: formatBytes(usage.video.inputBytes),
    },
  ].filter(Boolean) as PipelineRow[]
}

export default function UsagePage() {
  const { data, isLoading } = useSWR<ApiResponse<UserProfile>>('user-profile', getProfile)

  const profile = data?.data
  const subscription = profile?.subscription
  const usage = profile?.currentUsage
  const rows = usage ? pipelineRows(usage) : []
  const totalRequests = rows.reduce((sum, row) => sum + row.requests, 0)

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="space-y-5 max-w-2xl mx-auto">
        <div>
          <h2 className="text-lg font-semibold">Usage</h2>
          <p className="text-sm text-muted mt-0.5">Credits and processing for the current cycle.</p>
        </div>

        {isLoading ? (
          <>
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </>
        ) : (
          <>
            {subscription && (
              <div className="bg-background rounded-xl border border-border shadow-sm p-6">
                <CreditsSummary
                  used={subscription.credits.used}
                  limit={subscription.credits.limit}
                  resetsAt={subscription.currentPeriodEnd}
                />
              </div>
            )}

            <div className="bg-background rounded-xl border border-border shadow-sm p-6">
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="font-medium">By pipeline</h3>
                {usage && (
                  <span className="text-xs text-muted">
                    {formatDate(usage.period.start)} – {formatDate(usage.period.end)}
                  </span>
                )}
              </div>

              {rows.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted">No usage this cycle.</p>
                  <p className="text-xs text-muted mt-1">
                    Compress some{' '}
                    <Link href="/dashboard/text" className="underline text-foreground">text</Link>,{' '}
                    <Link href="/dashboard/audio" className="underline text-foreground">audio</Link>, or{' '}
                    <Link href="/dashboard/image" className="underline text-foreground">images</Link>.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-semibold mb-5">
                    {totalRequests.toLocaleString()}{' '}
                    <span className="text-sm font-normal text-muted">total requests</span>
                  </p>
                  <div className="space-y-4">
                    {rows.map((row) => (
                      <PipelineBar key={row.label} row={row} total={totalRequests} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CreditsSummary({
  used,
  limit,
  resetsAt,
}: {
  used: number
  limit: number
  resetsAt: string
}) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const remaining = Math.max(limit - used, 0)
  const isHigh = pct >= 80

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-semibold">
          {used.toLocaleString()}{' '}
          <span className="text-sm font-normal text-muted">of {limit.toLocaleString()} credits used</span>
        </p>
        <span className={cn('text-sm font-medium', isHigh && 'text-danger')}>
          {remaining.toLocaleString()} left
        </span>
      </div>

      <div className="h-2 rounded-full bg-accent-light overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', isHigh ? 'bg-danger' : 'bg-accent-strong')}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-muted">
        Resets on {formatDate(resetsAt)}. Credits are charged by input size — bigger files cost more.
      </p>
    </div>
  )
}

function PipelineBar({ row, total }: { row: PipelineRow; total: number }) {
  const pct = total > 0 ? (row.requests / total) * 100 : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{row.label}</span>
        <span className="text-sm text-muted">
          {row.requests.toLocaleString()} req · {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-4 rounded-full bg-accent-light overflow-hidden">
        <div
          className="h-full rounded-full bg-accent-strong transition-all"
          style={{ width: `${Math.max(pct, 1.5)}%` }}
        />
      </div>
      <div className="flex gap-3 text-xs text-muted">
        <span>{row.detail}</span>
        <span>·</span>
        <span>{row.data}</span>
      </div>
    </div>
  )
}
