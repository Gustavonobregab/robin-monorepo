'use client'
import useSWR from 'swr'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Skeleton } from '@/app/components/ui/skeleton'
import { getProfile } from '@/app/http/users'
import { getPublicPlans } from '@/app/http/plans'
import type { ApiResponse, PublicPlan, UserProfile } from '@/types'

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface PipelineData {
  label: string
  requests: number
  detail: string
  data: string
}

function UsageBarChart({ pipelines, total }: { pipelines: PipelineData[]; total: number }) {
  return (
    <div className="space-y-4">
      {pipelines.map((p) => {
        const pct = total > 0 ? (p.requests / total) * 100 : 0

        return (
          <div key={p.label} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{p.label}</span>
              <span className="text-sm text-muted">
                {p.requests.toLocaleString()} req · {pct.toFixed(1)}%
              </span>
            </div>
            <div className="h-4 rounded-full bg-accent-light overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-strong transition-all"
                style={{ width: `${Math.max(pct, 1.5)}%` }}
              />
            </div>
            <div className="flex gap-3 text-xs text-muted">
              <span>{p.detail}</span>
              <span>·</span>
              <span>{p.data}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CreditBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const isHigh = pct >= 80

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted">Credits used</span>
        <span className="font-medium">
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-accent-light overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isHigh ? 'bg-danger' : 'bg-accent-strong'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function BillingPage() {
  const { data, isLoading } = useSWR<ApiResponse<UserProfile>>(
    'user-profile',
    getProfile,
  )

  const profile = data?.data
  const plan = profile?.plan
  const subscription = profile?.subscription
  const usage = profile?.currentUsage

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="space-y-5 max-w-2xl mx-auto">
        <div>
          <h2 className="text-lg font-semibold">Billing</h2>
          <p className="text-sm text-muted mt-0.5">Your current plan and usage.</p>
        </div>

        <div className="bg-background rounded-xl border border-border shadow-sm p-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-2 w-full mt-2" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold">{plan?.name ?? 'Free'} plan</p>
                  {subscription && (
                    <p className="text-sm text-muted">
                      {formatDate(subscription.currentPeriodStart)} – {formatDate(subscription.currentPeriodEnd)}
                    </p>
                  )}
                </div>
                <Badge className="bg-accent-light text-foreground border-0 rounded-full">
                  Current plan
                </Badge>
              </div>

              {subscription && (
                <CreditBar
                  used={subscription.credits.used}
                  limit={subscription.credits.limit}
                />
              )}
            </>
          )}
        </div>

        {!isLoading && usage && (
          <div className="bg-background rounded-xl border border-border shadow-sm p-6">
            <h3 className="font-medium mb-4">Usage this cycle</h3>
            {(() => {
              const pipelines: PipelineData[] = [
                usage.audio.requests > 0 && {
                  label: 'Audio',
                  requests: usage.audio.requests,
                  detail: `${usage.audio.minutes.toFixed(1)} min`,
                  data: formatBytes(usage.audio.inputBytes),
                },
                usage.text.requests > 0 && {
                  label: 'Text',
                  requests: usage.text.requests,
                  detail: `${usage.text.characters.toLocaleString()} chars`,
                  data: formatBytes(usage.text.inputBytes),
                },
                usage.image.requests > 0 && {
                  label: 'Image',
                  requests: usage.image.requests,
                  detail: `${usage.image.megapixels.toFixed(1)} MP`,
                  data: formatBytes(usage.image.inputBytes),
                },
                usage.video.requests > 0 && {
                  label: 'Video',
                  requests: usage.video.requests,
                  detail: `${usage.video.minutes.toFixed(1)} min`,
                  data: formatBytes(usage.video.inputBytes),
                },
              ].filter(Boolean) as PipelineData[]

              if (pipelines.length === 0) {
                return <p className="text-sm text-muted">No usage this cycle.</p>
              }

              const total = pipelines.reduce((sum, p) => sum + p.requests, 0)

              return (
                <>
                  <p className="text-2xl font-semibold mb-4">
                    {total.toLocaleString()} <span className="text-sm font-normal text-muted">total requests</span>
                  </p>
                  <UsageBarChart pipelines={pipelines} total={total} />
                </>
              )
            })()}
          </div>
        )}

        {!isLoading && <PlansBlock currentSlug={plan?.slug} />}
      </div>
    </div>
  )
}

function PlansBlock({ currentSlug }: { currentSlug?: string }) {
  const { data } = useSWR('public-plans', getPublicPlans)
  const plans = data?.data ?? []

  if (plans.length === 0) return null

  return (
    <div className="bg-background rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-medium mb-4">Plans</h3>
      <div className="space-y-3">
        {plans.map((p) => (
          <PlanRow key={p.slug} plan={p} isCurrent={p.slug === currentSlug} />
        ))}
      </div>
    </div>
  )
}

function PlanRow({ plan, isCurrent }: { plan: PublicPlan; isCurrent: boolean }) {
  const sellable = plan.prices?.usd !== undefined || plan.prices?.brl !== undefined

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{plan.name}</span>
          {isCurrent && (
            <Badge className="bg-accent-light text-foreground border-0 rounded-full text-xs">
              Current plan
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted mt-0.5">
          {plan.credits.toLocaleString()} credits/month · files up to {formatBytes(plan.features.maxFileSize)} ·{' '}
          {plan.features.maxApiKeys} keys{plan.features.webhooks ? ' · webhooks' : ''}
        </p>
      </div>
      {!isCurrent && (
        <Button disabled={!sellable} size="sm" className="rounded-full bg-accent-strong text-foreground shrink-0 disabled:opacity-50">
          {sellable ? 'Upgrade' : 'Coming soon'}
        </Button>
      )}
    </div>
  )
}
