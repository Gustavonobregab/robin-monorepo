'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Download, Loader2 } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/app/components/ui/table'
import { Skeleton } from '@/app/components/ui/skeleton'
import { cn, formatBytes, triggerDownload } from '@/app/lib/utils'
import { listJobs, getJobStatus } from '@/app/http/jobs'
import { toastApiError } from '@/app/http/errors'
import type { JobListItem, JobMetrics, JobPipeline, JobStatus } from '@/types'

const TYPE_FILTERS: { label: string; value?: JobPipeline }[] = [
  { label: 'All' },
  { label: 'Text', value: 'text' },
  { label: 'Audio', value: 'audio' },
  { label: 'Image', value: 'image' },
]

const STATUS_FILTERS: { label: string; value?: JobStatus }[] = [
  { label: 'All' },
  { label: 'Completed', value: 'completed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Failed', value: 'failed' },
]

const STATUS_STYLES: Record<JobStatus, string> = {
  completed: 'bg-accent-light text-foreground',
  processing: 'bg-warning-light text-warning',
  pending: 'bg-warning-light text-warning',
  created: 'bg-background-section text-muted',
  failed: 'bg-danger-light text-danger',
}

export default function HistoryPage() {
  const [type, setType] = useState<JobPipeline | undefined>()
  const [status, setStatus] = useState<JobStatus | undefined>()
  const [items, setItems] = useState<JobListItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const requestIdRef = useRef(0)

  const load = useCallback(
    async (reset: boolean) => {
      const requestId = ++requestIdRef.current
      if (reset) setLoading(true)
      else setLoadingMore(true)
      try {
        const res = await listJobs({
          type,
          status,
          limit: 20,
          cursor: reset ? undefined : cursor ?? undefined,
        })
        if (requestId !== requestIdRef.current) return
        setItems((prev) => (reset ? res.items : [...prev, ...res.items]))
        setCursor(res.nextCursor)
      } catch (err) {
        await toastApiError(err, 'Could not load jobs')
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [type, status, cursor],
  )

  // Reload from scratch whenever a filter changes
  useEffect(() => {
    load(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status])

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="space-y-5 max-w-4xl mx-auto">
        <div>
          <h2 className="text-lg font-semibold">History</h2>
          <p className="text-sm text-muted mt-0.5">Every compression job on your account.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterGroup options={TYPE_FILTERS} active={type} onChange={setType} />
          <span className="h-4 w-px bg-border" />
          <FilterGroup options={STATUS_FILTERS} active={status} onChange={setStatus} />
        </div>

        {loading ? (
          <div className="bg-background rounded-xl border border-border shadow-sm p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-background rounded-xl border border-border shadow-sm p-8 text-center">
            <p className="text-muted text-sm">No jobs match these filters.</p>
            <p className="text-muted text-xs mt-1">
              Process some{' '}
              <Link href="/dashboard/text" className="underline text-foreground">text</Link> or{' '}
              <Link href="/dashboard/audio" className="underline text-foreground">audio</Link>.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Compression</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((job) => (
                      <JobRow key={job.id} job={job} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {cursor && (
              <div className="flex justify-center">
                <button
                  onClick={() => load(false)}
                  disabled={loadingMore}
                  className="text-sm text-muted hover:text-foreground transition-colors px-4 py-2"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function FilterGroup<T extends string>({
  options,
  active,
  onChange,
}: {
  options: { label: string; value?: T }[]
  active: T | undefined
  onChange: (value: T | undefined) => void
}) {
  return (
    <div className="flex items-center gap-1">
      {options.map((opt) => {
        const isActive = active === opt.value
        return (
          <button
            key={opt.label}
            onClick={() => onChange(opt.value)}
            className={cn(
              'text-xs font-medium px-3 py-1.5 rounded-full transition-colors',
              isActive ? 'bg-accent-strong text-foreground' : 'text-muted hover:bg-background-section',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function JobRow({ job }: { job: JobListItem }) {
  const [downloading, setDownloading] = useState(false)
  const metrics = job.metrics as JobMetrics | undefined

  async function download() {
    setDownloading(true)
    try {
      const detail = await getJobStatus(job.id)
      if (detail.result?.outputUrl) {
        triggerDownload(detail.result.outputUrl)
      } else if (detail.result?.outputText) {
        const blob = new Blob([detail.result.outputText], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        triggerDownload(url, 'output.txt')
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      } else {
        toast.error('No output available for this job')
      }
    } catch (err) {
      await toastApiError(err, 'Could not fetch the result')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium capitalize">{job.name ?? job.type}</TableCell>
      <TableCell>
        <span className={cn('inline-block text-xs font-medium px-2 py-0.5 rounded-full capitalize', STATUS_STYLES[job.status])}>
          {job.status}
        </span>
      </TableCell>
      <TableCell className="text-muted text-sm whitespace-nowrap">
        {metrics
          ? `${formatBytes(metrics.inputSize)} → ${formatBytes(metrics.outputSize)} (${metrics.compressionRatio}×)`
          : null}
      </TableCell>
      <TableCell className="text-muted text-sm whitespace-nowrap">
        {new Date(job.createdAt).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })}
      </TableCell>
      <TableCell className="text-right">
        {job.status === 'completed' && (
          <button
            onClick={download}
            disabled={downloading}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
          >
            {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            Download
          </button>
        )}
      </TableCell>
    </TableRow>
  )
}
