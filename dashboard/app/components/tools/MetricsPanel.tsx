import { Skeleton } from '@/app/components/ui/skeleton'
import { formatBytes } from '@/app/lib/utils'
import type { JobMetrics, JobStatus } from '@/types'

interface MetricsPanelProps {
  status: JobStatus | undefined
  metrics: JobMetrics | undefined
  error: string | undefined
  timedOut: boolean
}

export function MetricsPanel({ status, metrics, error, timedOut }: MetricsPanelProps) {
  if (!status) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted">
        Output will appear here
      </div>
    )
  }

  if (status === 'created' || status === 'pending' || status === 'processing') {
    if (timedOut) {
      return (
        <div className="text-sm text-muted text-center">
          This is taking longer than expected.{' '}
          <button onClick={() => window.location.reload()} className="underline text-foreground">
            Try again
          </button>
        </div>
      )
    }
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-1/2 rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-4 w-1/3 rounded" />
        <p className="text-xs text-muted mt-2">Processing…</p>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="text-sm text-red-600">
        Job failed: {error ?? 'Unknown error'}
      </div>
    )
  }

  if (status === 'completed' && metrics) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{metrics.compressionRatio}×</span>
          <span className="text-sm text-muted">smaller</span>
        </div>
        <div className="text-sm text-muted">
          {formatBytes(metrics.inputSize ?? 0)} → {formatBytes(metrics.outputSize ?? 0)}
        </div>
        <div className="text-xs text-muted">
          Operations: {metrics.operationsApplied.join(' → ')}
        </div>
      </div>
    )
  }

  return null
}
