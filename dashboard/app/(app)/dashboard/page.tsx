import { StatCard } from '@/app/components/dashboard/StatCard'
import { UsageChart } from '@/app/components/dashboard/UsageChart'
import { RecentJobsTable } from '@/app/components/dashboard/RecentJobsTable'
import { QuickActions } from '@/app/components/dashboard/QuickActions'
import type { UsageChartPoint, UsageEvent } from '@/types'

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

const MOCK_RECENT: UsageEvent[] = [
  {
    _id: '1', idempotencyKey: 'job:1', userId: 'u1', jobId: 'j1',
    pipelineType: 'text', operations: ['trim', 'shorten'],
    inputBytes: 18432, outputBytes: 11264, processingMs: 1200,
    timestamp: '2026-03-17T14:32:00Z',
    text: { characterCount: 18000, wordCount: 3000, encoding: 'utf-8' },
  },
  {
    _id: '2', idempotencyKey: 'job:2', userId: 'u1', jobId: 'j2',
    pipelineType: 'audio', operations: ['normalize', 'compress'],
    inputBytes: 4404019, outputBytes: 2936013, processingMs: 8400,
    timestamp: '2026-03-17T13:15:00Z',
    audio: { durationMs: 180000, format: 'mp3', sampleRate: 44100, channels: 2 },
  },
  {
    _id: '3', idempotencyKey: 'job:3', userId: 'u1', jobId: 'j3',
    pipelineType: 'text', operations: ['shorten', 'minify'],
    inputBytes: 43008, outputBytes: 24576, processingMs: 2100,
    timestamp: '2026-03-17T11:58:00Z',
    text: { characterCount: 42000, wordCount: 7000, encoding: 'utf-8' },
  },
]

export default function DashboardPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Requests" value={347} />
        <StatCard label="Data Processed" value="24.5 MB" description="total input across all jobs" />
        <StatCard label="Data Saved" value="8.2 MB" description="total reduction in output size" />
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
