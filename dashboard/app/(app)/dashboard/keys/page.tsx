'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Plus, KeyRound, Copy, Check, Trash2, MoreHorizontal, Loader2 } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { Modal } from '@/app/components/ui/Modal'
import { RetryCard } from '@/app/components/ui/RetryCard'
import { ConfirmDialog } from '@/app/components/ui/ConfirmDialog'
import { Field, Input } from '@/app/components/ui/Field'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { PageHeader } from '@/app/components/ui/PageHeader'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/app/components/ui/DropdownMenu'
import { getApiKeys, createApiKey, revokeApiKey } from '@/app/http/keys'
import { toastApiError } from '@/app/http/errors'
import { formatDate } from '@/app/lib/utils'
import type { ApiResponse, ApiKey } from '@/types'

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    toast.error('Failed to copy')
    return false
  }
}

export default function KeysPage() {
  const { data, isLoading, error, mutate } = useSWR<ApiResponse<ApiKey[]>>('api-keys', getApiKeys)
  const keys = data?.data ?? []

  const [modalOpen, setModalOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [secretCopied, setSecretCopied] = useState(false)

  async function handleCreate() {
    if (!newKeyName.trim() || creating) return
    setCreating(true)
    try {
      const res = await createApiKey(newKeyName.trim())
      setNewKeyValue(res.data.key)
      setNewKeyName('')
      mutate()
    } catch (err) {
      await toastApiError(err, 'Failed to create key')
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id: string) {
    try {
      await revokeApiKey(id)
      toast.success('Key revoked')
      mutate()
    } catch (err) {
      await toastApiError(err, 'Failed to revoke key')
    }
  }

  function handleModalChange(open: boolean) {
    setModalOpen(open)
    if (!open) {
      setNewKeyValue(null)
      setNewKeyName('')
      setSecretCopied(false)
    }
  }

  async function handleCopySecret() {
    if (!newKeyValue) return
    if (await copyToClipboard(newKeyValue)) {
      setSecretCopied(true)
      setTimeout(() => setSecretCopied(false), 2000)
    }
  }

  return (
    <div>
      <PageHeader
        title="API keys"
        description="Authenticate requests to the public API. Maximum 5 active keys."
        actions={
          <Modal
            open={modalOpen}
            onOpenChange={handleModalChange}
            trigger={
              <Button>
                <Plus className="h-4 w-4" /> Create key
              </Button>
            }
            title={newKeyValue ? 'Key created' : 'Create API key'}
            description={
              newKeyValue ? undefined : 'Name the key after where it will be used.'
            }
          >
            {newKeyValue ? (
              <div>
                <div className="flex items-center gap-2 rounded-xl bg-black/[0.02] p-3">
                  <span className="min-w-0 flex-1 break-all text-sm text-foreground">
                    {newKeyValue}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Copy key"
                    onClick={handleCopySecret}
                  >
                    {secretCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  You won&apos;t see this key again. Store it somewhere safe.
                </p>
                <Button className="mt-5 w-full" onClick={() => handleModalChange(false)}>
                  Done
                </Button>
              </div>
            ) : (
              <form
                className="flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleCreate()
                }}
              >
                <Field label="Name">
                  <Input
                    autoFocus
                    placeholder="e.g. Production"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    maxLength={50}
                  />
                </Field>
                <Button type="submit" className="w-full" disabled={creating || !newKeyName.trim()}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />} Create key
                </Button>
              </form>
            )}
          </Modal>
        }
      />

      <div className="mt-8">
        {error ? (
          <RetryCard message="Could not load your API keys." onRetry={() => mutate()} />
        ) : isLoading ? (
          <div className="space-y-1">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : keys.length === 0 ? (
          <EmptyState
            icon={<KeyRound className="h-5 w-5" />}
            title="No API keys yet."
            hint="Create a key to start calling the API."
            action={<Button onClick={() => setModalOpen(true)}>Create key</Button>}
          />
        ) : (
          <div className="space-y-1">
            {keys.map((key) => (
              <div
                key={key._id}
                className="flex items-center gap-4 rounded-2xl px-4 py-3 transition-colors hover:bg-black/[0.04]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{key.name}</p>
                  {key.keyPrefix && (
                    <p className="text-[13px] text-muted-foreground">{key.keyPrefix}</p>
                  )}
                </div>
                {key.status === 'revoked' && (
                  <span className="shrink-0 text-[13px] text-muted-foreground">Revoked</span>
                )}
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-[13px] text-muted-foreground">
                    Created {formatDate(key.createdAt)}
                  </p>
                  {key.lastUsedAt && (
                    <p className="text-xs text-muted-foreground">
                      Last used {formatDate(key.lastUsedAt)}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Actions for ${key.name}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={async () => {
                        if (key.keyPrefix && (await copyToClipboard(key.keyPrefix)))
                          toast.success('Prefix copied')
                      }}
                    >
                      <Copy className="h-4 w-4" /> Copy prefix
                    </DropdownMenuItem>
                    {key.status === 'active' && (
                      <>
                        <DropdownMenuSeparator />
                        <ConfirmDialog
                          tone="destructive"
                          title="Revoke key?"
                          description={`Any apps using "${key.name}" will stop working immediately.`}
                          confirmLabel="Revoke"
                          icon={<Trash2 className="h-5 w-5" />}
                          onConfirm={() => handleRevoke(key._id)}
                          trigger={
                            <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="h-4 w-4" /> Revoke
                            </DropdownMenuItem>
                          }
                        />
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      <Card className="mt-8 p-5">
        <p className="text-sm font-medium text-foreground">Quick start</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Pass your key in the Authorization header on every /v1 request.
        </p>
        {/* Code snippet: the one permitted font-mono exception. */}
        <div className="mt-3 overflow-x-auto rounded-xl bg-black/[0.02] p-4">
          <pre className="font-mono text-[13px] leading-relaxed text-muted-foreground">
            {`curl https://api.robinzip.app/v1/upload \\
  -H "Authorization: Bearer sk_live_..." \\
  -d '{"filename": "episode.mp3", "size": 52428800}'`}
          </pre>
        </div>
      </Card>
    </div>
  )
}
