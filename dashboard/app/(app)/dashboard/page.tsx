'use client'
import useSWR from 'swr'
import { StatCard } from '@/app/components/dashboard/StatCard'
import { UsageChart } from '@/app/components/dashboard/UsageChart'
import { RecentJobsTable } from '@/app/components/dashboard/RecentJobsTable'
import { QuickActions } from '@/app/components/dashboard/QuickActions'
import { PageHeader } from '@/app/components/ui/page-header'
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

  return (
    <div className="pt-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Dashboard" />

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
            <Skeleton className="h-44 rounded-lg" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-64 rounded-lg" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-foreground">Quick actions</h2>
              <QuickActions />
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-foreground">Recent activity</h2>
              <RecentJobsTable jobs={analytics?.recent ?? []} />
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
