'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { Field, Input } from '@/app/components/ui/Field'
import { PageHeader } from '@/app/components/ui/PageHeader'
import { RetryCard } from '@/app/components/ui/RetryCard'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { getProfile, updateWebhookConfig } from '@/app/http/users'
import { toastApiError } from '@/app/http/errors'

const DOCS_URL = 'https://docs.robinzip.app'

export default function WebhooksPage() {
  const { data, error, mutate } = useSWR('users/me', getProfile)
  const profile = data?.data

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Get a signed POST when a job completes or fails."
        className="mb-8"
      />

      {error ? (
        <RetryCard message="Could not load your webhook settings." onRetry={() => mutate()} />
      ) : (
        <div className="space-y-6">
          <EndpointCard
            enabled={profile?.webhooksEnabled ?? false}
            currentUrl={profile?.webhookUrl ?? null}
            loading={!profile}
            onSaved={() => mutate()}
          />
          <SigningCard />
        </div>
      )}
    </div>
  )
}

function FieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

function EndpointCard({
  enabled,
  currentUrl,
  loading,
  onSaved,
}: {
  enabled: boolean
  currentUrl: string | null
  loading: boolean
  onSaved: () => void
}) {
  const [value, setValue] = useState(currentUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setValue(currentUrl ?? '')
  }, [currentUrl])

  const dirty = value.trim() !== (currentUrl ?? '') && value.trim().length > 0

  async function save() {
    setSaving(true)
    try {
      const { data } = await updateWebhookConfig(value.trim())
      setSecret(data.webhookSecret)
      toast.success('Webhook saved')
      onSaved()
    } catch (err) {
      await toastApiError(err, 'Could not save webhook. Check the URL and try again.')
    } finally {
      setSaving(false)
    }
  }

  function copySecret() {
    if (!secret) return
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-medium text-foreground">Endpoint</h2>
        {!enabled && !loading && (
          <span className="rounded-full border border-black/10 px-2 py-0.5 text-xs text-muted-foreground">
            Upgrade required
          </span>
        )}
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground">
        We POST job results to this URL when a job completes or fails.
      </p>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-4">
            <FieldSkeleton />
            <Skeleton className="h-9 w-32" />
          </div>
        ) : (
          <>
            <Field label="Endpoint URL">
              <Input
                type="url"
                value={value}
                disabled={!enabled}
                onChange={(e) => setValue(e.target.value)}
                placeholder="https://your-app.com/webhooks/robin"
              />
            </Field>

            {secret && (
              <div className="mt-4 rounded-xl bg-black/[0.02] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Signing secret. Copy it now, shown once
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={copySecret}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <p className="mt-1.5 break-all text-[13px] text-foreground">{secret}</p>
              </div>
            )}

            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              disabled={!enabled || !dirty || saving}
              onClick={save}
            >
              {saving ? 'Saving…' : 'Save webhook'}
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}

function SigningCard() {
  return (
    <Card className="p-6">
      <h2 className="text-base font-medium text-foreground">Verify signatures</h2>
      <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-muted-foreground">
        Every delivery carries an x-robin-signature header, the HMAC-SHA256 of the raw body keyed
        with your signing secret. Recompute it on your side and reject anything that does not
        match.
      </p>
      <Button variant="secondary" className="mt-4" asChild>
        <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
          Read the docs
        </a>
      </Button>
    </Card>
  )
}
