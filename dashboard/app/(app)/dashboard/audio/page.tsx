// dashboard/app/(app)/dashboard/audio/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { ToolLayout } from '@/app/components/tools/ToolLayout'
import { UrlInput } from '@/app/components/tools/UrlInput'
import { PresetSelector } from '@/app/components/tools/PresetSelector'
import { MetricsPanel } from '@/app/components/tools/MetricsPanel'
import { useJobPoll } from '@/app/hooks/use-job-poll'
import { submitAudioJob } from '@/app/http/audio'
import { getAudioJobStatus } from '@/app/http/jobs'
import type { AudioPreset } from '@/types'

const AUDIO_PRESETS = [
  { value: 'chill', label: 'Chill', description: 'Light processing, preserves original dynamics' },
  { value: 'medium', label: 'Medium', description: 'Balanced processing for general use' },
  { value: 'aggressive', label: 'Aggressive', description: 'Heavy processing, maximizes loudness' },
  { value: 'podcast', label: 'Podcast', description: 'Optimized for voice content' },
  { value: 'lecture', label: 'Lecture', description: 'Trim silence + 1.5× speed + normalize' },
]

export default function AudioPage() {
  const [url, setUrl] = useState('')
  const [preset, setPreset] = useState<AudioPreset>('medium')
  const [jobId, setJobId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { job, isPolling, isFailed, timedOut } = useJobPoll({
    jobId,
    fetcher: getAudioJobStatus,
  })

  async function handleSubmit() {
    if (!url) return toast.error('Please enter a URL')
    setJobId(null)
    setSubmitting(true)
    try {
      const res = await submitAudioJob({ audioUrl: url, preset })
      setJobId(res.data._id)
    } catch {
      toast.error('Failed to submit job. Check your API key and URL.')
    } finally {
      setSubmitting(false)
    }
  }

  // Show error toast once when job transitions to failed (not on every render)
  useEffect(() => {
    if (isFailed) toast.error(job?.error ?? 'Job failed')
  }, [isFailed]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ToolLayout
      title="Audio compression"
      description="Process an audio file using a preset. Paste a public URL to your audio file."
      inputPanel={
        <UrlInput
          value={url}
          onChange={setUrl}
          placeholder="https://example.com/recording.mp3"
          label="Audio file URL"
        />
      }
      settingsPanel={<PresetSelector presets={AUDIO_PRESETS} value={preset} onChange={setPreset} />}
      outputPanel={
        <MetricsPanel
          status={job?.status}
          metrics={job?.result?.metrics}
          error={job?.error}
          timedOut={timedOut}
        />
      }
      action={
        <Button
          onClick={handleSubmit}
          disabled={submitting || isPolling}
          className="rounded-full bg-accent-strong text-foreground hover:bg-accent-light"
        >
          {submitting || isPolling ? 'Processing…' : 'Process audio'}
        </Button>
      }
    />
  )
}
