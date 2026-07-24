'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Card } from '@/app/components/ui/Card'
import { PageHeader } from '@/app/components/ui/PageHeader'
import { RetryCard } from '@/app/components/ui/RetryCard'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { getAdminHealth, getAdminMetrics, getAdminOverview } from '@/app/http/admin'
import { parseApiError } from '@/app/http/errors'
import { cn, formatBytes } from '@/app/lib/utils'
import type { AdminHealth, AdminMetricsDay, AdminOverview } from '@/types'
import { AdminJobsTable } from './JobsTable'
import { AdminUsersTable } from './UsersTable'

function shortDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const COMPACT_FMT = new Intl.NumberFormat('en-US', { notation: 'compact' })

export default function AdminPage() {
  const router = useRouter()

  const {
    data: overview,
    error: overviewError,
    isLoading: overviewLoading,
    mutate: retryOverview,
  } = useSWR('admin/overview', getAdminOverview)

  const {
    data: health,
    error: healthError,
    isLoading: healthLoading,
    mutate: retryHealth,
  } = useSWR('admin/health', getAdminHealth, { refreshInterval: 30_000 })

  const {
    data: metrics,
    error: metricsError,
    isLoading: metricsLoading,
    mutate: retryMetrics,
  } = useSWR('admin/metrics/30', () => getAdminMetrics(30))

  const [forbidden, setForbidden] = useState(false)

  /* Non-admins get FORBIDDEN here; send them to the regular dashboard, no admin error page. */
  useEffect(() => {
    const err = overviewError ?? healthError
    if (!err) return
    let cancelled = false
    parseApiError(err).then(({ code }) => {
      if (!cancelled && code === 'FORBIDDEN') setForbidden(true)
    })
    return () => {
      cancelled = true
    }
  }, [overviewError, healthError])

  useEffect(() => {
    if (forbidden) router.replace('/dashboard/home')
  }, [forbidden, router])

  if (forbidden) return null

  return (
    <div>
      <PageHeader
        title="Admin"
        description="Cross-account observability for the whole platform."
        className="mb-8"
      />

      <div className="space-y-6">
        {healthError ? (
          <RetryCard message="Could not load system health." onRetry={() => retryHealth()} />
        ) : healthLoading || !health ? (
          <HealthSkeleton />
        ) : (
          <HealthRow health={health} />
        )}

        {overviewError ? (
          <RetryCard message="Could not load platform overview." onRetry={() => retryOverview()} />
        ) : overviewLoading || !overview ? (
          <KpiSkeleton />
        ) : (
          <KpiStrip overview={overview} />
        )}

        {metricsError ? (
          <RetryCard message="Could not load daily metrics." onRetry={() => retryMetrics()} />
        ) : metricsLoading || !metrics ? (
          <ChartsSkeleton />
        ) : (
          <ChartsSection days={metrics.days} />
        )}

        <AdminUsersTable />
        <AdminJobsTable />
      </div>
    </div>
  )
}

/* ── Health row ──────────────────────────────────────────────── */

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const mins = Math.floor((seconds % 3_600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function ServiceDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn('h-1.5 w-1.5 shrink-0 rounded-full', ok ? 'bg-foreground' : 'bg-destructive')}
    />
  )
}

function HealthRow({ health }: { health: AdminHealth }) {
  const queueTotals = health.queues.reduce(
    (acc, q) => ({
      waiting: acc.waiting + q.waiting,
      active: acc.active + q.active,
      failed: acc.failed + q.failed,
    }),
    { waiting: 0, active: 0, failed: 0 },
  )
  const queuesOk = queueTotals.failed === 0

  const cells = [
    {
      label: 'MongoDB',
      ok: health.mongo.ok,
      value: health.mongo.ok ? 'Operational' : 'Down',
      caption: health.mongo.ok ? `${health.mongo.latencyMs} ms ping` : undefined,
    },
    {
      label: 'Redis',
      ok: health.redis.ok,
      value: health.redis.ok ? 'Operational' : 'Down',
      caption: health.redis.ok ? `${health.redis.latencyMs} ms ping` : undefined,
    },
    {
      label: 'Queues',
      ok: queuesOk,
      value: `${queueTotals.waiting} waiting, ${queueTotals.active} active`,
      caption: queueTotals.failed > 0 ? `${queueTotals.failed} failed` : 'No failed jobs',
      captionDanger: queueTotals.failed > 0,
    },
    { label: 'Uptime', ok: true, value: formatUptime(health.uptime), caption: 'API process' },
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
          <div className="flex items-center gap-1.5">
            <ServiceDot ok={cell.ok} />
            <p className="text-[13px] text-muted-foreground">{cell.label}</p>
          </div>
          <p
            className={cn(
              'truncate text-lg font-medium tracking-tight',
              cell.ok ? 'text-foreground' : 'text-destructive',
            )}
          >
            {cell.value}
          </p>
          {cell.caption && (
            <p
              className={cn(
                'text-xs',
                cell.captionDanger ? 'font-medium text-destructive' : 'text-muted-foreground',
              )}
            >
              {cell.caption}
            </p>
          )}
        </div>
      ))}
    </Card>
  )
}

/* ── KPIs ────────────────────────────────────────────────────── */

function KpiStrip({ overview }: { overview: AdminOverview }) {
  const { users, subscriptions, jobs24h, usage7d } = overview
  const failPct = jobs24h.total > 0 ? Math.round((jobs24h.failed / jobs24h.total) * 100) : 0
  const bytesSaved = Math.max(usage7d.inputBytes - usage7d.outputBytes, 0)

  const cells: { label: string; value: string; caption?: string; captionDanger?: boolean }[] = [
    { label: 'Users', value: users.total.toLocaleString(), caption: `+${users.new30d} in 30d` },
    { label: 'New users 7d', value: users.new7d.toLocaleString() },
    {
      label: 'Active subscriptions',
      value: subscriptions.active.toLocaleString(),
      caption: subscriptions.pastDue > 0 ? `${subscriptions.pastDue} past due` : undefined,
      captionDanger: subscriptions.pastDue > 0,
    },
    {
      label: 'Jobs 24h',
      value: jobs24h.total.toLocaleString(),
      caption: jobs24h.total > 0 ? `${failPct}% failed` : undefined,
      captionDanger: failPct > 0,
    },
    { label: 'Credits 7d', value: usage7d.creditsConsumed.toLocaleString() },
    { label: 'Bytes saved 7d', value: formatBytes(bytesSaved) },
  ]

  return (
    <Card className="grid grid-cols-2 overflow-hidden md:grid-cols-3 lg:grid-cols-6">
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          className={cn(
            'space-y-1 p-5',
            i % 2 === 1 && 'border-l border-border md:border-l-0',
            i >= 2 && 'border-t border-border md:border-t-0',
            i % 3 > 0 && 'md:border-l md:border-border',
            i >= 3 && 'md:border-t lg:border-t-0',
            i > 0 && 'lg:border-l lg:border-border',
          )}
        >
          <p className="text-[13px] text-muted-foreground">{cell.label}</p>
          <p className="text-2xl font-medium tracking-tight text-foreground">{cell.value}</p>
          {cell.caption && (
            <p
              className={cn(
                'text-xs',
                cell.captionDanger ? 'font-medium text-destructive' : 'text-muted-foreground',
              )}
            >
              {cell.caption}
            </p>
          )}
        </div>
      ))}
    </Card>
  )
}

/* ── Charts ──────────────────────────────────────────────────── */

type Series = { key: keyof AdminMetricsDay; label: string; color: string }

function MetricTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const date = payload[0].payload.date
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">
        {typeof date === 'string' ? shortDate(date) : null}
      </p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-sm font-medium text-popover-foreground">
          {(p.value ?? 0).toLocaleString()} {p.name}
        </p>
      ))}
    </div>
  )
}

function MetricChart({
  title,
  data,
  series,
}: {
  title: string
  data: AdminMetricsDay[]
  series: Series[]
}) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-[0.9375rem] font-medium text-foreground">{title}</h2>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
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
              tickFormatter={(n: number) => COMPACT_FMT.format(n)}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              content={<MetricTooltip />}
              cursor={{ stroke: 'hsl(var(--foreground))', strokeOpacity: 0.15 }}
            />
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                fill={s.color}
                fillOpacity={0.05}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: s.color,
                  stroke: 'hsl(var(--background))',
                  strokeWidth: 2,
                }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function ChartsSection({ days }: { days: AdminMetricsDay[] }) {
  return (
    <div className="space-y-6">
      <MetricChart
        title="Jobs per day"
        data={days}
        series={[
          { key: 'jobs', label: 'jobs', color: 'hsl(var(--foreground))' },
          { key: 'jobsFailed', label: 'failed', color: 'hsl(var(--destructive))' },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <MetricChart
          title="Credits per day"
          data={days}
          series={[{ key: 'creditsConsumed', label: 'credits', color: 'hsl(var(--foreground))' }]}
        />
        <MetricChart
          title="New users per day"
          data={days}
          series={[{ key: 'newUsers', label: 'new users', color: 'hsl(var(--foreground))' }]}
        />
      </div>
    </div>
  )
}

/* ── Loading ─────────────────────────────────────────────────── */

function HealthSkeleton() {
  return (
    <Card className="grid grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-2 p-5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </Card>
  )
}

function KpiSkeleton() {
  return (
    <Card className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="space-y-2 p-5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-14" />
        </div>
      ))}
    </Card>
  )
}

function ChartsSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <Skeleton className="mb-4 h-5 w-32" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i} className="p-5">
            <Skeleton className="mb-4 h-5 w-32" />
            <Skeleton className="h-52 w-full rounded-xl" />
          </Card>
        ))}
      </div>
    </div>
  )
}
