'use client'

import type { ReactNode } from 'react'
import { Chip } from './Chip'
import { Skeleton } from './Skeleton'
import { cn } from '@/app/lib/utils'

interface PresetOption {
  id: string
  name: string
  description: string
}

/* Preset OR custom, explicit: named chips plus a Custom chip at the end.
   children are the custom controls, rendered only while Custom is active. */
export function PresetPicker({
  presets,
  value,
  onChange,
  loading = false,
  className,
  children,
}: {
  presets: PresetOption[]
  value: string | null
  onChange: (id: string | null) => void
  loading?: boolean
  className?: string
  children?: ReactNode
}) {
  const active = presets.find((p) => p.id === value)

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-24 rounded-lg" />)
        ) : (
          <>
            {presets.map((p) => (
              <Chip key={p.id} active={value === p.id} onClick={() => onChange(p.id)}>
                {p.name}
              </Chip>
            ))}
            <Chip
              active={value === null}
              onClick={() => onChange(null)}
              className={value === null ? 'border-transparent bg-foreground text-background' : ''}
            >
              Custom
            </Chip>
          </>
        )}
      </div>
      {active && <p className="px-1 text-[13px] text-muted-foreground">{active.description}</p>}
      {!loading && value === null && children}
    </div>
  )
}
