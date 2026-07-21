'use client'

import { toast } from 'sonner'
import { Loader2, Mic, Square } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { useAudioRecorder } from '@/app/hooks/use-audio-recorder'

const MAX_SECONDS = 300

function formatClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/* Records straight into the composer: the result is a File, so everything
   downstream (preset, credits, submit) stays on the upload path. */
export function RecordControl({
  onRecorded,
  disabled = false,
}: {
  onRecorded: (file: File) => void
  disabled?: boolean
}) {
  const { status, seconds, supported, start, stop } = useAudioRecorder({
    maxSeconds: MAX_SECONDS,
    onRecorded,
    onError: (message) => toast.error(message),
  })

  if (!supported) return null

  if (status === 'processing') {
    return (
      <div className="flex items-center gap-2 px-1 text-[13px] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Processing recording
      </div>
    )
  }

  if (status === 'recording') {
    return (
      <div className="flex items-center gap-2.5 px-1">
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-destructive" aria-hidden />
        <span
          className="text-[13px] tabular-nums text-foreground"
          role="timer"
          aria-live="off"
        >
          {formatClock(seconds)}
        </span>
        <span className="text-[13px] text-muted-foreground">of {formatClock(MAX_SECONDS)}</span>
        <Button variant="secondary" size="sm" onClick={stop}>
          <Square className="h-3.5 w-3.5" />
          Stop
        </Button>
      </div>
    )
  }

  return (
    <Button variant="ghost" size="sm" disabled={disabled} onClick={() => void start()}>
      <Mic className="h-4 w-4" />
      Record audio
    </Button>
  )
}
