'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import { ArrowUp, Download, ImageIcon, Loader2, Maximize2, MoreHorizontal, X } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/app/components/ui/DropdownMenu'
import { Dropzone } from '@/app/components/ui/Dropzone'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { PageHeader } from '@/app/components/ui/PageHeader'
import { RetryCard } from '@/app/components/ui/RetryCard'
import { SearchInput } from '@/app/components/ui/SearchInput'
import { SegmentedControl } from '@/app/components/ui/SegmentedControl'
import { InlineSelect } from '@/app/components/ui/Select'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { Slider } from '@/app/components/ui/Slider'
import { StatusBadge } from '@/app/components/ui/StatusBadge'
import { useJobPoll } from '@/app/hooks/use-job-poll'
import { uploadFile } from '@/app/http/upload'
import { submitImageJob } from '@/app/http/image'
import { getJobStatus, listJobs } from '@/app/http/jobs'
import { toastApiError, toastSubmitError } from '@/app/http/errors'
import { formatBytes, randomKey, timeAgo, triggerDownload } from '@/app/lib/utils'
import type { ImageOperationInput, ImageOutputFormat, JobView } from '@/types'

const FORMAT_OPTIONS: { value: ImageOutputFormat; label: string }[] = [
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
]

const DIMENSION_OPTIONS = [
  { value: 'original', label: 'Original size' },
  { value: '2560', label: 'Max 2560px' },
  { value: '2048', label: 'Max 2048px' },
  { value: '1280', label: 'Max 1280px' },
  { value: '512', label: 'Max 512px' },
]

export default function ImagePage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<ImageOutputFormat>('webp')
  const [quality, setQuality] = useState(80)
  const [maxDimension, setMaxDimension] = useState('original')
  const [jobId, setJobId] = useState<string | null>(null)
  const [instantResult, setInstantResult] = useState<JobView | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const {
    data: jobsData,
    error: jobsError,
    isLoading: jobsLoading,
    mutate: mutateJobs,
  } = useSWR('jobs/image', () => listJobs({ type: 'image', limit: 20 }))
  const jobs = jobsData?.items ?? []

  const { job, isPolling, isFailed, timedOut } = useJobPoll({ jobId, fetcher: getJobStatus })

  useEffect(() => {
    if (job?.status === 'completed') void mutateJobs()
  }, [job?.status, mutateJobs])

  useEffect(() => {
    if (isFailed) {
      toast.error(job?.error ?? 'Job failed')
      void mutateJobs()
    }
  }, [isFailed]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(
    () => jobs.filter((j) => (j.name ?? '').toLowerCase().includes(search.toLowerCase())),
    [jobs, search],
  )

  async function handleSubmit() {
    if (!file) return

    setJobId(null)
    setInstantResult(null)
    setSubmitting(true)
    try {
      const { id: imageId } = await uploadFile(file)

      const operations: ImageOperationInput[] = []
      if (maxDimension !== 'original') {
        const size = Number(maxDimension)
        operations.push({ type: 'resize', params: { width: size, height: size, fit: 'inside' } })
      }
      operations.push({ type: 'encode', params: { format, quality } })

      const submitted = await submitImageJob({ imageId, operations }, randomKey())

      if (submitted.status === 'completed') setInstantResult(submitted)
      else setJobId(submitted.id)
      void mutateJobs()
    } catch (err) {
      await toastSubmitError(err, 'Failed to compress the image. Check the file and try again.', () =>
        router.push('/dashboard/billing'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDownload(id: string) {
    setDownloadingId(id)
    try {
      const status = await getJobStatus(id)
      const url = status.result?.outputUrl
      if (url) triggerDownload(url)
      else toast.error('The compressed file is no longer available.')
    } catch (err) {
      await toastApiError(err, 'Could not download the result. Try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  const result = job?.status === 'completed' ? job : instantResult
  const resultMetrics = result?.result?.metrics
  const outputUrl = result?.result?.outputUrl
  const busy = submitting || isPolling

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <PageHeader
        title="Image"
        description="Compress JPEG, PNG and WebP images into smaller files."
      />

      <Dropzone
        onFiles={(files) => {
          setFile(files[0] ?? null)
          setJobId(null)
          setInstantResult(null)
        }}
        accept="image/jpeg,image/png,image/webp"
        label="Drop an image here, or click to browse"
        hint="JPEG, PNG or WebP"
      >
        {file && (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-2xl bg-black/[0.02] px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm text-foreground">{file.name}</span>
              <span className="shrink-0 text-[13px] text-muted-foreground">
                {formatBytes(file.size)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Remove file"
              onClick={() => {
                setFile(null)
                setJobId(null)
                setInstantResult(null)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2 px-1 pb-1">
          <SegmentedControl options={FORMAT_OPTIONS} value={format} onChange={setFormat} />

          <div className="flex items-center gap-2 px-2">
            <span className="text-[13px] font-medium text-muted-foreground">Quality</span>
            <Slider value={quality} onChange={setQuality} min={1} max={100} className="w-24" />
            <span className="w-7 text-[13px] font-medium tabular-nums text-foreground">
              {quality}
            </span>
          </div>

          <InlineSelect
            value={maxDimension}
            onValueChange={setMaxDimension}
            options={DIMENSION_OPTIONS}
            icon={<Maximize2 className="h-4 w-4 text-muted-foreground" />}
          />

          <div className="ml-auto">
            <Button
              size="orb"
              aria-label="Compress image"
              disabled={!file || busy}
              onClick={() => void handleSubmit()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {resultMetrics && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-black/[0.02] px-3 py-2.5">
            <span className="text-[13px] text-muted-foreground">
              {formatBytes(resultMetrics.inputSize)} to{' '}
              <span className="font-medium text-foreground">
                {formatBytes(resultMetrics.outputSize)}
              </span>
              , {resultMetrics.compressionRatio}x smaller
            </span>
            {outputUrl && (
              <Button variant="secondary" size="sm" onClick={() => triggerDownload(outputUrl)}>
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
            )}
          </div>
        )}

        {timedOut && (
          <p className="px-2 pb-1 pt-2 text-[13px] text-destructive">
            Timed out waiting for the job. Check the history page.
          </p>
        )}
      </Dropzone>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-foreground">Recent jobs</h2>
          {jobs.length > 0 && (
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="h-9 w-52"
            />
          )}
        </div>

        {jobsLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-2xl" />
            ))}
          </div>
        ) : jobsError ? (
          <RetryCard
            message="Something went wrong loading your recent jobs."
            onRetry={() => void mutateJobs()}
          />
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={<ImageIcon className="h-5 w-5" />}
            title="No image jobs yet"
            hint="Compress an image above and it will show up here."
          />
        ) : (
          <div className="space-y-1">
            {filtered.map((j) => (
              <div
                key={j.id}
                className="flex items-center gap-4 rounded-2xl px-3 py-2 transition-colors hover:bg-black/[0.04]"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {j.name && (
                    <span className="truncate text-sm font-medium text-foreground">{j.name}</span>
                  )}
                  {j.metrics && (
                    <span className="shrink-0 text-[13px] text-muted-foreground">
                      {formatBytes(j.metrics.inputSize)}
                    </span>
                  )}
                </div>

                <StatusBadge status={j.status} className="shrink-0" />

                {j.metrics && (
                  <span className="hidden shrink-0 text-[13px] text-muted-foreground sm:inline">
                    to <span className="text-foreground">{formatBytes(j.metrics.outputSize)}</span>
                    , {j.metrics.compressionRatio}x
                  </span>
                )}

                <span className="shrink-0 text-[13px] text-muted-foreground">
                  {timeAgo(j.createdAt)}
                </span>

                {j.status === 'completed' ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label="Job actions"
                      >
                        {downloadingId === j.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => void handleDownload(j.id)}>
                        <Download className="h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="h-8 w-8 shrink-0" />
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No jobs match your search.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
