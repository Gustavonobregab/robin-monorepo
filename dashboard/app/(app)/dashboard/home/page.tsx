'use client'
import Link from 'next/link'
import useSWR from 'swr'
import { useSession } from '@/app/lib/auth-client'
import { getUsageAnalytics } from '@/app/http/usage'
import { FileText, Mic, CreditCard } from 'lucide-react'
import { PageHeader } from '@/app/components/ui/page-header'
import { Surface } from '@/app/components/ui/surface'
import { Chip } from '@/app/components/ui/chip'
import { Skeleton } from '@/app/components/ui/skeleton'
import type { ApiResponse, UsageAnalytics, UsageEvent } from '@/types'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/* ── Tool portal visuals ── */

function TextVisual() {
  return (
    <div className="flex h-full items-center justify-center gap-5">
      {/* "Before" document */}
      <div className="w-24 space-y-1.5 rounded-lg bg-card px-3 py-2.5">
        {[100, 75, 90, 60, 85, 55].map((w, i) => (
          <div key={i} className="h-1.5 rounded-full bg-foreground/15" style={{ width: `${w}%` }} />
        ))}
      </div>

      {/* Divider between before / after */}
      <div className="h-12 w-px shrink-0 rounded-full bg-brand/50" aria-hidden />

      {/* "After" document: shorter lines */}
      <div className="w-16 space-y-1.5 rounded-lg bg-card px-3 py-2.5">
        {[100, 75, 90, 60].map((w, i) => (
          <div key={i} className="h-1.5 rounded-full bg-brand/50" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}

function AudioVisual() {
  const bars = [2, 4, 7, 9, 6, 8, 11, 7, 5, 9, 12, 8, 6, 4, 7, 10, 8, 5, 3, 7]
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex items-end gap-0.5">
        {bars.map((h, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full bg-brand/50"
            style={{ height: `${h * 4}px` }}
          />
        ))}
      </div>
    </div>
  )
}

function ImageVisual() {
  const palette = [
    'bg-border/60', 'bg-brand-subtle/40', 'bg-brand/20',
    'bg-foreground/10', 'bg-brand-subtle/25', 'bg-border/40',
  ]
  return (
    <div className="flex h-full items-center justify-center">
      <div className="grid grid-cols-5 gap-1 opacity-50">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className={`h-5 w-5 rounded-sm ${palette[i % palette.length]}`} />
        ))}
      </div>
    </div>
  )
}

/* ── Data ── */

const TOOLS = [
  {
    label: 'Text',
    subtitle: 'Clean & compress text',
    href: '/dashboard/text',
    bg: 'bg-brand-subtle/25',
    Visual: TextVisual,
    disabled: false,
  },
  {
    label: 'Audio',
    subtitle: 'Process audio files',
    href: '/dashboard/audio',
    bg: 'bg-brand/15',
    Visual: AudioVisual,
    disabled: false,
  },
  {
    label: 'Image',
    subtitle: 'Compress to WebP & AVIF',
    href: '/dashboard/image',
    bg: 'bg-muted',
    Visual: ImageVisual,
    disabled: false,
  },
]

const QUICK_STARTS = [
  {
    label: 'Billing',
    description: 'Plans, invoices, and payment method',
    href: '/dashboard/billing',
    icon: CreditCard,
  },
]

/* ── Page ── */

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 shrink-0 text-sm font-medium text-foreground">{children}</h2>
}

function ToolCard({ tool }: { tool: (typeof TOOLS)[number] }) {
  const card = (
    <Surface
      padding="none"
      radius="xl"
      className={`overflow-hidden transition-transform duration-200 ${
        tool.disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer hover:-translate-y-0.5'
      }`}
    >
      {/* Visual area */}
      <div className={`h-40 ${tool.bg}`}>
        <tool.Visual />
      </div>

      {/* Label */}
      <div className="flex items-center gap-2 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">{tool.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{tool.subtitle}</p>
        </div>
        {tool.disabled && (
          <Chip variant="brand" size="sm" className="ml-auto rounded-full font-medium">
            Soon
          </Chip>
        )}
      </div>
    </Surface>
  )

  return tool.disabled ? card : <Link href={tool.href}>{card}</Link>
}

function RecentActivitySkeleton() {
  return (
    <div className="flex min-h-0 flex-col">
      <SectionTitle>Recent activity</SectionTitle>
      <Surface padding="sm" radius="lg" className="space-y-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="shrink-0 space-y-1.5">
              <Skeleton className="ml-auto h-3 w-16" />
              <Skeleton className="ml-auto h-3 w-24" />
            </div>
          </div>
        ))}
      </Surface>
    </div>
  )
}

function RecentActivity({ jobs }: { jobs: UsageEvent[] }) {
  return (
    <div className="flex min-h-0 flex-col">
      <SectionTitle>Recent activity</SectionTitle>
      <Surface padding="sm" radius="lg" className="space-y-1.5">
        {jobs.map((job) => {
          const ratio = job.inputBytes > 0 ? (job.inputBytes / job.outputBytes).toFixed(1) : 'n/a'
          return (
            <div
              key={job._id}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                {job.pipelineType === 'text'
                  ? <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  : <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                }
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium capitalize text-foreground">
                  {job.pipelineType} compression
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(job.timestamp).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="font-mono text-xs font-medium text-foreground">{ratio}x smaller</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {formatBytes(job.inputBytes)} to {formatBytes(job.outputBytes)}
                </p>
              </div>
            </div>
          )
        })}
      </Surface>
    </div>
  )
}

function QuickStart({ fullWidth }: { fullWidth?: boolean }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <SectionTitle>Quick start</SectionTitle>
      <div className={`flex min-h-0 flex-1 gap-4 ${fullWidth ? 'flex-row' : 'flex-col'}`}>
        {QUICK_STARTS.map((item) => (
          <Link key={item.label} href={item.href} className="flex flex-1">
            <Surface
              padding="none"
              radius="lg"
              className="flex min-h-[4.5rem] flex-1 items-center gap-4 px-4 py-5 transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-subtle">
                <item.icon className="h-4 w-4 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
              </div>
            </Surface>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function HomePage() {
  const { data: session } = useSession()
  const firstName = session?.user?.name?.split(' ')[0] ?? 'there'

  const { data, isLoading } = useSWR<ApiResponse<UsageAnalytics>>(
    'usage-analytics-home',
    () => getUsageAnalytics('30d'),
  )

  const recentJobs = (data?.data?.recent ?? []).slice(0, 5)
  const hasActivity = recentJobs.length > 0

  return (
    <div className="mx-auto w-full max-w-5xl py-8">
      <PageHeader title={`${getGreeting()}, ${firstName}`} description="My Workspace" />

      <div className="space-y-8 md:space-y-10">
        {/* Tool portals */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 md:gap-8">
          {TOOLS.map((tool) => (
            <ToolCard key={tool.label} tool={tool} />
          ))}
        </div>

        {/* Bottom section: two columns if activity exists, full width quick start otherwise */}
        {isLoading ? (
          <div className="grid grid-cols-1 items-stretch gap-8 md:grid-cols-2 md:gap-12">
            <RecentActivitySkeleton />
            <QuickStart />
          </div>
        ) : hasActivity ? (
          <div className="grid grid-cols-1 items-stretch gap-8 md:grid-cols-2 md:gap-12">
            <RecentActivity jobs={recentJobs} />
            <QuickStart />
          </div>
        ) : (
          <QuickStart fullWidth />
        )}
      </div>
    </div>
  )
}
