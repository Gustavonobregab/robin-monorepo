'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import { ImageIcon, Upload } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Label } from '@/app/components/ui/label'
import { PageHeader } from '@/app/components/ui/page-header'
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group'
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
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Image compression"
        description="Shrink JPEG, PNG and WebP files with a preset."
        className="mb-0"
      />

      <div className="min-h-0 flex-1">
        <ToolLayout
          title="Image compression"
          mainPanel={
            <div className="space-y-4">
              <Label
                htmlFor="image-file"
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted p-10 text-center font-normal transition-colors hover:border-brand"
              >
                <input
                  id="image-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <Upload className="size-5 text-muted-foreground" />
                {file ? (
                  <span className="text-sm text-foreground">
                    {file.name} <span className="font-mono text-muted-foreground">{formatBytes(file.size)}</span>
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Drop or select a JPEG, PNG or WebP</span>
                )}
              </Label>

              {(isPolling || submitting) && <Skeleton className="h-40 rounded-xl" />}

              {result?.result && (
                <div className="space-y-3 rounded-xl bg-muted p-4">
                  {result.result.outputUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={result.result.outputUrl}
                      alt="Compressed result"
                      className="mx-auto max-h-72 rounded-lg"
                    />
                  )}
                  {metrics && (
                    <p className="text-center text-sm text-muted-foreground">
                      <span className="font-mono">{formatBytes(metrics.inputSize)}</span> →{' '}
                      <span className="font-mono text-foreground">{formatBytes(metrics.outputSize)}</span>{' '}
                      <span className="font-mono">({metrics.compressionRatio}×)</span>
                    </p>
                  )}
                  {result.result.outputUrl && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => triggerDownload(result.result!.outputUrl!)}
                    >
                      Download
                    </Button>
                  )}
                </div>
              )}

              {timedOut && (
                <p className="text-sm text-destructive">Timed out waiting for the job. Check the jobs page.</p>
              )}
            </div>
          }
          settingsPanel={
            presets.length === 0 ? (
              <div className="grid gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : (
              <RadioGroup value={preset} onValueChange={setPreset}>
                {presets.map((p) => (
                  <Label
                    key={p.id}
                    htmlFor={`image-preset-${p.id}`}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-xl border p-3 font-normal transition-colors',
                      preset === p.id ? 'border-brand bg-brand-subtle' : 'border-border hover:bg-muted',
                    )}
                  >
                    <RadioGroupItem id={`image-preset-${p.id}`} value={p.id} className="mt-0.5" />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium text-foreground">{p.name}</span>
                      <span className="block text-xs text-muted-foreground">{p.description}</span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            )
          }
          historyPanel={
            <ToolHistoryPanel
              pipelineType="image"
              emptyIcon={<ImageIcon className="mb-4 size-10 text-muted-foreground" strokeWidth={1.5} />}
              emptyLabel="Your compressed images will appear here"
            />
          }
          action={
            <Button onClick={handleSubmit} disabled={submitting || isPolling || !file}>
              {submitting ? 'Uploading…' : isPolling ? 'Processing…' : 'Compress image'}
            </Button>
          }
        />
      </div>
    </div>
  )
}
