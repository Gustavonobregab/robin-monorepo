'use client'
import Link from 'next/link'
import useSWR from 'swr'
import { Check } from 'lucide-react'
import { Skeleton } from '@/app/components/ui/skeleton'
import { formatBytes } from '@/app/lib/utils'
import { getPublicPlans } from '@/app/http/plans'
import type { PublicPlan } from '@/types'

// prices may be absent on plans not created by the seed — treat as not sellable
function priceLabel(plan: PublicPlan): { value: string; suffix: string } {
  const { usd, brl } = plan.prices ?? {}

  if (usd !== undefined) return { value: usd === 0 ? '$0' : `$${usd}`, suffix: '/mo' }
  if (brl !== undefined) return { value: brl === 0 ? 'R$ 0' : `R$ ${brl}`, suffix: '/mo' }
  return { value: 'Coming soon', suffix: '' }
}

function isSellable(plan: PublicPlan): boolean {
  return plan.prices?.usd !== undefined || plan.prices?.brl !== undefined
}

function planFeatures(plan: PublicPlan): string[] {
  const { creditWeights: weights, features } = plan

  return [
    `${plan.credits.toLocaleString()} credits/month`,
    `${weights.text.credits} credit per ${formatBytes(weights.text.perUnitBytes, 0)} of text`,
    `${weights.audio.credits} credit per ${formatBytes(weights.audio.perUnitBytes, 0)} of audio`,
    `Files up to ${formatBytes(features.maxFileSize, 0)}`,
    `${features.maxApiKeys} API keys`,
    ...(features.webhooks ? ['Webhook notifications'] : []),
  ]
}

export function Pricing() {
  const { data, error } = useSWR('public-plans', getPublicPlans)
  const plans = data?.data ?? []

  return (
    <section id="pricing" className="py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <h2 className="text-2xl sm:text-3xl md:text-[2.75rem] font-medium leading-[1.15] tracking-tight text-center mb-4">
          Simple pricing, serious savings
        </h2>
        <p className="text-muted text-center mb-10 md:mb-16 text-base md:text-lg">
          Start free. Pay us a fraction of what you&apos;ll stop paying big tech.
        </p>

        {error ? (
          <p className="text-muted text-center text-sm">Pricing is unavailable right now.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {plans.length === 0
              ? Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-96 rounded-2xl" />
                ))
              : plans.map((plan) => {
                  const highlight = plan.slug === 'pro'
                  const sellable = isSellable(plan)
                  const price = priceLabel(plan)

                  return (
                    <div
                      key={plan.slug}
                      className={`rounded-2xl p-5 sm:p-7 border flex flex-col ${
                        highlight ? 'bg-accent-strong/10 border-accent-strong' : 'bg-background border-border'
                      }`}
                    >
                      <div className="mb-6 sm:mb-8">
                        <h3 className="font-semibold mb-1 text-muted">{plan.name}</h3>
                        <div className={`font-bold mb-1 ${price.suffix ? 'text-4xl' : 'text-2xl py-1.5'}`}>
                          {price.value}
                          {price.suffix && <span className="text-base font-normal text-muted">{price.suffix}</span>}
                        </div>
                        {plan.description && <p className="text-sm text-muted">{plan.description}</p>}
                      </div>

                      <ul className="space-y-3 mb-6 sm:mb-8 flex-1">
                        {planFeatures(plan).map((feature) => (
                          <li key={feature} className="flex items-start gap-2.5 text-sm">
                            <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-accent-strong" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {sellable ? (
                        <Link
                          href="/sign-in"
                          className="w-full block text-center py-2.5 rounded-full text-sm font-medium transition-colors bg-accent-strong text-foreground hover:bg-accent-light"
                        >
                          Start for free
                        </Link>
                      ) : (
                        <span className="w-full block text-center py-2.5 rounded-full text-sm font-medium bg-background-section text-muted cursor-default">
                          Coming soon
                        </span>
                      )}
                    </div>
                  )
                })}
          </div>
        )}
      </div>
    </section>
  )
}
