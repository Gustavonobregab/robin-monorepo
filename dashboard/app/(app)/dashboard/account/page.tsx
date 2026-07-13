'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Copy, Check, UserRound } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Chip } from '@/app/components/ui/chip'
import { Surface } from '@/app/components/ui/surface'
import { Skeleton } from '@/app/components/ui/skeleton'
import { PageHeader } from '@/app/components/ui/page-header'
import { EmptyState } from '@/app/components/ui/empty-state'
import { signOut } from '@/app/lib/auth-client'
import { getProfile, updateProfile, updateWebhookConfig } from '@/app/http/users'
import { toastApiError } from '@/app/http/errors'

export default function AccountPage() {
  const router = useRouter()
  const { data, error, mutate } = useSWR('profile', getProfile)
  const profile = data?.data

  return (
    <div className="mx-auto max-w-2xl pt-8">
      <PageHeader title="Account" description="Your profile, webhooks and session." />

      <div className="space-y-6">
        {error ? (
          <Surface>
            <EmptyState
              icon={UserRound}
              title="Could not load your account."
              action={
                <Button variant="outline" size="sm" onClick={() => mutate()}>
                  Try again
                </Button>
              }
            />
          </Surface>
        ) : (
          <>
            <ProfileCard
              name={profile?.name ?? ''}
              email={profile?.email ?? ''}
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

        <Surface>
          <h2 className="text-base font-medium text-foreground">Session</h2>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">
            Sign out of the dashboard on this device.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await signOut()
              } catch {}
              router.push('/sign-in')
            }}
          >
            Sign out
          </Button>
        </Surface>
      </div>
    </div>
  )
}

function FieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-4 w-20" />
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
    <Surface>
      <h2 className="mb-5 text-base font-medium text-foreground">Profile</h2>

      {loading ? (
        <div className="space-y-4">
          <FieldSkeleton />
          <FieldSkeleton />
          <Skeleton className="h-10 w-32" />
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="account-name">Name</Label>
              <Input
                id="account-name"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-email">Email</Label>
              <Input id="account-email" value={email} disabled className="bg-muted" />
            </div>
          </div>

          <Button type="button" className="mt-5" disabled={!dirty || saving} onClick={save}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      )}
    </Surface>
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
    <Surface>
      <div className="flex items-center gap-2">
        <h2 className="text-base font-medium text-foreground">Webhooks</h2>
        {!enabled && !loading && (
          <Chip size="sm" variant="warning">
            Upgrade required
          </Chip>
        )}
      </div>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">
        We POST job results to this URL when a job completes or fails. Requests are signed with
        HMAC-SHA256.
      </p>

      {loading ? (
        <div className="space-y-4">
          <FieldSkeleton />
          <Skeleton className="h-10 w-32" />
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="webhook-url">Endpoint URL</Label>
            <Input
              id="webhook-url"
              type="url"
              value={value}
              disabled={!enabled}
              onChange={(e) => setValue(e.target.value)}
              placeholder="https://your-app.com/webhooks/robin"
            />
          </div>

          {secret && (
            <div className="mt-4 rounded-lg bg-muted p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Signing secret — copy it now, shown once
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={copySecret}
                >
                  {copied ? <Check /> : <Copy />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <code className="mt-1.5 block break-all font-mono text-sm text-foreground">
                {secret}
              </code>
            </div>
          )}

          <Button
            type="button"
            className="mt-5"
            disabled={!enabled || !dirty || saving}
            onClick={save}
          >
            {saving ? 'Saving…' : 'Save webhook'}
          </Button>
        </>
      )}
    </Surface>
  )
}
