'use client'

import Link from 'next/link'
import { ArrowUpDown, FileText, Mic, ImageIcon, Plus, Rocket, Trash2 } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { Chip } from '@/app/components/ui/Chip'
import { ConfirmDialog } from '@/app/components/ui/ConfirmDialog'
import { SearchInput } from '@/app/components/ui/SearchInput'
import { Tabs } from '@/app/components/ui/Tabs'

/* Home rebuilt as a black & white copy of the ElevenLabs voice-library:
   underline tabs, near-black primary button, filter chips, transparent
   hover cards, and 16px-radius table rows that fill grey on hover. */

const FILTERS = ['All', 'Text', 'Audio', 'Image', 'Done', 'Queued', 'Failed']

const QUICK_START = [
  { label: 'Text', desc: 'Clean & compress prose', meta: 'gzip · brotli', href: '/dashboard/text', Icon: FileText },
  { label: 'Audio', desc: 'Shrink audio, keep fidelity', meta: 'opus · mp3', href: '/dashboard/audio', Icon: Mic },
  { label: 'Image', desc: 'Encode to modern formats', meta: 'webp · avif', href: '/dashboard/image', Icon: ImageIcon },
]

type Status = 'done' | 'queued' | 'failed'
const STATUS_LABEL: Record<Status, string> = { done: 'Done', queued: 'Queued', failed: 'Failed' }
const STATUS_DOT: Record<Status, string> = {
  done: 'bg-foreground',
  queued: 'bg-muted-foreground/50',
  failed: 'bg-transparent ring-1 ring-inset ring-muted-foreground/60',
}
const KIND_ICON: Record<string, typeof FileText> = { Text: FileText, Audio: Mic, Image: ImageIcon }

const JOBS: { name: string; kind: keyof typeof KIND_ICON; ratio: string; size: string; at: string; status: Status }[] = [
  { name: 'quarterly-report.txt', kind: 'Text', ratio: '−71%', size: '2.4 MB', at: '2h ago', status: 'done' },
  { name: 'podcast-ep-42.wav', kind: 'Audio', ratio: '—', size: '58 MB', at: '3h ago', status: 'queued' },
  { name: 'hero-banner.png', kind: 'Image', ratio: '−82%', size: '4.1 MB', at: '5h ago', status: 'done' },
  { name: 'transcript-raw.txt', kind: 'Text', ratio: '—', size: '880 KB', at: '1d ago', status: 'failed' },
  { name: 'intro-voiceover.mp3', kind: 'Audio', ratio: '−64%', size: '12 MB', at: '1d ago', status: 'done' },
]

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-5">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">Compress</h1>
        <div className="flex items-end justify-between gap-4">
          <Tabs tabs={['Overview', 'History']} />
          <div className="flex items-center gap-2 pb-1">
            <Button variant="secondary" asChild>
              <Link href="/dashboard/usage">Usage</Link>
            </Button>
            <ConfirmDialog
              tone="primary"
              icon={<Rocket className="h-[1.05rem] w-[1.05rem]" />}
              title="Start a compression job?"
              description="We'll queue your file and spend credits based on its size. Nothing runs until you confirm."
              confirmLabel="Start job"
              onConfirm={() => {}}
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  New job
                </Button>
              }
            />
          </div>
        </div>
      </div>

      {/* Search + sort */}
      <div className="flex items-center gap-2">
        <SearchInput placeholder="Search jobs…" className="flex-1" />
        <Button variant="secondary" size="lg" className="gap-2">
          <ArrowUpDown className="h-4 w-4" />
          Sort
        </Button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f, i) => (
          <Chip key={f} active={i === 0}>
            {f}
          </Chip>
        ))}
      </div>

      {/* Quick start — transparent hover cards */}
      <section className="space-y-3">
        <p className="text-sm font-medium text-foreground">Quick start</p>
        <div className="grid gap-1 sm:grid-cols-3">
          {QUICK_START.map(({ label, desc, meta, href, Icon }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-black/[0.04]"
            >
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-secondary text-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="truncate text-[13px] text-muted-foreground">{desc}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/80">{meta}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent jobs — table rows with rounded grey hover */}
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
        <ul className="space-y-0.5">
          {JOBS.map((job) => {
            const Icon = KIND_ICON[job.kind]
            return (
              <li
                key={job.name}
                className="group flex items-center gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-black/[0.04]"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{job.name}</p>
                  <p className="text-[13px] text-muted-foreground">{job.size}</p>
                </div>
                <span className="hidden items-center gap-1.5 text-[13px] text-muted-foreground sm:flex">
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[job.status]}`} />
                  {STATUS_LABEL[job.status]}
                </span>
                <span className="hidden w-14 text-right text-[13px] font-medium tabular-nums text-foreground sm:block">
                  {job.ratio}
                </span>
                <span className="hidden w-16 text-right text-[13px] tabular-nums text-muted-foreground md:block">
                  {job.at}
                </span>
                <ConfirmDialog
                  tone="destructive"
                  icon={<Trash2 className="h-[1.05rem] w-[1.05rem]" />}
                  title="Delete this job?"
                  description="This removes the compressed file and its history entry. This can't be undone."
                  confirmLabel="Delete"
                  onConfirm={() => {}}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete job"
                      className="text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  }
                />
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
