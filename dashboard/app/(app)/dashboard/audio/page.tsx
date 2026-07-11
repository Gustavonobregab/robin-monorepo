'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { ToolLayout } from '@/app/components/tools/ToolLayout'
import { AudioWorkspace } from '@/app/components/tools/AudioWorkspace'
import { AudioSettingsPanel, type AudioSettings } from '@/app/components/tools/AudioSettingsPanel'
import { ToolHistoryPanel } from '@/app/components/tools/ToolHistoryPanel'
import { useJobPoll } from '@/app/hooks/use-job-poll'
import { submitAudioJob } from '@/app/http/audio'
import { uploadFile } from '@/app/http/upload'
import { getJobStatus } from '@/app/http/jobs'
import { parseApiError, toastApiError, ERROR_MESSAGES } from '@/app/http/errors'
import { randomKey } from '@/app/lib/utils'

export default function AudioPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [settings, setSettings] = useState<AudioSettings>({ mode: 'custom', operations: [] })
  const [jobId, setJobId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { job, isPolling, isFailed, timedOut } = useJobPoll({
    jobId,
    fetcher: getJobStatus,
  })

  const canSubmit =
    settings.mode === 'preset' ||
    (settings.mode === 'custom' && settings.operations.length > 0)

  const isProcessing = submitting || isPolling

  async function handleSubmit() {
    if (!file) return toast.error('Please select an audio file')
    if (!canSubmit) return toast.error('Enable at least one operation')

    setJobId(null)
    setSubmitting(true)
    try {
      const { id: audioId } = await uploadFile(file)

      const input =
        settings.mode === 'preset'
          ? { audioId, preset: settings.preset }
          : { audioId, operations: settings.operations }

      const res = await submitAudioJob(input, randomKey())
      setJobId(res.id)
    } catch (err) {
      const { code } = await parseApiError(err)
      if (code === 'INSUFFICIENT_CREDITS') {
        toast.error(ERROR_MESSAGES.INSUFFICIENT_CREDITS, {
          action: { label: 'View plan', onClick: () => router.push('/dashboard/billing') },
        })
      } else {
        await toastApiError(err, 'Failed to submit job. Check your file and try again.')
      }
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
      mainPanel={
        <AudioWorkspace
          file={file}
          onFileChange={setFile}
          status={job?.status}
          metrics={job?.result?.metrics}
          outputUrl={job?.result?.outputUrl}
          error={job?.error}
          isProcessing={isProcessing}
          timedOut={timedOut}
        />
      }
      settingsPanel={<AudioSettingsPanel value={settings} onChange={setSettings} />}
      historyPanel={
        <ToolHistoryPanel
          pipelineType="audio"
          emptyIcon={
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted mb-4">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          }
          emptyLabel="Your processed audio will appear here"
        />
      }
      action={
        <Button
          onClick={handleSubmit}
          disabled={submitting || isPolling || !canSubmit}
          className="rounded-full bg-accent-strong text-foreground hover:bg-accent-light"
        >
          {submitting ? 'Uploading...' : isPolling ? 'Processing...' : 'Process audio'}
        </Button>
      }
    />
  )
}
