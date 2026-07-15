import { cn } from '@/app/lib/utils'

/* Card surface: white, hairline border, 20px radius, no shadow. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-border bg-card', className)} {...props} />
}
