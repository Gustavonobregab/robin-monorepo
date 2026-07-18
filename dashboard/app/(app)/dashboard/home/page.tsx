'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import {
  ArrowUp,
  AudioLines,
  BookOpen,
  Braces,
  ChevronDown,
  Crop,
  FileText,
  Globe,
  GraduationCap,
  ImageIcon,
  KeyRound,
  Mic,
  Podcast,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/DropdownMenu'
import { Dropzone } from '@/app/components/ui/Dropzone'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { RetryCard } from '@/app/components/ui/RetryCard'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { StatusBadge } from '@/app/components/ui/StatusBadge'
import { listJobs } from '@/app/http/jobs'
import { setPendingInput } from '@/app/lib/pending-input'
import { formatBytes, formatSaved, savedPercent, timeAgo } from '@/app/lib/utils'
import type { JobPipeline } from '@/types'

const DOCS_URL = 'https://docs.robinzip.app'

const PIPELINES = [
  { label: 'Text', desc: 'Clean & compress prose', href: '/dashboard/text', Icon: FileText },
  { label: 'Audio', desc: 'Shrink audio, keep fidelity', href: '/dashboard/audio', Icon: Mic },
  { label: 'Image', desc: 'Encode to modern formats', href: '/dashboard/image', Icon: ImageIcon },
]

const TEMPLATES: { label: string; desc: string; href: string; Icon: LucideIcon }[] = [
  { label: 'Podcast', desc: 'Opus 24 kbps mono, tuned for voice', href: '/dashboard/audio?preset=podcast', Icon: Podcast },
  { label: 'Lecture', desc: '1.5x speed, 16 kbps', href: '/dashboard/audio?preset=lecture', Icon: GraduationCap },
  { label: 'Voice note', desc: '1.75x speed, smallest audio', href: '/dashboard/audio?preset=aggressive', Icon: AudioLines },
  { label: 'LLM prompt', desc: 'Trim text, JSON to TOON', href: '/dashboard/text?preset=aggressive', Icon: Braces },
  { label: 'Web images', desc: 'Max 2560px, balanced WebP', href: '/dashboard/image?preset=medium', Icon: Globe },
  { label: 'Thumbnail', desc: '512px smart-cropped WebP', href: '/dashboard/image?preset=thumbnail', Icon: Crop },
]

const KIND_ICON: Record<JobPipeline, LucideIcon> = {
  text: FileText,
  audio: Mic,
  image: ImageIcon,
  video: FileText,
}

const AUDIO_EXT = ['mp3', 'wav']
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp']

function routeForFile(file: File): string | null {
  const ext = file.name.toLowerCase().split('.').pop() ?? ''
  if (AUDIO_EXT.includes(ext)) return '/dashboard/audio'
  if (IMAGE_EXT.includes(ext)) return '/dashboard/image'
  if (ext === 'txt') return '/dashboard/text'
  return null
}

export default function HomePage() {
  const router = useRouter()
  const [text, setText] = useState('')

  const {
    data: jobsData,
    error: jobsError,
    isLoading: jobsLoading,
    mutate: mutateJobs,
  } = useSWR('jobs/recent', () => listJobs({ limit: 8 }))
  const jobs = jobsData?.items ?? []

  function handleFile(file: File) {
    const href = routeForFile(file)
    if (!href) {
      toast.error('Unsupported file. Use MP3, WAV, JPG, PNG, WebP or TXT.')
      return
    }
    setPendingInput({ file })
    router.push(href)
  }

  function handleText() {
    if (!text.trim()) return
    setPendingInput({ text })
    router.push('/dashboard/text')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">Compress</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" asChild>
            <Link href="/dashboard/usage">Usage</Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                Compress
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {PIPELINES.map(({ label, desc, href, Icon }) => (
                <DropdownMenuItem key={label} asChild>
                  <Link href={href}>
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{label}</span>
                    <span className="text-[12px] text-muted-foreground">{desc}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Universal composer + API quickstart */}
      <div className="grid gap-4 lg:grid-cols-[1fr_310px]">
        <Dropzone
          accept=".mp3,.wav,.jpg,.jpeg,.png,.webp,.txt"
          onFiles={(files) => {
            if (files[0]) handleFile(files[0])
          }}
          label="Drop anything to compress"
          hint="MP3, WAV, JPG, PNG, WebP or TXT. We route you to the right tool."
        >
          <div className="mt-2 flex items-end gap-2 px-1 pb-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleText()
                }
              }}
              rows={2}
              placeholder="Or paste text here"
              className="block min-h-[3.5rem] w-full flex-1 resize-none rounded-2xl bg-black/[0.02] px-4 py-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground hover:bg-black/[0.04] focus:outline-none"
            />
            <Button
              size="orb"
              aria-label="Compress text"
              disabled={!text.trim()}
              onClick={handleText}
              className="shrink-0"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </Dropzone>

        <Card className="flex flex-col p-5">
          <p className="text-sm font-medium text-foreground">API Quickstart</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Make your first request in minutes.
          </p>
          <div className="mt-3 flex-1 overflow-x-auto rounded-xl bg-black/[0.02] p-3">
            <pre className="font-mono text-[12px] leading-relaxed text-muted-foreground">
              {`curl https://api.robinzip.app/v1/text \\
  -H "Authorization: Bearer sk_live_..." \\
  -d '{"text": "...", "preset": "medium"}'`}
            </pre>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href="/dashboard/keys">
                <KeyRound className="h-4 w-4" />
                Get API key
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
                <BookOpen className="h-4 w-4" />
                Docs
              </a>
            </Button>
          </div>
        </Card>
      </div>

      {/* Feature banner */}
      <section className="rounded-3xl bg-primary px-6 py-7 text-center">
        <div className="mx-auto max-w-md space-y-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary-foreground/60">
            New template
          </span>
          <h2 className="text-xl font-medium tracking-tight text-primary-foreground">
            Podcast, tuned for voice
          </h2>
          <p className="text-sm text-primary-foreground/70">
            Opus 24 kbps mono. Episodes get up to 10x smaller with no audible loss.
          </p>
          <div className="flex items-center justify-center pt-1">
            <Button
              asChild
              className="rounded-full bg-background text-foreground hover:bg-background/90"
            >
              <Link href="/dashboard/audio?preset=podcast">
                <Podcast className="h-4 w-4" />
                Try Podcast
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Templates */}
      <section className="space-y-3">
        <p className="text-sm font-medium text-foreground">Templates</p>
        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map(({ label, desc, href, Icon }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-black/[0.04]"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-secondary text-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="truncate text-[13px] text-muted-foreground">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent jobs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Recent jobs</p>
          <Link
            href="/dashboard/history"
            className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        </div>

        {jobsError ? (
          <RetryCard message="Couldn't load your recent jobs." onRetry={() => void mutateJobs()} />
        ) : jobsLoading ? (
          <div className="space-y-0.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-2xl" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-5 w-5" />}
            title="Nothing compressed yet"
            hint="Drop a file above or pick a template to get started."
          />
        ) : (
          <ul className="space-y-0.5">
            {jobs.map((job) => {
              const Icon = KIND_ICON[job.type]
              const saved = savedPercent(job.metrics?.inputSize, job.metrics?.outputSize)
              return (
                <li
                  key={job.id}
                  className="flex items-center gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-black/[0.04]"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {job.name && <p className="truncate text-sm text-foreground">{job.name}</p>}
                    {job.metrics?.inputSize ? (
                      <p className="text-[13px] text-muted-foreground">
                        {formatBytes(job.metrics.inputSize)}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge status={job.status} className="hidden sm:inline-flex" />
                  <span className="hidden w-14 text-right text-[13px] font-medium tabular-nums text-foreground sm:block">
                    {saved !== null && formatSaved(saved)}
                  </span>
                  <span className="hidden w-16 text-right text-[13px] tabular-nums text-muted-foreground md:block">
                    {timeAgo(job.createdAt)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
