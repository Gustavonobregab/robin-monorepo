import { cn } from '@/app/lib/utils'

/* Thin neutral meter for credits/quota; indeterminate renders a pulsing bar. */
export function Progress({
  value,
  max = 100,
  indeterminate = false,
  className,
}: {
  value?: number
  max?: number
  indeterminate?: boolean
  className?: string
}) {
  const pct = indeterminate ? 100 : Math.min(100, Math.max(0, ((value ?? 0) / max) * 100))
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]', className)}>
      <div
        className={cn('h-full rounded-full bg-foreground transition-[width]', indeterminate && 'animate-pulse')}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
