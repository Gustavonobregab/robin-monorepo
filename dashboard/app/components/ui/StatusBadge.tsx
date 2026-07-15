import { cn } from '@/app/lib/utils'
import type { JobStatus } from '@/types'

/* Neutral status dot + label; takes JobStatus directly and owns the mapping. */
type BadgeStatus = 'done' | 'processing' | 'queued' | 'failed'

const TO_BADGE: Record<JobStatus, BadgeStatus> = {
  created: 'queued',
  pending: 'queued',
  processing: 'processing',
  completed: 'done',
  failed: 'failed',
}

const DOT: Record<BadgeStatus, string> = {
  done: 'bg-foreground',
  processing: 'bg-muted-foreground animate-pulse',
  queued: 'bg-muted-foreground/50',
  failed: 'bg-transparent ring-1 ring-inset ring-muted-foreground/60',
}

const LABEL: Record<BadgeStatus, string> = {
  done: 'Done',
  processing: 'Processing',
  queued: 'Queued',
  failed: 'Failed',
}

export function StatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  const badge = TO_BADGE[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] text-muted-foreground', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT[badge])} />
      {LABEL[badge]}
    </span>
  )
}
