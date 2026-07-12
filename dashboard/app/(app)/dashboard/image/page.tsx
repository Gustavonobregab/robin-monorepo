'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import { ToolLayout } from '@/app/components/tools/ToolLayout'
import { ToolHistoryPanel } from '@/app/components/tools/ToolHistoryPanel'
import { useJobPoll } from '@/app/hooks/use-job-poll'
import { uploadFile } from '@/app/http/upload'
import { submitImageJob, getImagePresets } from '@/app/http/image'
import { getJobStatus } from '@/app/http/jobs'
import { parseApiError, toastApiError, ERROR_MESSAGES } from '@/app/http/errors'
import { cn, formatBytes, randomKey, triggerDownload } from '@/app/lib/utils'
import type { JobMetrics, JobView } from '@/types'

export default function ImagePage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preset, setPreset] = useState('medium')
  const [jobId, setJobId] = useState<string | null>(null)
  const [result, setResult] = useState<JobView | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { data: presetsData } = useSWR('image-presets', getImagePresets)
  const presets = presetsData?.data ?? []

  const { job, isPolling, isFailed, timedOut } = useJobPoll({ jobId, fetcher: getJobStatus })

  useEffect(() => {
    if (job?.status === 'completed') setResult(job)
  }, [job])

  useEffect(() => {
    if (isFailed) toast.error(job?.error ?? 'Job failed')
  }, [isFailed]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit() {
    if (!file) return toast.error('Please select an image')

    setJobId(null)
    setResult(null)
    setSubmitting(true)
    try {
      const { id: imageId } = await uploadFile(file)
      const submitted = await submitImageJob({ imageId, preset }, randomKey())

      if (submitted.status === 'completed') setResult(submitted)
      else setJobId(submitted.id)
    } catch (err) {
      const { code } = await parseApiError(err)
      if (code === 'INSUFFICIENT_CREDITS') {
        toast.error(ERROR_MESSAGES.INSUFFICIENT_CREDITS, {
          action: { label: 'View plan', onClick: () => router.push('/dashboard/billing') },
        })
      } else {
        await toastApiError(err, 'Failed to compress the image. Check the file and try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const metrics = result?.result?.metrics as JobMetrics | undefined

  return (
    <ToolLayout
      title="Image compression"
      mainPanel={
        <div className="space-y-4">
          <label className="block cursor-pointer rounded-xl border border-dashed border-border bg-background p-10 text-center hover:border-accent-strong transition-colors">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <span className="text-sm">{file.name} · {formatBytes(file.size)}</span>
            ) : (
              <span className="text-sm text-muted">Drop or select a JPEG, PNG or WebP</span>
            )}
          </label>

          {(isPolling || submitting) && <Skeleton className="h-40 rounded-xl" />}

          {result?.result && (
            <div className="rounded-xl border border-border bg-background p-4 space-y-3">
              {result.result.outputUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result.result.outputUrl} alt="Compressed result" className="max-h-72 rounded-lg mx-auto" />
              )}
              {metrics && (
                <p className="text-sm text-muted text-center">
                  {formatBytes(metrics.inputSize)} → {formatBytes(metrics.outputSize)} ({metrics.compressionRatio}×)
                </p>
              )}
              {result.result.outputUrl && (
                <Button
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={() => triggerDownload(result.result!.outputUrl!)}
                >
                  Download
                </Button>
              )}
            </div>
          )}

          {timedOut && <p className="text-sm text-danger">Timed out waiting for the job. Check the jobs page.</p>}
        </div>
      }
      settingsPanel={
        <div className="grid gap-2">
          {presets.length === 0
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)
            : presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className={cn(
                    'text-left px-3 py-2 rounded-xl border text-sm transition-colors',
                    preset === p.id ? 'border-accent-strong bg-accent-light' : 'border-border hover:border-accent-light',
                  )}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted ml-2">{p.description}</span>
                </button>
              ))}
        </div>
      }
      historyPanel={
        <ToolHistoryPanel
          pipelineType="image"
          emptyIcon={
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted mb-4">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          }
          emptyLabel="Your compressed images will appear here"
        />
      }
      action={
        <Button
          onClick={handleSubmit}
          disabled={submitting || isPolling || !file}
          className="rounded-full bg-accent-strong text-foreground hover:bg-accent-light"
        >
          {submitting ? 'Uploading…' : isPolling ? 'Processing…' : 'Compress image'}
        </Button>
      }
    />
  )
}
