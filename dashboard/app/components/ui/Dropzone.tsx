'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/app/lib/utils'

/* Composer surface: outer card + inner drop well; children render below. */
export function Dropzone({
  onFiles,
  accept,
  label = 'Drop files here',
  hint,
  className,
  children,
}: {
  onFiles: (files: File[]) => void
  accept?: string
  label?: string
  hint?: string
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
      if (files.length) onFiles(files.slice(0, 1))
    },
    [onFiles],
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
        <span className="text-sm text-muted-foreground">{label}</span>
        {hint && <span className="text-xs text-muted-foreground/70">{hint}</span>}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
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
