import { forwardRef } from 'react'
import { cn } from '@/app/lib/utils'

/* Filter chip copied from ElevenLabs: 40px tall, 12px radius, transparent with a
   1.5px alpha-black border; when active it fills with a soft grey. */
interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, active = false, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors',
        active
          ? 'border-[1.5px] border-transparent bg-black/[0.06] text-foreground'
          : 'border-[1.5px] border-black/10 text-foreground hover:bg-black/[0.04]',
        className,
      )}
      {...props}
    />
  ),
)
Chip.displayName = 'Chip'
