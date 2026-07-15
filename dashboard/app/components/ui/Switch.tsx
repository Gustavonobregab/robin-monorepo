'use client'

import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '@/app/lib/utils'

/* Near-black when on, alpha-grey track when off. */
export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'inline-flex h-6 w-10 shrink-0 items-center rounded-full bg-black/[0.12] p-0.5 transition-colors data-[state=checked]:bg-foreground',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="h-5 w-5 rounded-full bg-background shadow-sm transition-transform data-[state=checked]:translate-x-4" />
    </SwitchPrimitive.Root>
  )
}
