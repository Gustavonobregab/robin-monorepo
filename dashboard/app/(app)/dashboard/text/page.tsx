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
  const [output, setOutput] = useState<{ text?: string; downloadUrl?: string; metrics: JobMetrics } | null>(null)

  const { job, isPolling, isFailed, timedOut } = useJobPoll({
    jobId,
    fetcher: getTextJobStatus,
  })

  useEffect(() => {
    if (job?.status !== 'completed' || !job.result) return
    const metrics = job.result.metrics as JobMetrics
    if (job.result.outputText) {
      setOutput({ text: job.result.outputText, metrics })
    } else if (job.result.outputUrl) {
      setOutput({ downloadUrl: job.result.outputUrl, metrics })
    }
  }, [job?.status, job?.result?.outputText, job?.result?.outputUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  const canSubmit =
    settings.mode === 'preset' ||
    (settings.mode === 'custom' && settings.operations.length > 0)

  const hasInput = inputMode === 'text' ? text.trim().length > 0 : file !== null

  async function handleSubmit() {
    if (!hasInput) return toast.error(inputMode === 'text' ? 'Please enter some text' : 'Please select a file')
    if (!canSubmit) return toast.error('Enable at least one operation')

    setJobId(null)
    setOutput(null)
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
        setOutput({ text: data.output, metrics: data.metrics as JobMetrics })
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

  const displayStatus = output ? 'completed' : job?.status
  const displayMetrics = output?.metrics ?? (job?.result?.metrics as JobMetrics | undefined)

  function copyOutput() {
    if (!output?.text) return
    navigator.clipboard.writeText(output.text)
    toast.success('Copied to clipboard')
  }

  function downloadOutput() {
    if (output?.downloadUrl) {
      window.open(output.downloadUrl, '_blank')
      return
    }
    if (!output?.text) return
    const blob = new Blob([output.text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'output.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

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
            outputUrl={undefined}
            error={job?.error}
            timedOut={timedOut}
          />
          {output && (
            <div className="mt-4 rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-background-section border-b border-border">
                <span className="text-xs font-medium text-muted">Output</span>
                <div className="flex items-center gap-1">
                  {output.text && (
                    <button
                      type="button"
                      onClick={copyOutput}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-muted hover:text-foreground rounded transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                      Copy
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={downloadOutput}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-muted hover:text-foreground rounded transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" x2="12" y1="15" y2="3" />
                    </svg>
                    Download
                  </button>
                </div>
              </div>
              {output.text ? (
                <pre className="text-sm whitespace-pre-wrap break-words max-h-72 overflow-y-auto p-3">
                  {output.text}
                </pre>
              ) : (
                <div className="flex items-center justify-center py-6 text-sm text-muted">
                  File processed successfully. Click Download to get the result.
                </div>
              )}
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
