'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { ConfirmDialog } from '@/app/components/ui/ConfirmDialog'
import { Field, Input } from '@/app/components/ui/Field'
import { PageHeader } from '@/app/components/ui/PageHeader'
import { RetryCard } from '@/app/components/ui/RetryCard'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { signOut, useSession } from '@/app/lib/auth-client'
import { getProfile, updateProfile, updateWebhookConfig } from '@/app/http/users'
import { toastApiError } from '@/app/http/errors'

export default function AccountPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data, error, mutate } = useSWR('users/me', getProfile)
  const profile = data?.data

  const name = profile?.name ?? session?.user.name ?? ''
  const email = profile?.email ?? session?.user.email ?? ''

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Settings"
        description="Your profile, webhooks and session."
        className="mb-8"
      />

      <div className="space-y-6">
        {error ? (
          <RetryCard message="Could not load your account." onRetry={() => mutate()} />
        ) : (
          <>
            <ProfileCard
              name={name}
              email={email}
              loading={!profile}
              onSaved={() => mutate()}
            />
            <WebhookCard
              enabled={profile?.webhooksEnabled ?? false}
              currentUrl={profile?.webhookUrl ?? null}
              loading={!profile}
              onSaved={() => mutate()}
            />
          </>
        )}

        <SessionCard
          onSignOut={async () => {
            try {
              await signOut()
            } catch {}
            router.push('/sign-in')
          }}
        />

        <DangerZoneCard />
      </div>
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

function ProfileCard({
  name,
  email,
  loading,
  onSaved,
}: {
  name: string
  email: string
  loading: boolean
  onSaved: () => void
}) {
  const [value, setValue] = useState(name)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(name)
  }, [name])

  const dirty = value.trim() !== name && value.trim().length >= 2

  async function save() {
    setSaving(true)
    try {
      await updateProfile(value.trim())
      toast.success('Profile updated')
      onSaved()
    } catch (err) {
      await toastApiError(err, 'Could not update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-base font-medium text-foreground">Profile</h2>

      <div className="mt-5 flex items-center gap-4">
        {loading ? (
          <>
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-44" />
            </div>
          </>
        ) : (
          <>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-secondary text-base font-medium text-foreground">
              {name.trim().charAt(0).toUpperCase() || email.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              {name && (
                <p className="truncate text-sm font-medium text-foreground">{name}</p>
              )}
              {email && <p className="truncate text-[13px] text-muted-foreground">{email}</p>}
            </div>
          </>
        )}
      </div>

      <div className="mt-6 border-t border-border pt-5">
        {loading ? (
          <div className="space-y-4">
            <FieldSkeleton />
            <Skeleton className="h-9 w-28" />
          </div>
        ) : (
          <>
            <Field label="Display name">
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Your name"
              />
            </Field>
            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              disabled={!dirty || saving}
              onClick={save}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}

function WebhookCard({
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
        <h2 className="text-base font-medium text-foreground">Webhooks</h2>
        {!enabled && !loading && (
          <span className="rounded-full border border-black/10 px-2 py-0.5 text-xs text-muted-foreground">
            Upgrade required
          </span>
        )}
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground">
        We POST job results to this URL when a job completes or fails. Requests are signed with
        HMAC-SHA256.
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

function SessionCard({ onSignOut }: { onSignOut: () => void }) {
  return (
    <Card className="p-6">
      <h2 className="text-base font-medium text-foreground">Session</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Sign out of the dashboard on this device.
      </p>
      <Button type="button" variant="secondary" className="mt-4" onClick={onSignOut}>
        Sign out
      </Button>
    </Card>
  )
}

function DangerZoneCard() {
  return (
    <Card className="p-6">
      <h2 className="text-base font-medium text-foreground">Danger zone</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Permanently delete your account, API keys and job history.
      </p>
      <ConfirmDialog
        tone="destructive"
        title="Delete account?"
        description="This permanently removes your account, API keys and job history. This action cannot be undone."
        confirmLabel="Delete account"
        trigger={
          <Button type="button" variant="destructive" className="mt-4">
            Delete account
          </Button>
        }
        onConfirm={() => {
          toast.error('Account deletion is not available yet. Contact support to delete your account.')
        }}
      />
    </Card>
  )
}
