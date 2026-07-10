'use client'
import useSWR from 'swr'
import { Skeleton } from '@/app/components/ui/skeleton'
import { getUsageAnalytics } from '@/app/http/usage'
import type { UsageEvent } from '@/types'

interface ToolHistoryPanelProps {
  pipelineType: UsageEvent['pipelineType']
  emptyIcon: React.ReactNode
  emptyLabel: string
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ToolHistoryPanel({ pipelineType, emptyIcon, emptyLabel }: ToolHistoryPanelProps) {
  const { data, isLoading } = useSWR('usage/analytics/30d', () => getUsageAnalytics('30d'))

  const events = (data?.data?.recent ?? []).filter((e) => e.pipelineType === pipelineType)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        {emptyIcon}
        <p className="font-medium text-foreground">{emptyLabel}</p>
        <p className="text-sm text-muted mt-1">Submit a job to see your history</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div
          key={event._id}
          className="rounded-xl p-3 space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground capitalize">
              {event.operations.join(', ')}
            </span>
            <span className="text-xs text-muted">{formatDate(event.timestamp)}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>{formatBytes(event.inputBytes)} to {formatBytes(event.outputBytes)}</span>
            <span>{event.processingMs}ms</span>
            {event.inputBytes > 0 && (
              <span className="text-accent-strong font-medium">
                {Math.round((1 - event.outputBytes / event.inputBytes) * 100)}% saved
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
