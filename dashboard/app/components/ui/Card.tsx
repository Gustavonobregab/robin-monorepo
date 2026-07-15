import { cn } from '@/app/lib/utils'

/* ElevenLabs surface: white, hairline alpha border, 20px radius, no shadow.
   Used to group content (stat panels, table containers). */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-border bg-card', className)} {...props} />
}
