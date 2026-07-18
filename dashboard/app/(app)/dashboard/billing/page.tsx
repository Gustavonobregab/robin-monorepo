'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { ArrowUpRight, Check, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { ConfirmDialog } from '@/app/components/ui/ConfirmDialog'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { PageHeader } from '@/app/components/ui/PageHeader'
import { Progress } from '@/app/components/ui/Progress'
import { RetryCard } from '@/app/components/ui/RetryCard'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { useEffect, useState } from 'react'
import { SegmentedControl } from '@/app/components/ui/SegmentedControl'
import { cancelSubscription, createCheckout } from '@/app/http/billing'
import { toastApiError } from '@/app/http/errors'
import { getProfile } from '@/app/http/users'
import { getPublicPlans } from '@/app/http/plans'
import { formatBytes, formatDate } from '@/app/lib/utils'
import type { ApiResponse, PublicPlan, UserProfile } from '@/types'

type Currency = 'usd' | 'brl'

/* Currency picks the payment gateway: USD → Stripe, BRL → AbacatePay. */
const CURRENCY_GATEWAY: Record<Currency, 'stripe' | 'abacatepay'> = {
  usd: 'stripe',
  brl: 'abacatepay',
}

const isSellable = (plan: PublicPlan, currency: Currency) =>
  plan.prices[currency] !== undefined && plan.prices[currency]! > 0

async function startCheckout(planSlug: string, currency: Currency) {
  try {
    const res = await createCheckout(planSlug, CURRENCY_GATEWAY[currency])
    window.location.href = res.data.url
  } catch (err) {
    toastApiError(err, "Couldn't start checkout. Try again.")
  }
}

function planPrice(plan: PublicPlan, currency: Currency): string | null {
  const value = plan.prices[currency]
  if (value === undefined) return null
  return currency === 'usd' ? `$${value}` : `R$${value}`
}

export default function BillingPage() {
  const {
    data: profileData,
    error: profileError,
    isLoading: profileLoading,
    mutate: mutateProfile,
  } = useSWR<ApiResponse<UserProfile>>('users/me', getProfile)

  const {
    data: plansData,
    error: plansError,
    isLoading: plansLoading,
    mutate: mutatePlans,
  } = useSWR('plans/public', getPublicPlans)

  const profile = profileData?.data
  const plan = profile?.plan
  const subscription = profile?.subscription
  const plans = plansData?.data ?? []
  const currentPublicPlan = plans.find((p) => p.slug === plan?.slug)

  const [currency, setCurrency] = useState<Currency>('usd')

  const sellableOthers = plans.filter((p) => p.slug !== plan?.slug && isSellable(p, currency))
  const recommended =
    sellableOthers
      .filter((p) => p.credits > (plan?.credits ?? 0))
      .sort((a, b) => a.credits - b.credits)[0] ?? sellableOthers[0]

  const onPaidPlan = Boolean(
    currentPublicPlan &&
      (isSellable(currentPublicPlan, 'usd') || isSellable(currentPublicPlan, 'brl')),
  )

  // Post-checkout landing: Stripe redirects back with ?checkout=success|canceled
  useEffect(() => {
    const outcome = new URLSearchParams(window.location.search).get('checkout')
    if (!outcome) return
    window.history.replaceState(null, '', window.location.pathname)
    if (outcome === 'success') {
      toast.success('Payment confirmed. Your plan is being activated.')
      mutateProfile()
    } else {
      toast.info('Checkout canceled.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCancel() {
    try {
      await cancelSubscription()
      toast.success('Subscription canceled. Your plan runs until the end of the cycle.')
      mutateProfile()
    } catch (err) {
      toastApiError(err, "Couldn't cancel the subscription. Try again.")
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Billing"
        description="Manage your plan and invoices."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard/usage">View usage</Link>
          </Button>
        }
      />

      {/* Current plan */}
      {profileLoading ? (
        <Skeleton className="h-44 rounded-2xl" />
      ) : profileError ? (
        <RetryCard
          message="Couldn't load your billing details."
          onRetry={() => mutateProfile()}
        />
      ) : (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-medium text-foreground">
                  {plan?.name ?? 'Free'} plan
                </p>
                <CurrentTag />
              </div>
              {currentPublicPlan && planPrice(currentPublicPlan, currency) && (
                <p className="mt-2 text-2xl font-medium tabular-nums tracking-tight text-foreground">
                  {planPrice(currentPublicPlan, currency)}
                  <span className="ml-1 text-[13px] font-normal tracking-normal text-muted-foreground">
                    / month
                  </span>
                </p>
              )}
              {plan && (
                <p className="mt-1.5 text-sm text-muted-foreground">
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
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {onPaidPlan && subscription?.status !== 'canceled' && (
                <ConfirmDialog
                  tone="destructive"
                  title="Cancel your subscription?"
                  description="Your plan and credits stay active until the end of the current cycle, then you move to the Free plan."
                  confirmLabel="Cancel subscription"
                  onConfirm={handleCancel}
                  trigger={
                    <Button variant="ghost" className="text-muted-foreground">
                      Cancel
                    </Button>
                  }
                />
              )}
              {recommended && (
                <Button asChild>
                  <a href="#plans">
                    Upgrade plan
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
          {subscription && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">Credits used</span>
                <span className="tabular-nums text-foreground">
                  {subscription.credits.used.toLocaleString()} /{' '}
                  {subscription.credits.limit.toLocaleString()}
                </span>
              </div>
              <Progress
                value={subscription.credits.used}
                max={subscription.credits.limit || 1}
              />
            </div>
          )}
        </Card>
      )}

      {/* Plans */}
      <section id="plans" className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Plans</p>
          <SegmentedControl<Currency>
            value={currency}
            onChange={setCurrency}
            options={[
              { value: 'usd', label: 'USD' },
              { value: 'brl', label: 'BRL · Pix' },
            ]}
          />
        </div>
        {plansLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-60 rounded-2xl" />
            <Skeleton className="h-60 rounded-2xl" />
            <Skeleton className="h-60 rounded-2xl" />
          </div>
        ) : plansError ? (
          <RetryCard message="Couldn't load the plans." onRetry={() => mutatePlans()} />
        ) : plans.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <PlanCard
                key={p.slug}
                plan={p}
                currency={currency}
                isCurrent={p.slug === plan?.slug}
                isRecommended={p.slug === recommended?.slug}
                currentCredits={plan?.credits ?? 0}
              />
            ))}
          </div>
        ) : null}
      </section>

      {/* Invoices */}
      <section className="space-y-3">
        <p className="text-sm font-medium text-foreground">Invoices</p>
        <Card>
          <EmptyState
            icon={<FileText className="h-5 w-5" />}
            title="No invoices yet"
            hint="Receipts will show up here once you're on a paid plan."
          />
        </Card>
      </section>
    </div>
  )
}

function PlanCard({
  plan,
  currency,
  isCurrent,
  isRecommended,
  currentCredits,
}: {
  plan: PublicPlan
  currency: Currency
  isCurrent: boolean
  isRecommended: boolean
  currentCredits: number
}) {
  const price = planPrice(plan, currency)
  const sellable = isSellable(plan, currency)
  const switchLabel = plan.credits > currentCredits ? 'Upgrade' : 'Switch plan'

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-foreground">{plan.name}</p>
        {isCurrent && <CurrentTag />}
      </div>
      {price && (
        <p className="mt-3 text-3xl font-medium tabular-nums tracking-tight text-foreground">
          {price}
          <span className="ml-1 text-[13px] font-normal tracking-normal text-muted-foreground">
            / month
          </span>
        </p>
      )}
      <ul className="mt-4 space-y-1.5">
        <FeatureRow>{plan.credits.toLocaleString()} credits per month</FeatureRow>
        <FeatureRow>Files up to {formatBytes(plan.features.maxFileSize)}</FeatureRow>
        <FeatureRow>
          {plan.features.maxApiKeys} API {plan.features.maxApiKeys === 1 ? 'key' : 'keys'}
        </FeatureRow>
        {plan.features.webhooks && <FeatureRow>Webhooks</FeatureRow>}
      </ul>
      <div className="mt-auto pt-5">
        {isCurrent ? null : sellable ? (
          <ConfirmDialog
            tone="primary"
            icon={<ArrowUpRight className="h-[1.05rem] w-[1.05rem]" />}
            title={`Switch to the ${plan.name} plan?`}
            description={`${plan.credits.toLocaleString()} credits per month${price ? ` for ${price}/month` : ''}. Your current subscription ends now and the new plan starts as soon as payment completes.`}
            confirmLabel={switchLabel}
            onConfirm={() => startCheckout(plan.slug, currency)}
            trigger={
              <Button
                variant={isRecommended ? 'primary' : 'secondary'}
                className="w-full"
              >
                {switchLabel}
              </Button>
            }
          />
        ) : (
          <Button variant="secondary" className="w-full" disabled>
            Coming soon
          </Button>
        )}
      </div>
    </Card>
  )
}

function FeatureRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-[13px] text-muted-foreground">
      <Check className="h-3.5 w-3.5 shrink-0" />
      {children}
    </li>
  )
}

function CurrentTag() {
  return (
    <span className="rounded-full border border-black/10 px-2 py-px text-[11px] font-medium text-muted-foreground">
      Current
    </span>
  )
}
