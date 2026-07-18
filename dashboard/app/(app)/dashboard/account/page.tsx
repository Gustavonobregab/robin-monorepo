'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { Field, Input } from '@/app/components/ui/Field'
import { PageHeader } from '@/app/components/ui/PageHeader'
import { RetryCard } from '@/app/components/ui/RetryCard'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { useSession } from '@/app/lib/auth-client'
import { getProfile, updateProfile } from '@/app/http/users'
import { toastApiError } from '@/app/http/errors'

export default function AccountPage() {
  const { data: session } = useSession()
  const { data, error, mutate } = useSWR('users/me', getProfile)
  const profile = data?.data

  const name = profile?.name ?? session?.user.name ?? ''
  const email = profile?.email ?? session?.user.email ?? ''

  return (
    <div>
      <PageHeader title="Settings" description="Your profile." className="mb-8" />

      {error ? (
        <RetryCard message="Could not load your account." onRetry={() => mutate()} />
      ) : (
        <ProfileCard name={name} email={email} loading={!profile} onSaved={() => mutate()} />
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

