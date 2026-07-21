'use client'

import { Fragment, type ReactNode } from 'react'
import { ChevronRight, SlidersHorizontal } from 'lucide-react'
import { Chip } from './Chip'
import { Skeleton } from './Skeleton'
import { cn } from '@/app/lib/utils'
import type { PresetOperation } from '@/types'

interface PresetOption {
  id: string
  name: string
  description: string
  operations: PresetOperation[]
}

const OPERATION_LABELS: Record<string, string> = {
  'trim-silence': 'Trim silence',
  'json-to-toon': 'JSON to TOON',
  speedup: 'Speed up',
}

const FORMAT_LABELS: Record<string, string> = {
  opus: 'Opus',
  mp3: 'MP3',
  webp: 'WebP',
  avif: 'AVIF',
  jpeg: 'JPEG',
  png: 'PNG',
}

/* Only the params that characterise a preset; the rest is tuning noise inside a chip. */
const HEADLINE_PARAMS: Record<string, string[]> = {
  'trim-silence': ['aggressiveness'],
  normalize: ['targetLevel'],
  compress: ['ratio'],
  speedup: ['rate'],
  encode: ['format', 'bitrate', 'quality'],
  resize: ['width'],
  trim: ['intensity'],
}

const operationLabel = (op: string) =>
  OPERATION_LABELS[op] ?? op.charAt(0).toUpperCase() + op.slice(1).replace(/-/g, ' ')

function formatParam(key: string, value: string | number | boolean): string | null {
  if (typeof value === 'boolean') return null
  switch (key) {
    case 'rate':
      return `${value}x`
    case 'bitrate':
      return `${value} kbps`
    case 'quality':
      return `q${value}`
    case 'width':
      return `${value}px`
    case 'ratio':
      return `${value}:1`
    case 'targetLevel':
      return `${value} LUFS`
    case 'intensity':
      return `${value}%`
    case 'aggressiveness':
      return `${Math.round(Number(value) * 100)}%`
    case 'format':
      return FORMAT_LABELS[String(value)] ?? String(value)
    default:
      return String(value)
  }
}

function paramSummary(op: PresetOperation): string {
  const keys = HEADLINE_PARAMS[op.type]
  if (!keys || !op.params) return ''
  return keys
    .flatMap((key) => {
      const value = op.params?.[key]
      if (value === undefined) return []
      const formatted = formatParam(key, value)
      return formatted ? [formatted] : []
    })
    .join(' ')
}

/* The steps the job will actually run, in order: the concrete answer to what a preset does. */
function Pipeline({ operations }: { operations: PresetOperation[] }) {
  return (
    <div className="flex flex-wrap items-center gap-y-1.5">
      {operations.map((op, i) => {
        const summary = paramSummary(op)
        return (
          <Fragment key={`${op.type}-${i}`}>
            {i > 0 && <ChevronRight className="mx-0.5 h-3 w-3 shrink-0 text-muted-foreground/50" />}
            <span className="rounded border border-black/10 bg-background px-1.5 py-0.5 font-mono text-[11px]">
              <span className="text-foreground/75">{operationLabel(op.type)}</span>
              {summary && <span className="text-muted-foreground"> {summary}</span>}
            </span>
          </Fragment>
        )
      })}
    </div>
  )
}

/* Preset OR custom, explicit: named chips, then a separated Custom chip.
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

            <span className="mx-1 h-6 w-px shrink-0 bg-black/10" aria-hidden />

            <Chip
              active={value === null}
              onClick={() => onChange(null)}
              className={cn(
                'gap-1.5',
                value === null
                  ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary'
                  : 'border-primary/30 text-primary hover:bg-primary/[0.06]',
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Custom
            </Chip>
          </>
        )}
      </div>

      {active && (
        <div className="space-y-2 rounded-lg bg-black/[0.03] px-3 py-2.5">
          <p className="text-[13px] leading-snug text-foreground">{active.description}</p>
          <Pipeline operations={active.operations} />
        </div>
      )}

      {!loading && value === null && children}
    </div>
  )
}
