'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Download,
  FileClock,
  FileText,
  Film,
  ImageIcon,
  Loader2,
  Mic,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { Chip } from '@/app/components/ui/Chip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/DropdownMenu'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { PageHeader } from '@/app/components/ui/PageHeader'
import { SearchInput } from '@/app/components/ui/SearchInput'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { StatusBadge, type JobStatus as BadgeStatus } from '@/app/components/ui/StatusBadge'
import { Tabs } from '@/app/components/ui/Tabs'
import { formatBytes, triggerDownload } from '@/app/lib/utils'
import { listJobs, getJobStatus } from '@/app/http/jobs'
import { toastApiError } from '@/app/http/errors'
import type { JobListItem, JobPipeline, JobStatus } from '@/types'

const MODALITY_TABS = ['All', 'Text', 'Audio', 'Image']

const TAB_TO_TYPE: Record<string, JobPipeline | undefined> = {
  All: undefined,
  Text: 'text',
  Audio: 'audio',
  Image: 'image',
}

const STATUS_CHIPS: { label: string; value: JobStatus }[] = [
  { label: 'Done', value: 'completed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Queued', value: 'pending' },
  { label: 'Failed', value: 'failed' },
]

const BADGE_STATUS: Record<JobStatus, BadgeStatus> = {
  completed: 'done',
  processing: 'processing',
  pending: 'queued',
  created: 'queued',
  failed: 'failed',
}

const KIND_ICON: Record<JobPipeline, LucideIcon> = {
  text: FileText,
  audio: Mic,
  image: ImageIcon,
  video: Film,
}

const KIND_LABEL: Record<JobPipeline, string> = {
  text: 'Text',
  audio: 'Audio',
  image: 'Image',
  video: 'Video',
}

function formatTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function HistoryPage() {
  const [type, setType] = useState<JobPipeline | undefined>()
  const [status, setStatus] = useState<JobStatus | undefined>()
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<JobListItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const requestIdRef = useRef(0)

  const load = useCallback(
    async (reset: boolean) => {
      const requestId = ++requestIdRef.current
      if (reset) {
        setLoading(true)
        setLoadError(false)
      } else {
        setLoadingMore(true)
      }
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
        if (requestId !== requestIdRef.current) return
        if (reset) setLoadError(true)
        else await toastApiError(err, 'Could not load more jobs')
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

  // The list endpoint has no search param, so search narrows the loaded rows
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((job) => (job.name ?? KIND_LABEL[job.type]).toLowerCase().includes(q))
  }, [items, query])

  const filtered = Boolean(type || status || query.trim())

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="History" description="Every compression job on your account." />

      <div className="mt-6">
        <Tabs tabs={MODALITY_TABS} defaultValue="All" onChange={(tab) => setType(TAB_TO_TYPE[tab])} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SearchInput
          placeholder="Search jobs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-xs"
        />
        {STATUS_CHIPS.map((chip) => (
          <Chip
            key={chip.value}
            active={status === chip.value}
            onClick={() => setStatus((cur) => (cur === chip.value ? undefined : chip.value))}
          >
            {chip.label}
          </Chip>
        ))}
      </div>

      <div className="mt-4">
        {loading ? (
          <SkeletonRows />
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">Could not load your jobs.</p>
            <Button variant="secondary" size="sm" onClick={() => load(true)}>
              Try again
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<FileClock className="h-5 w-5" />}
            title={filtered ? 'No jobs match these filters' : 'No jobs yet'}
            hint={
              filtered
                ? 'Try a different tab, status, or search.'
                : 'Compress something to see it show up here.'
            }
            action={
              filtered ? undefined : (
                <div className="flex items-center gap-2">
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/dashboard/text">Compress text</Link>
                  </Button>
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/dashboard/audio">Compress audio</Link>
                  </Button>
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/dashboard/image">Compress image</Link>
                  </Button>
                </div>
              )
            }
          />
        ) : (
          <>
            <div className="space-y-0.5">
              {visible.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </div>

            {cursor && !query.trim() && (
              <div className="mt-4 flex justify-center">
                <Button variant="ghost" size="sm" onClick={() => load(false)} disabled={loadingMore}>
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loadingMore ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function JobRow({ job }: { job: JobListItem }) {
  const [downloading, setDownloading] = useState(false)
  const Icon = KIND_ICON[job.type]
  const metrics = job.metrics

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
    <div className="flex items-center gap-4 rounded-2xl p-2 pr-3 transition-colors hover:bg-black/[0.04]">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/[0.04] text-muted-foreground">
        <Icon className="h-[18px] w-[18px]" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {job.name ?? KIND_LABEL[job.type]}
        </p>
        {metrics && (
          <p className="text-[13px] text-muted-foreground">{formatBytes(metrics.inputSize)}</p>
        )}
      </div>

      <StatusBadge status={BADGE_STATUS[job.status]} className="w-24 shrink-0" />

      <p className="hidden w-32 shrink-0 whitespace-nowrap text-[13px] text-muted-foreground sm:block">
        {metrics && (
          <>
            {formatBytes(metrics.outputSize)} · {metrics.compressionRatio}×
          </>
        )}
      </p>

      <p className="hidden w-32 shrink-0 whitespace-nowrap text-[13px] text-muted-foreground md:block">
        {formatTime(job.createdAt)}
      </p>

      <div className="flex h-8 w-8 shrink-0 items-center justify-center">
        {downloading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : job.status === 'completed' ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Job actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => download()}>
                <Download className="h-4 w-4" />
                Download
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-0.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl p-2 pr-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="hidden h-3 w-24 sm:block" />
          <Skeleton className="hidden h-3 w-28 md:block" />
          <div className="h-8 w-8" />
        </div>
      ))}
    </div>
  )
}
