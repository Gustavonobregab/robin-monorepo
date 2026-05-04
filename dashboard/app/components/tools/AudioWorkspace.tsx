'use client'

import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { cn, formatBytes } from '@/app/lib/utils'
import type { JobMetrics, JobStatus } from '@/types'

const ACCEPTED = '.mp3,.wav'

interface AudioWorkspaceProps {
  file: File | null
  onFileChange: (file: File | null) => void
  status?: JobStatus
  metrics?: JobMetrics
  outputUrl?: string
  error?: string
  isProcessing: boolean
  timedOut: boolean
}

export function AudioWorkspace({
  file,
  onFileChange,
  status,
  metrics,
  outputUrl,
  error,
  isProcessing,
  timedOut,
}: AudioWorkspaceProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const locked = isProcessing
  const showOutput = status === 'completed' && metrics
  const showError = status === 'failed'

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => !locked && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!locked) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (!locked) onFileChange(e.dataTransfer.files[0] ?? null)
        }}
        disabled={locked}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-sm transition-colors',
          locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
          dragOver
            ? 'border-accent-strong bg-accent-strong/5'
            : file
              ? 'border-accent-strong/40 bg-accent-strong/5'
              : 'border-border hover:border-muted-foreground/40'
        )}
      >
        {file ? (
          <>
            <span className="font-medium text-foreground">{file.name}</span>
            <span className="text-xs text-muted">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </span>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted" strokeWidth={1.5} />
            <span className="text-muted">Drop an audio file here or click to browse</span>
            <span className="text-xs text-muted">.mp3 or .wav</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />

      {isProcessing && !timedOut && <ProcessingDots />}

      {isProcessing && timedOut && (
        <p className="text-center text-sm text-muted">
          Taking longer than expected.{' '}
          <button
            onClick={() => window.location.reload()}
            className="underline text-foreground"
          >
            Try again
          </button>
        </p>
      )}

      {showError && (
        <p className="text-sm text-red-600">Job failed: {error ?? 'Unknown error'}</p>
      )}

      {showOutput && (
        <div className="space-y-3 border-t border-border pt-5">
          {outputUrl && <audio controls src={outputUrl} className="w-full" />}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{metrics.compressionRatio}x</span>
            <span className="text-sm text-muted">smaller</span>
          </div>
          <div className="text-xs text-muted">
            {formatBytes(metrics.inputSize ?? 0)} → {formatBytes(metrics.outputSize ?? 0)}
            {' · '}
            {metrics.operationsApplied.join(' → ')}
          </div>
          {outputUrl && (
            <a
              href={outputUrl}
              download
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-strong hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function ProcessingDots() {
  return (
    <div className="flex items-center justify-center gap-1.5 py-2" aria-label="Processing">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
    </div>
  )
}
