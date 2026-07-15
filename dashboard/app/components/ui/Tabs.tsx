'use client'

import { useState } from 'react'
import { cn } from '@/app/lib/utils'

/* Underline tabs copied from ElevenLabs: quiet muted labels, the active one
   inked near-black with a 2px underline flush to the bottom hairline. */
export function Tabs({
  tabs,
  defaultValue,
  onChange,
}: {
  tabs: string[]
  defaultValue?: string
  onChange?: (value: string) => void
}) {
  const [active, setActive] = useState(defaultValue ?? tabs[0])
  return (
    <div className="flex items-center gap-1 border-b border-border">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => {
            setActive(t)
            onChange?.(t)
          }}
          className={cn(
            'relative -mb-px border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors',
            active === t
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  )
}
