import { cn } from '@/app/lib/utils'

/* Quiet empty state: icon well, title, one-line hint, optional action. */
export function EmptyState({
  icon,
  title,
  hint,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: string
  hint?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-14 text-center', className)}>
      {icon && (
        <div className="mb-1 grid h-11 w-11 place-items-center rounded-2xl bg-black/[0.04] text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="max-w-xs text-[13px] text-muted-foreground">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
