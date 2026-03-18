import { StatCard } from '@/app/components/dashboard/StatCard'
import { UsageChart } from '@/app/components/dashboard/UsageChart'
import { RecentJobsTable } from '@/app/components/dashboard/RecentJobsTable'
import { QuickActions } from '@/app/components/dashboard/QuickActions'
import type { UsageChartPoint, RecentActivity } from '@/types'

const MOCK_CHART: UsageChartPoint[] = [
  { date: 'Feb 16', requests: 4 },
  { date: 'Feb 18', requests: 9 },
  { date: 'Feb 20', requests: 6 },
  { date: 'Feb 22', requests: 14 },
  { date: 'Feb 24', requests: 11 },
  { date: 'Feb 26', requests: 20 },
  { date: 'Feb 28', requests: 17 },
  { date: 'Mar 02', requests: 25 },
  { date: 'Mar 04', requests: 19 },
  { date: 'Mar 06', requests: 30 },
  { date: 'Mar 08', requests: 27 },
  { date: 'Mar 10', requests: 38 },
  { date: 'Mar 12', requests: 34 },
  { date: 'Mar 14', requests: 42 },
  { date: 'Mar 16', requests: 47 },
]

const MOCK_RECENT: RecentActivity[] = [
  { id: '1', type: 'text', status: 'success', size: '18 KB to 11 KB', latency: '1.2s', timestamp: 'Mar 17, 14:32' },
  { id: '2', type: 'audio', status: 'success', size: '4.2 MB to 2.8 MB', latency: '8.4s', timestamp: 'Mar 17, 13:15' },
  { id: '3', type: 'text', status: 'success', size: '42 KB to 24 KB', latency: '2.1s', timestamp: 'Mar 17, 11:58' },
  { id: '4', type: 'audio', status: 'failed', size: '—', latency: '—', timestamp: 'Mar 16, 22:10' },
  { id: '5', type: 'text', status: 'success', size: '7 KB to 4 KB', latency: '0.9s', timestamp: 'Mar 16, 19:44' },
]

export default function DashboardPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Requests" value={347} />
        <StatCard label="Tokens Saved" value="2.1 MB" description="bytes saved across all jobs" />
        <StatCard label="Tokens Used" value="8,400" />
      </div>

      <UsageChart data={MOCK_CHART} />

      <div>
        <h2 className="font-medium text-sm mb-3">Quick actions</h2>
        <QuickActions />
      </div>

      <div>
        <h2 className="font-medium text-sm mb-3">Recent activity</h2>
        <RecentJobsTable jobs={MOCK_RECENT} />
      </div>
    </div>
    </div>
  )
}
