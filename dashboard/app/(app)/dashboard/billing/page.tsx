'use client'
import useSWR from 'swr'
import Link from 'next/link'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Skeleton } from '@/app/components/ui/skeleton'
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
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="space-y-5 max-w-2xl mx-auto">
        <div>
          <h2 className="text-lg font-semibold">Billing</h2>
          <p className="text-sm text-muted mt-0.5">Plan, payment method, and invoices.</p>
        </div>

        {isLoading ? (
          <>
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </>
        ) : (
          <>
            <section className="bg-background rounded-xl border border-border shadow-sm p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{plan?.name ?? 'Free'} plan</p>
                    <Badge className="bg-accent-light text-foreground border-0 rounded-full text-xs">
                      Current plan
                    </Badge>
                  </div>
                  {plan && (
                    <p className="text-sm text-muted mt-1">
                      {plan.credits.toLocaleString()} credits per cycle
                    </p>
                  )}
                  {subscription && (
                    <p className="text-sm text-muted mt-0.5">
                      {subscription.status === 'canceled'
                        ? `Your plan ends on ${formatDate(subscription.currentPeriodEnd)}.`
                        : `Your plan renews on ${formatDate(subscription.currentPeriodEnd)}.`}
                    </p>
                  )}
                </div>
                <Link
                  href="/dashboard/usage"
                  className="text-sm text-muted hover:text-foreground transition-colors shrink-0"
                >
                  View usage
                </Link>
              </div>
            </section>

            <section className="bg-background rounded-xl border border-border shadow-sm p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium">Payment</h3>
                  <p className="text-sm text-muted mt-1">No payment method on file.</p>
                </div>
                <Button size="sm" disabled className="rounded-full bg-accent-strong text-foreground shrink-0 disabled:opacity-50">
                  Coming soon
                </Button>
              </div>
            </section>

            <section className="bg-background rounded-xl border border-border shadow-sm p-6">
              <h3 className="font-medium">Invoices</h3>
              <p className="text-sm text-muted mt-1">No invoices yet.</p>
            </section>

            <PlansBlock currentSlug={plan?.slug} />
          </>
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
    <section className="bg-background rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-medium mb-4">Plans</h3>
      <div className="space-y-3">
        {plans.map((plan) => (
          <PlanRow key={plan.slug} plan={plan} isCurrent={plan.slug === currentSlug} />
        ))}
      </div>
    </section>
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
