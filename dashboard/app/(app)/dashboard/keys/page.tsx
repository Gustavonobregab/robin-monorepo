// dashboard/app/(app)/dashboard/keys/page.tsx
'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Plus, Trash2, Copy, KeyRound } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Skeleton } from '@/app/components/ui/skeleton'
import { Chip } from '@/app/components/ui/chip'
import { Surface } from '@/app/components/ui/surface'
import { PageHeader } from '@/app/components/ui/page-header'
import { EmptyState } from '@/app/components/ui/empty-state'
import { DataTable, type Column } from '@/app/components/ui/data-table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/app/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog'
import { getApiKeys, createApiKey, revokeApiKey } from '@/app/http/keys'
import { toastApiError } from '@/app/http/errors'
import type { ApiResponse, ApiKey } from '@/types'

export default function KeysPage() {
  const { data, isLoading, error, mutate } = useSWR<ApiResponse<ApiKey[]>>('api-keys', getApiKeys)
  const keys = data?.data ?? []

  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)

  async function handleCreate() {
    if (!newKeyName.trim()) return
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

  const columns: Column<ApiKey>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (key) => <span className="font-medium text-foreground">{key.name}</span>,
    },
    {
      key: 'key',
      header: 'Key',
      cell: (key) => (
        <code className="font-mono text-sm text-muted-foreground">{key.keyPrefix}…</code>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (key) => (
        <Chip size="sm" variant={key.status === 'active' ? 'success' : 'default'}>
          {key.status}
        </Chip>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      cell: (key) => (
        <span className="text-sm text-muted-foreground">
          {new Date(key.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'lastUsedAt',
      header: 'Last used',
      /* "Never" is real information, not a placeholder — it says the key has
         never been used, which is not the same as unknown. */
      cell: (key) => (
        <span className="text-sm text-muted-foreground">
          {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (key) =>
        key.status === 'active' ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Revoke ${key.name}`}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke key?</AlertDialogTitle>
                <AlertDialogDescription>
                  Any apps using &quot;{key.name}&quot; will stop working immediately.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleRevoke(key._id)}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Revoke
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null,
    },
  ]

  return (
    <div className="mx-auto max-w-5xl pt-8">
      <PageHeader
        title="API Keys"
        description="Manage your API keys. Maximum 5 active keys."
        actions={
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) setNewKeyValue(null)
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus /> New key
              </Button>
            </DialogTrigger>
            <DialogContent>
              {newKeyValue ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Key created</DialogTitle>
                  </DialogHeader>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Copy this key now. It won&apos;t be shown again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 break-all rounded-md bg-muted px-3 py-2 font-mono text-sm text-foreground">
                      {newKeyValue}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Copy key"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(newKeyValue)
                          toast.success('Copied!')
                        } catch {
                          toast.error('Failed to copy')
                        }
                      }}
                    >
                      <Copy />
                    </Button>
                  </div>
                  <Button
                    className="mt-4 w-full"
                    onClick={() => {
                      setDialogOpen(false)
                      setNewKeyValue(null)
                    }}
                  >
                    Done
                  </Button>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Create API key</DialogTitle>
                  </DialogHeader>
                  <div className="mt-2 space-y-1.5">
                    <Label htmlFor="key-name">Name</Label>
                    <Input
                      id="key-name"
                      placeholder="e.g. Production"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      maxLength={50}
                    />
                  </div>
                  <Button
                    className="mt-4 w-full"
                    onClick={handleCreate}
                    disabled={creating || !newKeyName.trim()}
                  >
                    {creating ? 'Creating...' : 'Create key'}
                  </Button>
                </>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      {error ? (
        <Surface>
          <EmptyState
            icon={KeyRound}
            title="Could not load your API keys."
            action={
              <Button variant="outline" size="sm" onClick={() => mutate()}>
                Try again
              </Button>
            }
          />
        </Surface>
      ) : isLoading ? (
        <Surface padding="none" className="overflow-hidden">
          <div className="space-y-3 p-4">
            <Skeleton className="h-8 w-full" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Surface>
      ) : (
        <DataTable
          columns={columns}
          rows={keys}
          rowKey={(key) => key._id}
          empty={
            <EmptyState
              icon={KeyRound}
              title="No API keys yet."
              action={
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  Create your first key
                </Button>
              }
            />
          }
        />
      )}
    </div>
  )
}
