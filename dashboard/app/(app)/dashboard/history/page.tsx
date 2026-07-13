'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Download, FileClock, Loader2 } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Chip } from '@/app/components/ui/chip'
import { DataTable, type Column } from '@/app/components/ui/data-table'
import { EmptyState } from '@/app/components/ui/empty-state'
import { PageHeader } from '@/app/components/ui/page-header'
import { Separator } from '@/app/components/ui/separator'
import { Skeleton } from '@/app/components/ui/skeleton'
import { Surface } from '@/app/components/ui/surface'
import { formatBytes, triggerDownload } from '@/app/lib/utils'
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

const STATUS_VARIANTS: Record<JobStatus, 'brand' | 'warning' | 'destructive' | 'default'> = {
  completed: 'brand',
  processing: 'warning',
  pending: 'warning',
  created: 'default',
  failed: 'destructive',
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

  const columns: Column<JobListItem>[] = [
    {
      key: 'type',
      header: 'Type',
      className: 'font-medium capitalize text-foreground',
      cell: (job) => job.name ?? job.type,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (job) => (
        <Chip variant={STATUS_VARIANTS[job.status]} size="sm" className="capitalize">
          {job.status}
        </Chip>
      ),
    },
    {
      key: 'compression',
      header: 'Compression',
      className: 'whitespace-nowrap font-mono text-xs text-muted-foreground',
      cell: (job) => {
        const metrics = job.metrics as JobMetrics | undefined
        if (!metrics) return null
        return `${formatBytes(metrics.inputSize)} → ${formatBytes(metrics.outputSize)} (${metrics.compressionRatio}×)`
      },
    },
    {
      key: 'date',
      header: 'Date',
      className: 'whitespace-nowrap text-sm text-muted-foreground',
      cell: (job) =>
        new Date(job.createdAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (job) => (job.status === 'completed' ? <DownloadButton job={job} /> : null),
    },
  ]

  return (
    <div className="pt-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader title="History" description="Every compression job on your account." />

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <FilterGroup options={TYPE_FILTERS} active={type} onChange={setType} />
          <Separator orientation="vertical" className="h-5" />
          <FilterGroup options={STATUS_FILTERS} active={status} onChange={setStatus} />
        </div>

        {loading ? (
          <Surface padding="sm" className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </Surface>
        ) : (
          <div className="space-y-4">
            {/* The page paginates by cursor ("Load more"), so the table must
                render every row it has been given. */}
            <DataTable
              columns={columns}
              rows={items}
              rowKey={(job) => job.id}
              paginate={false}
              empty={
                <EmptyState
                  icon={FileClock}
                  title="No jobs match these filters."
                  description="Process something to see it show up here."
                  action={
                    <div className="flex items-center gap-2">
                      <Button asChild variant="secondary" size="sm">
                        <Link href="/dashboard/text">Compress text</Link>
                      </Button>
                      <Button asChild variant="secondary" size="sm">
                        <Link href="/dashboard/audio">Compress audio</Link>
                      </Button>
                    </div>
                  }
                />
              }
            />

            {cursor && (
              <div className="flex justify-center">
                <Button variant="ghost" size="sm" onClick={() => load(false)} disabled={loadingMore}>
                  {loadingMore && <Loader2 className="animate-spin" />}
                  {loadingMore ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            )}
          </div>
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
  // Filter state is not the page's primary action — `default` would paint two
  // olive buttons on screen and leave the page with no real primary.
  return (
    <div className="flex items-center gap-1">
      {options.map((opt) => (
        <Button
          key={opt.label}
          size="sm"
          variant={active === opt.value ? 'secondary' : 'ghost'}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  )
}

function DownloadButton({ job }: { job: JobListItem }) {
  const [downloading, setDownloading] = useState(false)

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
    <Button variant="ghost" size="sm" onClick={download} disabled={downloading}>
      {downloading ? <Loader2 className="animate-spin" /> : <Download />}
      Download
    </Button>
  )
}
