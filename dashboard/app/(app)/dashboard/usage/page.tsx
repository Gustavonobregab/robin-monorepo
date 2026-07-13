'use client'
import useSWR from 'swr'
import Link from 'next/link'
import { BarChart3 } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Chip } from '@/app/components/ui/chip'
import { EmptyState } from '@/app/components/ui/empty-state'
import { PageHeader } from '@/app/components/ui/page-header'
import { Progress } from '@/app/components/ui/progress'
import { Skeleton } from '@/app/components/ui/skeleton'
import { Surface } from '@/app/components/ui/surface'
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
    <div className="mx-auto max-w-2xl pt-8">
      <PageHeader title="Usage" description="Credits and processing for the current cycle." />

      {isLoading ? (
        <div className="space-y-6">
          <Surface>
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </Surface>

          <Surface>
            <div className="space-y-6">
              <div className="flex items-baseline justify-between">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-6 w-40 rounded-md" />
              </div>
              <Skeleton className="h-8 w-48" />
              <div className="space-y-5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
            </div>
          </Surface>
        </div>
      ) : (
        <div className="space-y-6">
          {subscription && (
            <Surface>
              <CreditsSummary
                used={subscription.credits.used}
                limit={subscription.credits.limit}
                resetsAt={subscription.currentPeriodEnd}
              />
            </Surface>
          )}

          <Surface padding="none">
            <div className="flex items-baseline justify-between gap-4 px-6 pt-6">
              <h2 className="text-[0.9375rem] font-medium text-foreground">By pipeline</h2>
              {usage && (
                <Chip size="sm">
                  {formatDate(usage.period.start)} – {formatDate(usage.period.end)}
                </Chip>
              )}
            </div>

            {rows.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No usage this cycle"
                description="Compress something to see how your credits are being spent."
                action={
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href="/dashboard/text">Text</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/dashboard/audio">Audio</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/dashboard/image">Images</Link>
                    </Button>
                  </div>
                }
              />
            ) : (
              <div className="px-6 pb-6 pt-5">
                <p className="mb-6 text-2xl font-medium tracking-[-0.01em] text-foreground">
                  {totalRequests.toLocaleString()}{' '}
                  <span className="text-sm font-normal text-muted-foreground">total requests</span>
                </p>
                <div className="space-y-5">
                  {rows.map((row) => (
                    <PipelineBar key={row.label} row={row} total={totalRequests} />
                  ))}
                </div>
              </div>
            )}
          </Surface>
        </div>
      )}
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
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-2xl font-medium tracking-[-0.01em] text-foreground">
          {used.toLocaleString()}{' '}
          <span className="text-sm font-normal text-muted-foreground">
            of {limit.toLocaleString()} credits used
          </span>
        </p>
        <span
          className={cn(
            'text-sm font-medium text-muted-foreground',
            isHigh && 'text-destructive',
          )}
        >
          {remaining.toLocaleString()} left
        </span>
      </div>

      <Progress
        value={pct}
        className="bg-brand-subtle"
        indicatorClassName={isHigh ? 'bg-destructive' : 'bg-brand'}
      />

      <p className="text-xs text-muted-foreground">
        Resets on {formatDate(resetsAt)}. Credits are charged by input size — bigger files cost
        more.
      </p>
    </div>
  )
}

function PipelineBar({ row, total }: { row: PipelineRow; total: number }) {
  const pct = total > 0 ? (row.requests / total) * 100 : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-foreground">{row.label}</span>
        <span className="text-sm text-muted-foreground">
          {row.requests.toLocaleString()} req · {pct.toFixed(1)}%
        </span>
      </div>

      <Progress
        value={Math.max(pct, 1.5)}
        className="bg-brand-subtle"
        indicatorClassName="bg-brand"
      />

      <div className="flex gap-2 text-xs text-muted-foreground">
        <span>{row.detail}</span>
        <span>·</span>
        <span className="font-mono">{row.data}</span>
      </div>
    </div>
  )
}
