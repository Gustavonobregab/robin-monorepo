import Link from 'next/link'
import { Check } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'For the curious thief',
    features: ['10,000 tokens/month', '1 API key', 'Text + Audio compression', 'Community support'],
    cta: 'Start for free',
    href: '/sign-up',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$19',
    description: 'For teams serious about saving',
    features: ['500,000 tokens/month', '5 API keys', 'Text + Audio + Image', 'Priority processing', 'Webhook notifications'],
    cta: 'Get Pro',
    href: '/sign-up',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large-scale operations',
    features: ['Unlimited tokens', 'Unlimited API keys', 'Dedicated support', 'SLA & uptime guarantee', 'Custom integrations'],
    cta: 'Contact us',
    href: '/sign-up',
    highlight: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="py-16">
      <div className="max-w-6xl mx-auto px-8">
        <h2 className="text-[2.75rem] font-medium leading-[1.15] tracking-tight text-center mb-4">
          Simple pricing, serious savings
        </h2>
        <p className="text-muted text-center mb-16 text-lg">Start free. Pay us a fraction of what you'll stop paying big tech.</p>

        <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-7 border flex flex-col ${
                plan.highlight
                  ? 'bg-accent-strong/10 border-accent-strong'
                  : 'bg-background border-border'
              }`}
            >
              <div className="mb-8">
                <h3 className={`font-semibold mb-1 ${plan.highlight ? 'text-muted' : 'text-muted'}`}>
                  {plan.name}
                </h3>
                <div className="text-4xl font-bold mb-1">
                  {plan.price}
                  <span className={`text-base font-normal ${'text-muted'}`}>
                    {plan.price !== 'Custom' ? '/mo' : ''}
                  </span>
                </div>
                <p className={`text-sm ${'text-muted'}`}>
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlight ? 'text-background/50' : 'text-accent-strong'}`} />
                    <span className={''}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`w-full block text-center py-2.5 rounded-full text-sm font-medium transition-colors ${
                  plan.highlight
                    ? 'bg-accent-strong text-foreground hover:bg-accent-light'
                    : 'bg-accent-strong text-foreground hover:bg-accent-light'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
