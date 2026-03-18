'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { ToolLayout } from '@/app/components/tools/ToolLayout'
import { UrlInput } from '@/app/components/tools/UrlInput'
import { MetricsPanel } from '@/app/components/tools/MetricsPanel'
import { AudioSettingsPanel, type AudioSettings } from '@/app/components/tools/AudioSettingsPanel'
import { useJobPoll } from '@/app/hooks/use-job-poll'
import { submitAudioJob } from '@/app/http/audio'
import { getAudioJobStatus } from '@/app/http/jobs'

export default function AudioPage() {
  const [url, setUrl] = useState('')
  const [settings, setSettings] = useState<AudioSettings>({ mode: 'preset', preset: 'medium' })
  const [jobId, setJobId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { job, isPolling, isFailed, timedOut } = useJobPoll({
    jobId,
    fetcher: getAudioJobStatus,
  })

  const canSubmit =
    settings.mode === 'preset' ||
    (settings.mode === 'custom' && settings.operations.length > 0)

  async function handleSubmit() {
    if (!url) return toast.error('Please enter a URL')
    if (!canSubmit) return toast.error('Enable at least one operation')
    setJobId(null)
    setSubmitting(true)
    try {
      const input =
        settings.mode === 'preset'
          ? { audioUrl: url, preset: settings.preset }
          : { audioUrl: url, operations: settings.operations }

      const res = await submitAudioJob(input)
      setJobId(res.data._id)
    } catch {
      toast.error('Failed to submit job. Check your API key and URL.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (isFailed) toast.error(job?.error ?? 'Job failed')
  }, [isFailed]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ToolLayout
      title="Audio compression"
      description="Process an audio file using a preset or custom operations. Paste a public URL to your audio file."
      inputPanel={
        <UrlInput
          value={url}
          onChange={setUrl}
          placeholder="https://example.com/recording.mp3"
          label="Audio file URL"
        />
      }
      settingsPanel={<AudioSettingsPanel value={settings} onChange={setSettings} />}
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
          disabled={submitting || isPolling || !canSubmit}
          className="rounded-full bg-accent-strong text-foreground hover:bg-accent-light"
        >
          {submitting || isPolling ? 'Processing…' : 'Process audio'}
        </Button>
      }
    />
  )
}
