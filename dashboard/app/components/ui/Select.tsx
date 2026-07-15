'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/app/lib/utils'

/* Select: 40px trigger, white popover; both variants share the popover body. */

type Option = { value: string; label: string; hint?: string }

function SelectOptions({ options }: { options: Option[] }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={6}
        className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg"
      >
        <SelectPrimitive.Viewport>
          {options.map((o) => (
            <SelectPrimitive.Item
              key={o.value}
              value={o.value}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm text-foreground outline-none data-[highlighted]:bg-black/[0.05]"
            >
              <div className="flex flex-col">
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                {o.hint && <span className="text-xs text-muted-foreground">{o.hint}</span>}
              </div>
              <SelectPrimitive.ItemIndicator>
                <Check className="h-4 w-4" />
              </SelectPrimitive.ItemIndicator>
            </SelectPrimitive.Item>
          ))}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function Select({
  value,
  onValueChange,
  options,
  className,
}: {
  value?: string
  onValueChange?: (v: string) => void
  options: Option[]
  className?: string
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-10 items-center justify-between gap-2 rounded-lg border-[1.5px] border-black/10 bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-black/[0.04] focus:outline-none',
          className,
        )}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectOptions options={options} />
    </SelectPrimitive.Root>
  )
}

/* Compact inline variant for composer settings bars: icon + value, borderless until hover. */
export function InlineSelect({
  value,
  onValueChange,
  options,
  icon,
  className,
}: {
  value: string
  onValueChange?: (v: string) => void
  options: Option[]
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-[10px] px-2 text-[13px] font-medium text-foreground transition-colors hover:bg-black/[0.05] focus:outline-none',
          className,
        )}
      >
        {icon}
        <SelectPrimitive.Value />
      </SelectPrimitive.Trigger>
      <SelectOptions options={options} />
    </SelectPrimitive.Root>
  )
}
