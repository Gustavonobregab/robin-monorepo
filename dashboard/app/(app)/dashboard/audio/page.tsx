'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import {
  ArrowUp,
  AudioLines,
  Download,
  Gauge,
  Loader2,
  MoreHorizontal,
  Speaker,
  X,
} from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { Chip } from '@/app/components/ui/Chip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/DropdownMenu'
import { Dropzone } from '@/app/components/ui/Dropzone'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { PageHeader } from '@/app/components/ui/PageHeader'
import { Progress } from '@/app/components/ui/Progress'
import { SearchInput } from '@/app/components/ui/SearchInput'
import { InlineSelect } from '@/app/components/ui/Select'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { Slider } from '@/app/components/ui/Slider'
import { StatusBadge } from '@/app/components/ui/StatusBadge'
import { useJobPoll } from '@/app/hooks/use-job-poll'
import { getAudioPresets, submitAudioJob } from '@/app/http/audio'
import { ERROR_MESSAGES, parseApiError, toastApiError } from '@/app/http/errors'
import { getJobStatus, listJobs } from '@/app/http/jobs'
import { getPublicPlans } from '@/app/http/plans'
import { uploadFile } from '@/app/http/upload'
import { getProfile } from '@/app/http/users'
import { formatBytes, formatDate, randomKey, triggerDownload } from '@/app/lib/utils'
import type {
  AudioOperationInput,
  AudioPreset,
  JobListItem,
  JobStatus,
  SubmitAudioJobInput,
} from '@/types'

/* Audio tool rebuilt on the voice-isolator recipe: preset chips, r24 composer
   with an InlineSelect settings bar, circular submit, history strip below. */

const ACCEPTED_FORMATS = '.mp3,.wav'

interface EncodeSettings {
  format: 'opus' | 'mp3'
  bitrate: number
  channels: 1 | 2
  speed: number
}

const DEFAULT_SETTINGS: EncodeSettings = { format: 'opus', bitrate: 24, channels: 1, speed: 1 }

/* Composer mirror of the server-side preset params (api AUDIO_PRESETS) — a
   preset submit sends only the id; the server owns the real recipe. */
const PRESET_SETTINGS: Record<string, EncodeSettings | undefined> = {
  chill: { format: 'opus', bitrate: 32, channels: 1, speed: 1 },
  medium: { format: 'opus', bitrate: 24, channels: 1, speed: 1 },
  aggressive: { format: 'opus', bitrate: 12, channels: 1, speed: 1.75 },
  podcast: { format: 'opus', bitrate: 24, channels: 1, speed: 1 },
  lecture: { format: 'opus', bitrate: 16, channels: 1, speed: 1.5 },
}

const FORMAT_OPTIONS = [
  { value: 'opus', label: 'Opus', hint: 'Best quality per bitrate' },
  { value: 'mp3', label: 'MP3', hint: 'Maximum compatibility' },
]

const BITRATE_OPTIONS = [
  { value: '12', label: '12 kbps', hint: 'VoIP grade' },
  { value: '16', label: '16 kbps' },
  { value: '24', label: '24 kbps', hint: 'Voice default' },
  { value: '32', label: '32 kbps', hint: 'Near transparent' },
  { value: '48', label: '48 kbps' },
  { value: '64', label: '64 kbps' },
  { value: '96', label: '96 kbps' },
  { value: '128', label: '128 kbps', hint: 'Highest' },
]

const CHANNEL_OPTIONS = [
  { value: '1', label: 'Mono' },
  { value: '2', label: 'Stereo' },
]

const BADGE_STATUS: Record<JobStatus, 'done' | 'processing' | 'queued' | 'failed'> = {
  created: 'queued',
  pending: 'queued',
  processing: 'processing',
  completed: 'done',
  failed: 'failed',
}

function buildOperations(s: EncodeSettings): AudioOperationInput[] {
  const ops: AudioOperationInput[] = []
  if (s.speed !== 1) ops.push({ type: 'speedup', params: { rate: s.speed } })
  ops.push({
    type: 'encode',
    params: { format: s.format, bitrate: s.bitrate, channels: s.channels },
  })
  return ops
}

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(iso)
}

function savedPercent(item: JobListItem): string | null {
  const m = item.metrics
  if (!m || !m.inputSize || !m.outputSize) return null
  return `−${Math.round((1 - m.outputSize / m.inputSize) * 100)}%`
}

export default function AudioPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preset, setPreset] = useState<AudioPreset | null>('medium')
  const [settings, setSettings] = useState<EncodeSettings>(
    PRESET_SETTINGS.medium ?? DEFAULT_SETTINGS,
  )
  const [jobId, setJobId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const { data: presetsData, error: presetsError } = useSWR('audio/presets', () =>
    getAudioPresets(),
  )
  const { data: profileData } = useSWR('users/me', () => getProfile())
  const { data: plansData } = useSWR('plans/public', () => getPublicPlans())
  const {
    data: jobsData,
    error: jobsError,
    isLoading: jobsLoading,
    mutate: mutateJobs,
  } = useSWR('jobs/audio/recent', () => listJobs({ type: 'audio', limit: 20 }))

  const { job, isPolling, isCompleted, isFailed, timedOut } = useJobPoll({
    jobId,
    fetcher: getJobStatus,
  })

  const presets = presetsData?.data ?? []
  const busy = submitting || isPolling

  const activePresetDef = presets.find((p) => p.id === preset)

  const creditsEstimate = useMemo(() => {
    if (!file) return null
    const slug = profileData?.data.plan?.slug
    if (!slug) return null
    const weight = plansData?.data.find((p) => p.slug === slug)?.creditWeights.audio
    if (!weight) return null
    return weight.credits * Math.max(1, Math.ceil(file.size / weight.perUnitBytes))
  }, [file, profileData, plansData])

  const items = useMemo(() => {
    const raw = jobsData?.items ?? []
    const synced =
      jobId && job
        ? raw.map((it) =>
            it.id === jobId
              ? { ...it, status: job.status, metrics: job.result?.metrics ?? it.metrics }
              : it,
          )
        : raw
    const q = query.trim().toLowerCase()
    if (!q) return synced
    return synced.filter((it) => it.name?.toLowerCase().includes(q))
  }, [jobsData, jobId, job, query])

  function applyPreset(id: string) {
    if (preset === id) {
      setPreset(null)
      return
    }
    setPreset(id as AudioPreset)
    setSettings(PRESET_SETTINGS[id] ?? DEFAULT_SETTINGS)
  }

  function updateSettings(patch: Partial<EncodeSettings>) {
    setPreset(null)
    setSettings((s) => ({ ...s, ...patch }))
  }

  async function handleSubmit() {
    if (!file || busy) return

    setJobId(null)
    setSubmitting(true)
    try {
      const { id: audioId } = await uploadFile(file)

      const input: SubmitAudioJobInput = preset
        ? { audioId, preset }
        : { audioId, operations: buildOperations(settings) }

      const res = await submitAudioJob(input, randomKey())
      setJobId(res.id)
      void mutateJobs()
    } catch (err) {
      const { code } = await parseApiError(err)
      if (code === 'INSUFFICIENT_CREDITS') {
        toast.error(ERROR_MESSAGES.INSUFFICIENT_CREDITS, {
          action: { label: 'View plan', onClick: () => router.push('/dashboard/billing') },
        })
      } else {
        await toastApiError(err, 'Failed to submit job. Check your file and try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDownload(item: JobListItem) {
    setDownloadingId(item.id)
    try {
      const detail = await getJobStatus(item.id)
      const url = detail.result?.outputUrl
      if (!url) {
        toast.error('The output for this job is not available yet.')
        return
      }
      triggerDownload(url, item.name ?? '')
    } catch (err) {
      await toastApiError(err, 'Download failed. Try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  useEffect(() => {
    if (isFailed) toast.error(job?.error ?? 'Job failed')
  }, [isFailed]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isCompleted) return
    setFile(null)
    void mutateJobs()
    const url = job?.result?.outputUrl
    const ratio = job?.result?.metrics?.compressionRatio
    toast.success(
      ratio ? `Audio compressed — ${ratio}× smaller` : 'Audio compressed',
      url ? { action: { label: 'Download', onClick: () => triggerDownload(url) } } : undefined,
    )
  }, [isCompleted]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (timedOut) toast('Still processing — it will show up in the list below when done.')
  }, [timedOut])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Audio"
        description="Shrink audio files with tuned presets or custom encoding."
      />

      {/* Preset chips */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {presetsData
            ? presets.map((p) => (
                <Chip key={p.id} active={preset === p.id} onClick={() => applyPreset(p.id)}>
                  {p.name}
                </Chip>
              ))
            : !presetsError &&
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-24 rounded-lg" />
              ))}
        </div>
        {activePresetDef && (
          <p className="text-[13px] text-muted-foreground">{activePresetDef.description}</p>
        )}
      </div>

      {/* Composer */}
      <Dropzone
        accept={ACCEPTED_FORMATS}
        onFiles={(files) => {
          if (!busy) setFile(files[0] ?? null)
        }}
        label={file ? 'Drop or click to replace' : 'Drop an audio file here, or click to browse'}
        hint={file ? undefined : 'MP3 or WAV'}
      >
        {file && (
          <div className="mt-2 flex items-center gap-3 px-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
              <AudioLines className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{file.name}</p>
              <p className="text-[13px] text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove file"
              disabled={busy}
              onClick={() => setFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1 px-1 pb-1">
          <InlineSelect
            icon={<AudioLines className="h-4 w-4 text-muted-foreground" />}
            value={settings.format}
            onValueChange={(v) => updateSettings({ format: v === 'mp3' ? 'mp3' : 'opus' })}
            options={FORMAT_OPTIONS}
          />
          <InlineSelect
            icon={<Gauge className="h-4 w-4 text-muted-foreground" />}
            value={String(settings.bitrate)}
            onValueChange={(v) => updateSettings({ bitrate: Number(v) })}
            options={BITRATE_OPTIONS}
          />
          <InlineSelect
            icon={<Speaker className="h-4 w-4 text-muted-foreground" />}
            value={String(settings.channels)}
            onValueChange={(v) => updateSettings({ channels: v === '2' ? 2 : 1 })}
            options={CHANNEL_OPTIONS}
          />
          <div className="flex h-8 items-center gap-2 rounded-[10px] px-2">
            <span className="text-[13px] font-medium text-foreground">
              Speed {Number(settings.speed.toFixed(2))}×
            </span>
            <Slider
              value={settings.speed}
              onChange={(v) => updateSettings({ speed: v })}
              min={1}
              max={2}
              step={0.05}
              className="w-28"
            />
          </div>

          <div className="ml-auto flex items-center gap-3 pl-2">
            {creditsEstimate !== null && (
              <span className="text-[13px] text-muted-foreground">
                ~{creditsEstimate} credits
              </span>
            )}
            <Button
              size="icon"
              className="h-10 w-10 rounded-full"
              aria-label="Compress audio"
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
      </Dropzone>

      {/* Recent jobs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-foreground">Recent</p>
          <SearchInput
            placeholder="Search files…"
            className="w-56"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {jobsError ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t load your audio jobs.
            </p>
            <Button variant="secondary" className="mt-3" onClick={() => void mutateJobs()}>
              Try again
            </Button>
          </Card>
        ) : jobsLoading ? (
          <div className="space-y-0.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          (jobsData?.items ?? []).length === 0 ? (
            <EmptyState
              icon={<AudioLines className="h-5 w-5" />}
              title="No audio jobs yet"
              hint="Drop a file above to compress your first audio."
            />
          ) : (
            <EmptyState title="No matching files" />
          )
        ) : (
          <ul className="space-y-0.5">
            {items.map((item) => {
              const processing = item.status === 'processing' || item.status === 'pending'
              return (
                <li
                  key={item.id}
                  className="group flex items-center gap-4 rounded-2xl px-3 py-2.5 transition-colors hover:bg-black/[0.04]"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
                    <AudioLines className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.name && <p className="truncate text-sm text-foreground">{item.name}</p>}
                    {item.metrics?.inputSize ? (
                      <p className="text-[13px] text-muted-foreground">
                        {formatBytes(item.metrics.inputSize)}
                      </p>
                    ) : null}
                    {processing && (
                      <Progress value={100} className="mt-1.5 w-40 [&>div]:animate-pulse" />
                    )}
                  </div>
                  <StatusBadge
                    status={BADGE_STATUS[item.status]}
                    className="hidden sm:inline-flex"
                  />
                  <span className="hidden w-14 text-right text-[13px] font-medium tabular-nums text-foreground sm:block">
                    {savedPercent(item) ?? '—'}
                  </span>
                  <span className="hidden w-20 text-right text-[13px] tabular-nums text-muted-foreground md:block">
                    {timeAgo(item.createdAt)}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Job actions"
                        className={`text-muted-foreground opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 ${
                          downloadingId === item.id ? 'opacity-100' : ''
                        }`}
                      >
                        {downloadingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={item.status !== 'completed' || downloadingId === item.id}
                        className="data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                        onSelect={() => void handleDownload(item)}
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
