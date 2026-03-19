'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { ToolLayout } from '@/app/components/tools/ToolLayout'
import { AudioFileInput } from '@/app/components/tools/AudioFileInput'
import { MetricsPanel } from '@/app/components/tools/MetricsPanel'
import { AudioSettingsPanel, type AudioSettings } from '@/app/components/tools/AudioSettingsPanel'
import { useJobPoll } from '@/app/hooks/use-job-poll'
import { uploadAudio, submitAudioJob } from '@/app/http/audio'
import { getAudioJobStatus } from '@/app/http/jobs'

export default function AudioPage() {
  const [file, setFile] = useState<File | null>(null)
  const [settings, setSettings] = useState<AudioSettings>({ mode: 'custom', operations: [] })
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
    if (!file) return toast.error('Please select an audio file')
    if (!canSubmit) return toast.error('Enable at least one operation')
    setJobId(null)
    setSubmitting(true)
    try {
      const uploadRes = await uploadAudio(file)
      const audioId = uploadRes.data.id

      const input =
        settings.mode === 'preset'
          ? { audioId, preset: settings.preset }
          : { audioId, operations: settings.operations }

      const res = await submitAudioJob(input)
      setJobId(res.id)
    } catch {
      toast.error('Failed to submit job. Check your file and try again.')
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
      description="Process an audio file using a preset or custom operations. Upload a .mp3 or .wav file."
      inputPanel={
        <AudioFileInput
          file={file}
          onChange={setFile}
        />
      }
      settingsPanel={<AudioSettingsPanel value={settings} onChange={setSettings} />}
      historyPanel={
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted mb-4">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <p className="font-medium text-foreground">Your processed audio will appear here</p>
          <p className="text-sm text-muted mt-1">Submit a job to see your history</p>
        </div>
      }
      outputPanel={
        <MetricsPanel
          status={job?.status}
          metrics={job?.result?.metrics}
          outputUrl={job?.result?.outputUrl}
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
          {submitting ? 'Uploading…' : isPolling ? 'Processing…' : 'Process audio'}
        </Button>
      }
    />
  )
}
