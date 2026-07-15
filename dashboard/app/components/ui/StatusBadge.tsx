import { cn } from '@/app/lib/utils'

/* Neutral status: a small dot + muted label. Monochrome by design — state is
   told through dot weight, not colour. `failed` may use the destructive tint
   only when the row needs urgent attention. */
export type JobStatus = 'done' | 'processing' | 'queued' | 'failed'

const DOT: Record<JobStatus, string> = {
  done: 'bg-foreground',
  processing: 'bg-muted-foreground animate-pulse',
  queued: 'bg-muted-foreground/50',
  failed: 'bg-transparent ring-1 ring-inset ring-muted-foreground/60',
}

const LABEL: Record<JobStatus, string> = {
  done: 'Done',
  processing: 'Processing',
  queued: 'Queued',
  failed: 'Failed',
}

export function StatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] text-muted-foreground', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT[status])} />
      {LABEL[status]}
    </span>
  )
}
