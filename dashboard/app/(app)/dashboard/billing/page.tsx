// dashboard/app/(app)/dashboard/billing/page.tsx
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'

export default function BillingPage() {
  const MOCK_USED = 4200
  const MOCK_LIMIT = 10000
  const pct = Math.round((MOCK_USED / MOCK_LIMIT) * 100)

  return (
    <div className="h-full overflow-y-auto p-6">
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold">Billing</h2>
        <p className="text-sm text-muted mt-0.5">Your current plan and usage.</p>
      </div>

      <div className="bg-background rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold">Free plan</p>
            <p className="text-sm text-muted">$0 / month</p>
          </div>
          <Badge className="bg-accent-light text-foreground border-0 rounded-full">Current plan</Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Token usage</span>
            <span className="font-medium">{MOCK_USED.toLocaleString()} / {MOCK_LIMIT.toLocaleString()}</span>
          </div>
          <div className="h-2 rounded-full bg-background-section overflow-hidden">
            <div
              className="h-full bg-accent-strong rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted">{pct}% of monthly limit used</p>
        </div>
      </div>

      <div className="bg-background rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-medium mb-1">Upgrade to Pro</h3>
        <p className="text-sm text-muted mb-4">500,000 tokens/month, 5 API keys, priority processing. $19/mo.</p>
        <Button disabled className="rounded-full bg-accent-strong text-foreground opacity-50 cursor-not-allowed">
          Upgrade — coming soon
        </Button>
      </div>
    </div>
    </div>
  )
}
