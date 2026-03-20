'use client'
import Link from 'next/link'
import useSWR from 'swr'
import { useSession } from '@/app/lib/auth-client'
import { getUsageAnalytics } from '@/app/http/usage'
import { FileText, Mic, Key, BookOpen, CreditCard } from 'lucide-react'
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
    <div className="flex items-center justify-center h-full gap-5">
      {/* "Before" document */}
      <div className="bg-background rounded-lg shadow-sm px-3 py-2.5 space-y-1.5 w-24">
        {[100, 75, 90, 60, 85, 55].map((w, i) => (
          <div key={i} className="h-1.5 rounded-full bg-foreground/15" style={{ width: `${w}%` }} />
        ))}
      </div>

      {/* Arrow */}
      <div className="flex flex-col gap-0.5">
        {[1, 1, 1].map((_, i) => (
          <div key={i} className="w-4 h-0.5 rounded-full bg-accent-strong/60" />
        ))}
      </div>

      {/* "After" document — shorter lines */}
      <div className="bg-background rounded-lg shadow-sm px-3 py-2.5 space-y-1.5 w-16">
        {[100, 75, 90, 60].map((w, i) => (
          <div key={i} className="h-1.5 rounded-full bg-accent-strong/50" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}

function AudioVisual() {
  const bars = [2, 4, 7, 9, 6, 8, 11, 7, 5, 9, 12, 8, 6, 4, 7, 10, 8, 5, 3, 7]
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-end gap-0.5">
        {bars.map((h, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full bg-accent-strong/50"
            style={{ height: `${h * 4}px` }}
          />
        ))}
      </div>
    </div>
  )
}

function ImageVisual() {
  const palette = [
    'bg-border/60', 'bg-accent-light/40', 'bg-accent-strong/20',
    'bg-foreground/8', 'bg-accent-light/25', 'bg-border/40',
  ]
  return (
    <div className="flex items-center justify-center h-full">
      <div className="grid grid-cols-5 gap-1 opacity-50">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className={`w-5 h-5 rounded-sm ${palette[i % palette.length]}`} />
        ))}
      </div>
    </div>
  )
}

/* ── Data ── */

const TOOLS = [
  {
    label: 'Text',
    subtitle: 'Compress & minify text',
    href: '/dashboard/text',
    bg: 'bg-accent-light/25',
    Visual: TextVisual,
    disabled: false,
  },
  {
    label: 'Audio',
    subtitle: 'Process audio files',
    href: '/dashboard/audio',
    bg: 'bg-accent-strong/15',
    Visual: AudioVisual,
    disabled: false,
  },
  {
    label: 'Image',
    subtitle: 'Coming soon',
    href: '/dashboard/image',
    bg: 'bg-background-section',
    Visual: ImageVisual,
    disabled: true,
  },
]

const QUICK_STARTS = [
  {
    label: 'API Keys',
    description: 'Create and manage your API keys',
    href: '/dashboard/keys',
    icon: Key,
  },
  {
    label: 'Billing',
    description: 'Plans, invoices, and payment method',
    href: '/dashboard/billing',
    icon: CreditCard,
  },
  {
    label: 'API Reference',
    description: 'Browse the full API documentation',
    href: '#',
    icon: BookOpen,
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

function RecentActivity({ jobs }: { jobs: UsageEvent[] }) {
  return (
    <div className="flex flex-col min-h-0">
      <h2 className="text-sm font-medium mb-3 shrink-0">Recent activity</h2>
      <div className="space-y-1.5">
        {jobs.map((job) => {
          const ratio = job.inputBytes > 0 ? (job.inputBytes / job.outputBytes).toFixed(1) : '—'
          return (
            <div
              key={job._id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-background-section transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-background-section border border-border flex items-center justify-center shrink-0">
                {job.pipelineType === 'text'
                  ? <FileText className="w-3.5 h-3.5 text-muted" />
                  : <Mic className="w-3.5 h-3.5 text-muted" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate capitalize">
                  {job.pipelineType} compression
                </p>
                <p className="text-xs text-muted">
                  {new Date(job.timestamp).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-xs font-medium text-foreground">{ratio}x smaller</p>
                <p className="text-xs text-muted">{formatBytes(job.inputBytes)} to {formatBytes(job.outputBytes)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function QuickStart({ fullWidth }: { fullWidth?: boolean }) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <h2 className="text-sm font-medium mb-3 shrink-0">Quick start</h2>
      <div className={`flex flex-1 gap-4 min-h-0 ${fullWidth ? 'flex-row' : 'flex-col'}`}>
        {QUICK_STARTS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-1 min-h-[4.5rem] items-center gap-4 px-4 py-5 rounded-xl border border-border bg-background hover:border-accent-strong/40 hover:shadow-sm transition-all group ${fullWidth ? '' : ''}`}
          >
            <div className="w-10 h-10 rounded-xl bg-accent-light flex items-center justify-center shrink-0">
              <item.icon className="w-4.5 h-4.5 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{item.label}</p>
              <p className="text-xs text-muted mt-0.5">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function HomePage() {
  const { data: session } = useSession()
  const firstName = session?.user?.name?.split(' ')[0] ?? 'there'

  const { data } = useSWR<ApiResponse<UsageAnalytics>>(
    'usage-analytics-home',
    () => getUsageAnalytics('30d'),
  )

  const recentJobs = (data?.data?.recent ?? []).slice(0, 5)
  const hasActivity = recentJobs.length > 0

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* Greeting */}
        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">My Workspace</p>
          <h1 className="text-3xl font-semibold">{getGreeting()}, {firstName}</h1>
        </div>

        {/* Tool portals */}
        <div className="grid grid-cols-3 gap-6 md:gap-8">
          {TOOLS.map((tool) => {
            const inner = (
              <div
                className={`rounded-2xl border border-border overflow-hidden transition-all ${
                  tool.disabled
                    ? 'opacity-55 cursor-not-allowed'
                    : 'hover:shadow-md hover:border-accent-strong/40 cursor-pointer'
                }`}
              >
                {/* Visual area */}
                <div className={`h-40 ${tool.bg}`}>
                  <tool.Visual />
                </div>

                {/* Label */}
                <div className="px-4 py-3 bg-background flex items-center gap-2">
                  <div>
                    <p className="font-medium text-sm">{tool.label}</p>
                    <p className="text-xs text-muted mt-0.5">{tool.subtitle}</p>
                  </div>
                  {tool.disabled && (
                    <span className="ml-auto text-[10px] bg-accent-light text-foreground px-2 py-0.5 rounded-full font-medium">
                      Soon
                    </span>
                  )}
                </div>
              </div>
            )

            return tool.disabled ? (
              <div key={tool.label}>{inner}</div>
            ) : (
              <Link key={tool.label} href={tool.href}>{inner}</Link>
            )
          })}
        </div>

        {/* Bottom section — two columns if activity exists, full width quick start otherwise */}
        {hasActivity ? (
          <div className="grid grid-cols-2 gap-12 items-stretch">
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
