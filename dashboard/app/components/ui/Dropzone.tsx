'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/app/lib/utils'

/* Voice-isolator composer surface: outer card 24px radius with hairline
   border; inner drop well 16px radius, 2% black fill, muted label. Children
   render below the well (settings bar, submit). */
export function Dropzone({
  onFiles,
  accept,
  label = 'Drop files here',
  hint,
  multiple = false,
  className,
  children,
}: {
  onFiles: (files: File[]) => void
  accept?: string
  label?: string
  hint?: string
  multiple?: boolean
  className?: string
  children?: React.ReactNode
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length) onFiles(multiple ? files : files.slice(0, 1))
    },
    [onFiles, multiple],
  )

  return (
    <div className={cn('rounded-3xl border border-border bg-card p-2', className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'flex min-h-[6rem] w-full flex-col items-center justify-center gap-1 rounded-2xl p-2 transition-colors',
          dragging ? 'bg-black/[0.06]' : 'bg-black/[0.02] hover:bg-black/[0.04]',
        )}
      >
        <span className="text-sm text-black/50">{label}</span>
        {hint && <span className="text-xs text-black/35">{hint}</span>}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) onFiles(files)
          e.target.value = ''
        }}
      />
      {children}
    </div>
  )
}
