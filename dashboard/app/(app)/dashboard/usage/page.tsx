'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import { BarChart3 } from 'lucide-react'
import { Card } from '@/app/components/ui/Card'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { PageHeader } from '@/app/components/ui/PageHeader'
import { Progress } from '@/app/components/ui/Progress'
import { RetryCard } from '@/app/components/ui/RetryCard'
import { Select } from '@/app/components/ui/Select'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { getUsageAnalytics } from '@/app/http/usage'
import { getProfile } from '@/app/http/users'
import { cn, formatBytes, formatDate, formatSaved, savedPercent } from '@/app/lib/utils'
import type { UsageAnalytics } from '@/types'

type Range = '7d' | '30d' | '90d' | '1y'

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
]

const PIPELINE_LABELS = {
  text: 'Text',
  audio: 'Audio',
  image: 'Image',
  video: 'Video',
} as const

type PipelineKey = keyof typeof PIPELINE_LABELS

function shortDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const COMPACT_NUMBER_FMT = new Intl.NumberFormat('en-US', { notation: 'compact' })

function compactNumber(n: number) {
  return COMPACT_NUMBER_FMT.format(n)
}

export default function UsagePage() {
  const [range, setRange] = useState<Range>('30d')

  const {
    data: analyticsRes,
    error: analyticsError,
    isLoading: analyticsLoading,
    mutate: retryAnalytics,
  } = useSWR(`usage-analytics-${range}`, () => getUsageAnalytics(range))

  const { data: profileRes, isLoading: profileLoading } = useSWR('users/me', getProfile)

  const analytics = analyticsRes?.data
  const subscription = profileRes?.data?.subscription
  const isLoading = analyticsLoading || profileLoading

  return (
    <div>
      <PageHeader
        title="Usage"
        description="Analytics for your API and dashboard activity."
        actions={
          <Select
            value={range}
            onValueChange={(v) => setRange(v as Range)}
            options={RANGE_OPTIONS}
            className="w-40"
          />
        }
        className="mb-8"
      />

      {analyticsError ? (
        <RetryCard
          message="Couldn't load your usage data."
          onRetry={() => retryAnalytics()}
        />
      ) : isLoading ? (
        <UsageSkeleton />
      ) : analytics ? (
        <div className="space-y-6">
          <StatStrip analytics={analytics} creditsUsed={subscription?.credits.used} />
          <RequestsChart chart={analytics.chart} />
          <PipelineBreakdown analytics={analytics} />
          {subscription && (
            <CreditsMeter
              used={subscription.credits.used}
              limit={subscription.credits.limit}
              resetsAt={subscription.currentPeriodEnd}
            />
          )}
        </div>
      ) : null}
    </div>
  )
}

/* ── Stat strip ──────────────────────────────────────────────── */

function StatStrip({
  analytics,
  creditsUsed,
}: {
  analytics: UsageAnalytics
  creditsUsed?: number
}) {
  const { totalRequests, totalInputBytes, totalOutputBytes } = analytics.summary
  const bytesSaved = Math.max(totalInputBytes - totalOutputBytes, 0)

  const cells = [
    { label: 'Requests', value: totalRequests.toLocaleString() },
    { label: 'Data processed', value: formatBytes(totalInputBytes) },
    { label: 'Data saved', value: formatBytes(bytesSaved) },
    {
      label: 'Credits spent',
      value: creditsUsed !== undefined ? creditsUsed.toLocaleString() : null,
      caption: creditsUsed !== undefined ? 'this cycle' : undefined,
    },
  ]

  return (
    <Card className="grid grid-cols-2 overflow-hidden lg:grid-cols-4">
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          className={cn(
            'space-y-1 p-5',
            i % 2 === 1 && 'border-l border-border',
            i >= 2 && 'border-t border-border lg:border-t-0',
            i > 0 && 'lg:border-l lg:border-border',
          )}
        >
          <p className="text-[13px] text-muted-foreground">{cell.label}</p>
          {cell.value !== null && (
            <p className="text-2xl font-medium tracking-tight text-foreground">
              {cell.value}
              {cell.caption && (
                <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                  {cell.caption}
                </span>
              )}
            </p>
          )}
        </div>
      ))}
    </Card>
  )
}

/* ── Chart ───────────────────────────────────────────────────── */

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const point = payload[0]
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">
        {typeof point.payload.date === 'string' ? shortDate(point.payload.date) : null}
      </p>
      <p className="text-sm font-medium text-popover-foreground">
        {(point.value ?? 0).toLocaleString()} requests
      </p>
    </div>
  )
}

function RequestsChart({ chart }: { chart: UsageAnalytics['chart'] }) {
  const hasData = chart.some((p) => p.requests > 0)

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-[0.9375rem] font-medium text-foreground">Requests over time</h2>
      {hasData ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeWidth={1} />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                minTickGap={32}
                dy={6}
              />
              <YAxis
                allowDecimals={false}
                tickFormatter={compactNumber}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: 'hsl(var(--foreground))', strokeOpacity: 0.15 }}
              />
              <Area
                type="monotone"
                dataKey="requests"
                stroke="hsl(var(--foreground))"
                strokeWidth={2}
                fill="hsl(var(--foreground))"
                fillOpacity={0.05}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: 'hsl(var(--foreground))',
                  stroke: 'hsl(var(--background))',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState
          icon={<BarChart3 className="h-5 w-5" />}
          title="No requests in this period"
          hint="Requests made through the API or the dashboard will show up here."
        />
      )}
    </Card>
  )
}

/* ── Per-modality breakdown ──────────────────────────────────── */

function PipelineBreakdown({ analytics }: { analytics: UsageAnalytics }) {
  const rows = (Object.keys(PIPELINE_LABELS) as PipelineKey[]).flatMap((key) => {
    const summary = analytics.summary.byPipeline[key]
    return summary ? [{ key, label: PIPELINE_LABELS[key], ...summary }] : []
  })

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-[0.9375rem] font-medium text-foreground">By modality</h2>
      {rows.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-5 w-5" />}
          title="No usage in this period"
          hint="Compress something to see the breakdown by modality."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[13px] font-normal text-muted-foreground">
                <th className="pb-2 pr-4 font-normal">Modality</th>
                <th className="pb-2 pr-4 text-right font-normal">Requests</th>
                <th className="pb-2 pr-4 text-right font-normal">Bytes in</th>
                <th className="pb-2 pr-4 text-right font-normal">Bytes out</th>
                <th className="pb-2 text-right font-normal">Saved</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const saved = savedPercent(row.totalInputBytes, row.totalOutputBytes)
                return (
                  <tr
                    key={row.key}
                    className="border-t border-border transition-colors hover:bg-black/[0.04]"
                  >
                    <td className="py-3 pr-4 font-medium text-foreground">{row.label}</td>
                    <td className="py-3 pr-4 text-right text-foreground">
                      {row.requests.toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">
                      {formatBytes(row.totalInputBytes)}
                    </td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">
                      {formatBytes(row.totalOutputBytes)}
                    </td>
                    <td className="py-3 text-right text-foreground">
                      {saved !== null ? formatSaved(saved) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

/* ── Credits meter ───────────────────────────────────────────── */

function CreditsMeter({
  used,
  limit,
  resetsAt,
}: {
  used: number
  limit: number
  resetsAt: string
}) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[0.9375rem] font-medium text-foreground">Credits</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{used.toLocaleString()}</span> of{' '}
          {limit.toLocaleString()} used
        </p>
      </div>
      <Progress value={pct} />
      <p className="text-xs text-muted-foreground">
        Resets on {formatDate(resetsAt)}. Credits are charged by input size, so bigger files cost
        more.
      </p>
    </Card>
  )
}

/* ── Loading ─────────────────────────────────────────────────── */

function UsageSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="grid grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2 p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </Card>
      <Card className="p-5">
        <Skeleton className="mb-4 h-5 w-36" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </Card>
      <Card className="space-y-3 p-5">
        <Skeleton className="h-5 w-28" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </Card>
      <Card className="space-y-4 p-5">
        <div className="flex items-baseline justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
        <Skeleton className="h-3 w-2/3" />
      </Card>
    </div>
  )
}
