import { cn } from '@/app/lib/utils'

/* The one loading primitive — shape it like the content it replaces.
   Never hand-roll animate-pulse elsewhere. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-lg bg-black/[0.06]', className)} {...props} />
}
