'use client'
import useSWR from 'swr'
import { StatCard } from '@/app/components/dashboard/StatCard'
import { UsageChart } from '@/app/components/dashboard/UsageChart'
import { RecentJobsTable } from '@/app/components/dashboard/RecentJobsTable'
import { QuickActions } from '@/app/components/dashboard/QuickActions'
import { Skeleton } from '@/app/components/ui/skeleton'
import { getUsageAnalytics } from '@/app/http/usage'
import { formatBytes } from '@/app/lib/utils'
import type { ApiResponse, UsageAnalytics } from '@/types'

export default function DashboardPage() {
  const { data, isLoading } = useSWR<ApiResponse<UsageAnalytics>>(
    'usage-analytics',
    () => getUsageAnalytics('30d'),
  )

  const analytics = data?.data

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto p-4 sm:p-6">
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Requests" value={analytics?.summary.totalRequests ?? 0} />
          <StatCard
            label="Data Processed"
            value={formatBytes(analytics?.summary.totalInputBytes ?? 0)}
            description="total input across all jobs"
          />
          <StatCard
            label="Data Saved"
            value={formatBytes((analytics?.summary.totalInputBytes ?? 0) - (analytics?.summary.totalOutputBytes ?? 0))}
            description="total reduction in output size"
          />
        </div>

        <UsageChart data={analytics?.chart ?? []} />

        <div>
          <h2 className="font-medium text-sm mb-3">Quick actions</h2>
          <QuickActions />
        </div>

        <div>
          <h2 className="font-medium text-sm mb-3">Recent activity</h2>
          <RecentJobsTable jobs={analytics?.recent ?? []} />
        </div>
      </div>
    </div>
  )
}
