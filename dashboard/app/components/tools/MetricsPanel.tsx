import { Skeleton } from '@/app/components/ui/skeleton'
import { formatBytes } from '@/app/lib/utils'
import type { JobMetrics, JobStatus } from '@/types'

interface MetricsPanelProps {
  status: JobStatus | undefined
  metrics: JobMetrics | undefined
  outputUrl: string | undefined
  error: string | undefined
  timedOut: boolean
}

export function MetricsPanel({ status, metrics, outputUrl, error, timedOut }: MetricsPanelProps) {
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
      <div className="space-y-4">
        {outputUrl && (
          <div className="space-y-2">
            <audio controls src={outputUrl} className="w-full" />
            <a
              href={outputUrl}
              download
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-strong hover:underline"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              Download
            </a>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{metrics.compressionRatio}x</span>
          <span className="text-sm text-muted">smaller</span>
        </div>
        <div className="text-sm text-muted">
          {formatBytes(metrics.inputSize ?? 0)} to {formatBytes(metrics.outputSize ?? 0)}
        </div>
        <div className="text-xs text-muted">
          Operations: {metrics.operationsApplied.join(' -> ')}
        </div>
      </div>
    )
  }

  return null
}
