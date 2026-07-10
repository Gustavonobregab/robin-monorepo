'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { signOut } from '@/app/lib/auth-client'
import { getProfile, updateProfile, updateWebhookConfig } from '@/app/http/users'
import { toastApiError } from '@/app/http/errors'

export default function AccountPage() {
  const router = useRouter()
  const { data, error, mutate } = useSWR('profile', getProfile)
  const profile = data?.data

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="space-y-8 max-w-xl mx-auto">
        {error ? (
          <div className="bg-background rounded-xl border border-border shadow-sm p-8 text-center">
            <p className="text-muted text-sm">Could not load your account.</p>
            <button
              className="text-sm underline text-foreground mt-1"
              onClick={() => mutate()}
            >
              Try again
            </button>
          </div>
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

        <div className="bg-background rounded-xl border border-border shadow-sm p-6">
          <h2 className="font-semibold">Session</h2>
          <p className="text-sm text-muted mt-0.5 mb-4">Sign out of the dashboard on this device.</p>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={async () => {
              try {
                await signOut()
              } catch {}
              router.push('/sign-in')
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
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
    <div className="bg-background rounded-xl border border-border shadow-sm p-6">
      <h2 className="font-semibold mb-4">Profile</h2>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input
            value={value}
            disabled={loading}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={email} disabled className="bg-background-section" />
        </div>
      </div>
      <Button
        type="button"
        className="mt-4 rounded-full bg-accent-strong text-foreground hover:bg-accent-light"
        disabled={!dirty || saving}
        onClick={save}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </div>
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
    <div className="bg-background rounded-xl border border-border shadow-sm p-6">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">Webhooks</h2>
        {!enabled && !loading && (
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-background-section text-muted px-1.5 py-0.5 rounded-md">
            Upgrade required
          </span>
        )}
      </div>
      <p className="text-sm text-muted mt-0.5 mb-4">
        We POST job results to this URL when a job completes or fails. Requests are signed with HMAC-SHA256.
      </p>

      <div className="space-y-1.5">
        <Label>Endpoint URL</Label>
        <Input
          type="url"
          value={value}
          disabled={loading || !enabled}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://your-app.com/webhooks/robin"
        />
      </div>

      {secret && (
        <div className="mt-4 rounded-lg border border-border bg-background-section p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Signing secret — copy it now, shown once</span>
            <button
              type="button"
              onClick={copySecret}
              className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <code className="mt-1.5 block text-sm font-mono break-all">{secret}</code>
        </div>
      )}

      <Button
        type="button"
        className="mt-4 rounded-full bg-accent-strong text-foreground hover:bg-accent-light"
        disabled={!enabled || !dirty || saving}
        onClick={save}
      >
        {saving ? 'Saving…' : 'Save webhook'}
      </Button>
    </div>
  )
}
