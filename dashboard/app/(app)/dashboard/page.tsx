'use client'
import useSWR from 'swr'
import { StatCard } from '@/app/components/dashboard/StatCard'
import { UsageChart } from '@/app/components/dashboard/UsageChart'
import { RecentJobsTable } from '@/app/components/dashboard/RecentJobsTable'
import { QuickActions } from '@/app/components/dashboard/QuickActions'
import { Skeleton } from '@/app/components/ui/skeleton'
import { getUsageAnalytics } from '@/app/http/usage'
import type { ApiResponse, UsageAnalytics } from '@/types'

export default function DashboardPage() {
  const { data, isLoading, error } = useSWR<ApiResponse<UsageAnalytics>>(
    'usage-analytics',
    () => getUsageAnalytics('30d')
  )

  const analytics = data?.data

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted text-sm">
        Failed to load dashboard data.
        <button onClick={() => window.location.reload()} className="ml-2 underline text-foreground">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Requests" value={analytics?.stats.totalRequests ?? 0} />
        <StatCard label="Tokens Saved" value={analytics?.stats.tokensSaved ?? 0} description="bytes saved across all jobs" />
        <StatCard label="Tokens Used" value={analytics?.stats.tokensUsed ?? 0} />
      </div>

      {analytics?.chart && <UsageChart data={analytics.chart} />}

      <div>
        <h2 className="font-medium text-sm mb-3">Quick actions</h2>
        <QuickActions />
      </div>

      <div>
        <h2 className="font-medium text-sm mb-3">Recent activity</h2>
        <RecentJobsTable jobs={analytics?.recent ?? []} />
      </div>
    </div>
  )
}
