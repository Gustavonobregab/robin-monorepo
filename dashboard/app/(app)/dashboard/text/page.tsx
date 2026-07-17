'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import {
  ArrowUp,
  Copy,
  Download,
  FileText,
  Loader2,
  MoreHorizontal,
  Paperclip,
  X,
} from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { PageHeader } from '@/app/components/ui/PageHeader'
import { PresetPicker } from '@/app/components/ui/PresetPicker'
import { Slider } from '@/app/components/ui/Slider'
import { Switch } from '@/app/components/ui/Switch'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { RetryCard } from '@/app/components/ui/RetryCard'
import { StatusBadge } from '@/app/components/ui/StatusBadge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/DropdownMenu'
import { useJobPoll } from '@/app/hooks/use-job-poll'
import { getTextPresets, submitTextJob } from '@/app/http/text'
import { uploadFile } from '@/app/http/upload'
import { getJobStatus, listJobs } from '@/app/http/jobs'
import { toastApiError, toastSubmitError } from '@/app/http/errors'
import {
  cn,
  downloadTextAsFile,
  formatBytes,
  formatSaved,
  randomKey,
  savedPercent,
  timeAgo,
  triggerDownload,
} from '@/app/lib/utils'
import type { JobListItem, JobMetrics, JobView, SubmitTextJobInput, TextOperationInput, TextPreset } from '@/types'


function SizeDelta({ metrics, className }: { metrics: JobMetrics; className?: string }) {
  const saved = savedPercent(metrics.inputSize, metrics.outputSize)
  return (
    <span className={cn('text-[13px] text-muted-foreground', className)}>
      {formatBytes(metrics.inputSize)} to {formatBytes(metrics.outputSize)}
      {saved !== null && `, ${formatSaved(saved)}`}
    </span>
  )
}

export default function TextPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preset, setPreset] = useState<string | null>(null)
  const [intensity, setIntensity] = useState(50)
  const [jsonToToon, setJsonToToon] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [instantResult, setInstantResult] = useState<JobView['result'] | null>(null)

  const { job, isPolling, isFailed, timedOut } = useJobPoll({ jobId, fetcher: getJobStatus })

  const { data: presetsData } = useSWR('text/presets', () => getTextPresets())
  const presets = presetsData?.data ?? []

  const {
    data: jobList,
    error: jobsError,
    isLoading: jobsLoading,
    mutate: mutateJobs,
  } = useSWR('jobs/text', () => listJobs({ type: 'text', limit: 10 }))

  useEffect(() => {
    if (job?.status === 'completed') void mutateJobs()
  }, [job?.status, mutateJobs])

  useEffect(() => {
    if (!isFailed) return
    toast.error(job?.error ?? 'Job failed')
    mutateJobs()
  }, [isFailed]) // eslint-disable-line react-hooks/exhaustive-deps

  const output = job?.status === 'completed' ? job.result : instantResult

  const hasInput = file !== null || text.trim().length > 0
  const busy = submitting || isPolling

  async function handleSubmit() {
    if (!hasInput || busy) return

    setJobId(null)
    setInstantResult(null)
    setSubmitting(true)

    try {
      let fileId: string | undefined
      if (file) {
        const upload = await uploadFile(file)
        fileId = upload.id
      }

      const source = fileId ? { fileId } : { text }
      let input: SubmitTextJobInput
      if (preset) {
        input = { ...source, preset: preset as TextPreset }
      } else {
        const operations: TextOperationInput[] = [{ type: 'trim', params: { intensity } }]
        if (jsonToToon) operations.push({ type: 'json-to-toon' })
        input = { ...source, operations }
      }
      const submitted = await submitTextJob(input, randomKey())

      if (submitted.status === 'completed' && submitted.result) {
        setInstantResult(submitted.result)
        mutateJobs()
      } else {
        setJobId(submitted.id)
      }
    } catch (err) {
      await toastSubmitError(err, 'Failed to submit job. Check your input and try again.', () =>
        router.push('/dashboard/billing'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  function copyOutput() {
    if (!output?.outputText) return
    navigator.clipboard.writeText(output.outputText)
    toast.success('Copied to clipboard')
  }

  function downloadOutput() {
    if (output?.outputUrl) {
      triggerDownload(output.outputUrl)
      return
    }
    if (!output?.outputText) return
    downloadTextAsFile(output.outputText, 'output.txt')
  }

  async function downloadJob(item: JobListItem) {
    setDownloadingId(item.id)
    try {
      const detail = await getJobStatus(item.id)
      if (detail.result?.outputUrl) {
        triggerDownload(detail.result.outputUrl)
      } else if (detail.result?.outputText) {
        downloadTextAsFile(detail.result.outputText, 'output.txt')
      }
    } catch (err) {
      await toastApiError(err, 'Failed to download the result. Try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  const recentJobs = jobList?.items ?? []

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Text"
        description="Paste text or upload a .txt file and compress it."
        className="mb-8"
      />

      {/* Composer: outer r24 white card, inner r16 grey well, settings bar below */}
      <div className="rounded-3xl border border-border bg-card p-2">
        {file ? (
          <div className="flex items-center gap-3 rounded-2xl bg-black/[0.02] p-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/[0.04]">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-[13px] text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              title="Remove file"
              onClick={() => setFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your text here"
            className="block min-h-[11rem] w-full resize-none rounded-2xl bg-black/[0.02] px-4 py-3.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground hover:bg-black/[0.04] focus:outline-none"
          />
        )}

        <PresetPicker
          className="px-1 pt-3"
          presets={presets}
          value={preset}
          onChange={setPreset}
          loading={!presetsData}
        >
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-muted-foreground">Cleanup intensity</span>
              <Slider value={intensity} onChange={setIntensity} min={0} max={100} className="w-24" />
              <span className="w-7 text-[13px] font-medium tabular-nums text-foreground">
                {intensity}
              </span>
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <Switch checked={jsonToToon} onCheckedChange={setJsonToToon} />
              <span className="text-[13px] font-medium text-muted-foreground">JSON to TOON</span>
            </label>
          </div>
        </PresetPicker>

        <div className="flex items-center gap-1 px-1 pb-1 pt-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0]
              if (selected) setFile(selected)
              e.target.value = ''
            }}
          />
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
            Upload .txt
          </Button>


          <div className="ml-auto flex items-center gap-3">
            {!file && (
              <span className="text-[13px] text-muted-foreground">
                {text.length.toLocaleString()} characters
              </span>
            )}
            <Button
              title="Compress"
              size="orb"
              disabled={!hasInput || busy}
              onClick={handleSubmit}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {isPolling && (
        <Card className="mt-6 flex items-center justify-between p-4">
          <StatusBadge status={job?.status ?? 'pending'} />
          <span className="text-[13px] text-muted-foreground">Large inputs can take a minute.</span>
        </Card>
      )}

      {timedOut && (
        <Card className="mt-6 p-4">
          <p className="text-sm text-muted-foreground">
            Still processing in the background. The result will show up in your recent jobs.
          </p>
        </Card>
      )}

      {output && (
        <Card className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-sm font-medium text-foreground">Output</span>
              {output.metrics && <SizeDelta metrics={output.metrics} className="truncate" />}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {output.outputText && (
                <Button variant="ghost" size="sm" onClick={copyOutput}>
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={downloadOutput}>
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>

          {output.outputText ? (
            <div className="max-h-[24rem] overflow-y-auto whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-foreground">
              {output.outputText}
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-muted-foreground">
              File processed. Download to get the result.
            </p>
          )}
        </Card>
      )}

      {/* Recent jobs */}
      <div className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-foreground">Recent</h2>

        {jobsLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : jobsError ? (
          <RetryCard message="Couldn't load your recent jobs." onRetry={() => mutateJobs()} />
        ) : recentJobs.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-5 w-5" />}
            title="Nothing compressed yet"
            hint="Your compressed text will show up here."
          />
        ) : (
          <div className="space-y-1">
            {recentJobs.map((item) => (
              <div
                key={item.id}
                className="group flex items-center gap-4 rounded-2xl p-2 transition-colors hover:bg-black/[0.04]"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/[0.04]">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.name ?? 'Text'}
                  </p>
                  {item.metrics && <SizeDelta metrics={item.metrics} className="mt-0.5 block" />}
                </div>
                <StatusBadge status={item.status} />
                <span className="w-16 text-right text-[13px] text-muted-foreground">
                  {timeAgo(item.createdAt)}
                </span>
                {item.status === 'completed' ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" title="Actions">
                        {downloadingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => downloadJob(item)}>
                        <Download className="h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="h-8 w-8 shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
