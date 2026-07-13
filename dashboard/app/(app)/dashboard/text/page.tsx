'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Copy, Download, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { PageHeader } from '@/app/components/ui/page-header'
import { Surface } from '@/app/components/ui/surface'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { TextInput } from '@/app/components/tools/TextInput'
import { MetricsPanel } from '@/app/components/tools/MetricsPanel'
import { TextSettingsPanel, type TextSettings } from '@/app/components/tools/TextSettingsPanel'
import { ToolHistoryPanel } from '@/app/components/tools/ToolHistoryPanel'
import { useJobPoll } from '@/app/hooks/use-job-poll'
import { submitTextJob } from '@/app/http/text'
import { uploadFile } from '@/app/http/upload'
import { getJobStatus } from '@/app/http/jobs'
import { parseApiError, toastApiError, ERROR_MESSAGES } from '@/app/http/errors'
import { randomKey, triggerDownload } from '@/app/lib/utils'
import type { JobMetrics } from '@/types'

export default function TextPage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text')
  const [settings, setSettings] = useState<TextSettings>({ mode: 'custom', operations: [] })
  const [jobId, setJobId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [output, setOutput] = useState<{ text?: string; downloadUrl?: string; metrics: JobMetrics } | null>(null)

  const { job, isPolling, isFailed, timedOut } = useJobPoll({
    jobId,
    fetcher: getJobStatus,
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
  const busy = submitting || isPolling

  async function handleSubmit() {
    if (!hasInput) return toast.error(inputMode === 'text' ? 'Please enter some text' : 'Please select a file')
    if (!canSubmit) return toast.error('Enable at least one operation')

    setJobId(null)
    setOutput(null)
    setSubmitting(true)

    try {
      let fileId: string | undefined

      if (inputMode === 'file' && file) {
        const upload = await uploadFile(file)
        fileId = upload.id
      }

      const base = fileId ? { fileId } : { text }
      const input = settings.mode === 'preset'
        ? { ...base, preset: settings.preset }
        : { ...base, operations: settings.operations }

      const job = await submitTextJob(input as Parameters<typeof submitTextJob>[0], randomKey())

      if (job.status === 'completed' && job.result) {
        setOutput({
          text: job.result.outputText,
          downloadUrl: job.result.outputUrl,
          metrics: job.result.metrics as JobMetrics,
        })
      } else {
        setJobId(job.id)
      }
    } catch (err) {
      const { code } = await parseApiError(err)
      if (code === 'INSUFFICIENT_CREDITS') {
        toast.error(ERROR_MESSAGES.INSUFFICIENT_CREDITS, {
          action: { label: 'View plan', onClick: () => router.push('/dashboard/billing') },
        })
      } else {
        await toastApiError(err, 'Failed to submit job. Check your input and try again.')
      }
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
      triggerDownload(output.downloadUrl)
      return
    }
    if (!output?.text) return
    const blob = new Blob([output.text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    triggerDownload(url, 'output.txt')
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  return (
    <div className="mx-auto max-w-6xl pt-8">
      <PageHeader
        title="Text"
        description="Compress text using a preset or custom operations."
        actions={
          <Button size="lg" onClick={handleSubmit} disabled={busy || !canSubmit || !hasInput}>
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {busy ? 'Processing' : 'Compress'}
          </Button>
        }
      />

      {/* Parameters left, result right. No fixed 480px rail — the result is the
          point of the page, so it gets the room. */}
      <div className="grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
        <Tabs defaultValue="settings" className="lg:sticky lg:top-6">
          <TabsList className="w-full">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <Surface padding="none" className="divide-y divide-border overflow-hidden">
              <div className="p-5">
                <TextInput
                  text={text}
                  onTextChange={setText}
                  file={file}
                  onFileChange={setFile}
                  mode={inputMode}
                  onModeChange={setInputMode}
                />
              </div>
              <div className="p-5">
                <TextSettingsPanel value={settings} onChange={setSettings} />
              </div>
            </Surface>
          </TabsContent>

          <TabsContent value="history">
            <Surface>
              <ToolHistoryPanel
                pipelineType="text"
                emptyIcon={null}
                emptyLabel="Your compressed text will appear here"
              />
            </Surface>
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <MetricsPanel
            status={displayStatus}
            metrics={displayMetrics}
            outputUrl={undefined}
            error={job?.error}
            timedOut={timedOut}
          />

          {output && (
            <Surface padding="none" className="overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                <span className="text-sm font-medium text-foreground">Output</span>
                <div className="flex items-center gap-1">
                  {output.text && (
                    <Button variant="ghost" size="sm" onClick={copyOutput}>
                      <Copy />
                      Copy
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={downloadOutput}>
                    <Download />
                    Download
                  </Button>
                </div>
              </div>

              {output.text ? (
                <pre className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap break-words p-4 font-mono text-[0.8125rem] leading-relaxed text-foreground">
                  {output.text}
                </pre>
              ) : (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  File processed successfully. Click Download to get the result.
                </p>
              )}
            </Surface>
          )}
        </div>
      </div>
    </div>
  )
}
