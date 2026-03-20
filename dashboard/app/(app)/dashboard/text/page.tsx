'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { ToolLayout } from '@/app/components/tools/ToolLayout'
import { TextInput } from '@/app/components/tools/TextInput'
import { MetricsPanel } from '@/app/components/tools/MetricsPanel'
import { TextSettingsPanel, type TextSettings } from '@/app/components/tools/TextSettingsPanel'
import { useJobPoll } from '@/app/hooks/use-job-poll'
import { submitTextJob, uploadDocument } from '@/app/http/text'
import { getTextJobStatus } from '@/app/http/jobs'
import type { JobMetrics } from '@/types'

export default function TextPage() {
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text')
  const [settings, setSettings] = useState<TextSettings>({ mode: 'custom', operations: [] })
  const [jobId, setJobId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [syncResult, setSyncResult] = useState<{ output: string; metrics: Record<string, unknown> } | null>(null)

  const { job, isPolling, isFailed, timedOut } = useJobPoll({
    jobId,
    fetcher: getTextJobStatus,
  })

  const canSubmit =
    settings.mode === 'preset' ||
    (settings.mode === 'custom' && settings.operations.length > 0)

  const hasInput = inputMode === 'text' ? text.trim().length > 0 : file !== null

  async function handleSubmit() {
    if (!hasInput) return toast.error(inputMode === 'text' ? 'Please enter some text' : 'Please select a file')
    if (!canSubmit) return toast.error('Enable at least one operation')

    setJobId(null)
    setSyncResult(null)
    setSubmitting(true)

    try {
      let fileId: string | undefined

      if (inputMode === 'file' && file) {
        const uploadRes = await uploadDocument(file)
        fileId = uploadRes.data.id
      }

      const base = fileId ? { fileId } : { text }
      const input = settings.mode === 'preset'
        ? { ...base, preset: settings.preset }
        : { ...base, operations: settings.operations }

      const res = await submitTextJob(input as Parameters<typeof submitTextJob>[0])

      const data = res.data as any

      if (data.sync) {
        setSyncResult({ output: data.output, metrics: data.metrics })
      } else {
        setJobId(data.job.id)
      }
    } catch {
      toast.error('Failed to submit job.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (isFailed) toast.error(job?.error ?? 'Job failed')
  }, [isFailed]) // eslint-disable-line react-hooks/exhaustive-deps

  const displayStatus = syncResult ? 'completed' : job?.status

  const displayMetrics = (syncResult?.metrics ?? job?.result?.metrics) as JobMetrics | undefined

  return (
    <ToolLayout
      title="Text compression"
      description="Compress text using a preset or custom operations."
      inputPanel={
        <TextInput
          text={text}
          onTextChange={setText}
          file={file}
          onFileChange={setFile}
          mode={inputMode}
          onModeChange={setInputMode}
        />
      }
      settingsPanel={<TextSettingsPanel value={settings} onChange={setSettings} />}
      historyPanel={
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted mb-4">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p className="font-medium text-foreground">Your compressed text will appear here</p>
          <p className="text-sm text-muted mt-1">Submit a job to see your history</p>
        </div>
      }
      outputPanel={
        <>
          <MetricsPanel
            status={displayStatus}
            metrics={displayMetrics}
            outputUrl={job?.result?.outputUrl}
            error={job?.error}
            timedOut={timedOut}
          />
          {syncResult?.output && (
            <div className="mt-4 p-4 bg-background-section rounded-lg">
              <p className="text-xs font-medium text-muted mb-2">Output</p>
              <pre className="text-sm whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                {syncResult.output}
              </pre>
            </div>
          )}
        </>
      }
      action={
        <Button
          onClick={handleSubmit}
          disabled={submitting || isPolling || !canSubmit || !hasInput}
          className="rounded-full bg-accent-strong text-foreground hover:bg-accent-light"
        >
          {submitting ? 'Processing…' : isPolling ? 'Processing…' : 'Compress'}
        </Button>
      }
    />
  )
}
