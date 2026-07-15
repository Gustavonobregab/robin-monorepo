import { cn } from '@/app/lib/utils'

/* Thin neutral meter — grey track, near-black fill. Used for credits and
   quota; keep it quiet, no colour until the day we add semantic states. */
export function Progress({
  value,
  max = 100,
  className,
}: {
  value: number
  max?: number
  className?: string
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]', className)}>
      <div className="h-full rounded-full bg-foreground transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  )
}
