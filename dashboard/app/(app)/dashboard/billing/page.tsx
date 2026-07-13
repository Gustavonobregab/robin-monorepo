'use client'
import useSWR from 'swr'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { EmptyState } from '@/app/components/ui/empty-state'
import { PageHeader } from '@/app/components/ui/page-header'
import { Skeleton } from '@/app/components/ui/skeleton'
import { Surface } from '@/app/components/ui/surface'
import { getProfile } from '@/app/http/users'
import { getPublicPlans } from '@/app/http/plans'
import { formatBytes, formatDate } from '@/app/lib/utils'
import type { ApiResponse, PublicPlan, UserProfile } from '@/types'

export default function BillingPage() {
  const { data, isLoading } = useSWR<ApiResponse<UserProfile>>('user-profile', getProfile)

  const profile = data?.data
  const plan = profile?.plan
  const subscription = profile?.subscription

  return (
    <div className="pt-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Billing"
          description="Plan, payment method, and invoices."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/usage">View usage</Link>
            </Button>
          }
        />

        {isLoading ? (
          <div className="space-y-5">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        ) : (
          <div className="space-y-5">
            <Surface radius="lg">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">{plan?.name ?? 'Free'} plan</p>
                <Badge variant="secondary">Current plan</Badge>
              </div>
              {plan && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {plan.credits.toLocaleString()} credits per cycle
                </p>
              )}
              {subscription && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {subscription.status === 'canceled'
                    ? `Your plan ends on ${formatDate(subscription.currentPeriodEnd)}.`
                    : `Your plan renews on ${formatDate(subscription.currentPeriodEnd)}.`}
                </p>
              )}
            </Surface>

            <Surface radius="lg">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-medium text-foreground">Payment</h2>
                  <p className="mt-1 text-sm text-muted-foreground">No payment method on file.</p>
                </div>
                <Button size="sm" variant="secondary" disabled className="shrink-0">
                  Coming soon
                </Button>
              </div>
            </Surface>

            <Surface radius="lg" padding="none">
              <div className="border-b border-border px-6 py-4">
                <h2 className="font-medium text-foreground">Invoices</h2>
              </div>
              <EmptyState icon={FileText} title="No invoices yet" />
            </Surface>

            <PlansBlock currentSlug={plan?.slug} />
          </div>
        )}
      </div>
    </div>
  )
}

function PlansBlock({ currentSlug }: { currentSlug?: string }) {
  const { data } = useSWR('public-plans', getPublicPlans)
  const plans = data?.data ?? []

  if (plans.length === 0) return null

  return (
    <Surface radius="lg" padding="none">
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-medium text-foreground">Plans</h2>
      </div>
      <div className="divide-y divide-border">
        {plans.map((plan) => (
          <PlanRow key={plan.slug} plan={plan} isCurrent={plan.slug === currentSlug} />
        ))}
      </div>
    </Surface>
  )
}

function PlanRow({ plan, isCurrent }: { plan: PublicPlan; isCurrent: boolean }) {
  const sellable = plan.prices?.usd !== undefined || plan.prices?.brl !== undefined

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{plan.name}</span>
          {isCurrent && <Badge variant="secondary">Current plan</Badge>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {plan.credits.toLocaleString()} credits/month · files up to{' '}
          <span className="font-mono">{formatBytes(plan.features.maxFileSize)}</span> ·{' '}
          {plan.features.maxApiKeys} keys{plan.features.webhooks ? ' · webhooks' : ''}
        </p>
      </div>
      {!isCurrent && (
        <Button
          disabled={!sellable}
          size="sm"
          variant={sellable ? 'default' : 'secondary'}
          className="shrink-0"
        >
          {sellable ? 'Upgrade' : 'Coming soon'}
        </Button>
      )}
    </div>
  )
}
