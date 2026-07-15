'use client'

import * as Dropdown from '@radix-ui/react-dropdown-menu'
import { cn } from '@/app/lib/utils'

/* ElevenLabs-style menu: white popover, 12px radius, hairline border, soft
   shadow; items are 8px-radius rows that fill grey on highlight. */

export const DropdownMenu = Dropdown.Root
export const DropdownMenuTrigger = Dropdown.Trigger

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof Dropdown.Content>) {
  return (
    <Dropdown.Portal>
      <Dropdown.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[10rem] overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg',
          className,
        )}
        {...props}
      />
    </Dropdown.Portal>
  )
}

export function DropdownMenuItem({
  className,
  destructive = false,
  ...props
}: React.ComponentProps<typeof Dropdown.Item> & { destructive?: boolean }) {
  return (
    <Dropdown.Item
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-black/[0.05]',
        destructive ? 'text-destructive' : 'text-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Dropdown.Separator>) {
  return <Dropdown.Separator className={cn('my-1 h-px bg-border', className)} {...props} />
}
