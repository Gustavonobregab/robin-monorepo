// dashboard/app/(app)/dashboard/keys/page.tsx
'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Plus, Trash2, Copy } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Skeleton } from '@/app/components/ui/skeleton'
import { Badge } from '@/app/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/app/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'
import { getApiKeys, createApiKey, revokeApiKey } from '@/app/http/keys'
import { maskKey } from '@/app/lib/utils'
import type { ApiResponse, ApiKey } from '@/types'

export default function KeysPage() {
  const { data, isLoading, mutate } = useSWR<ApiResponse<ApiKey[]>>('api-keys', getApiKeys)
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
    } catch {
      toast.error('Failed to create key')
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id: string) {
    try {
      await revokeApiKey(id)
      toast.success('Key revoked')
      mutate()
    } catch {
      toast.error('Failed to revoke key')
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-muted mt-0.5">Manage your API keys. Maximum 5 active keys.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setNewKeyValue(null) }}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full bg-accent-strong text-foreground hover:bg-accent-light">
              <Plus className="w-4 h-4 mr-1" /> New key
            </Button>
          </DialogTrigger>
          <DialogContent>
            {newKeyValue ? (
              <>
                <DialogHeader>
                  <DialogTitle>Key created</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted mb-3">
                  Copy this key now. It won&apos;t be shown again.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background-section rounded-xl px-3 py-2 text-sm font-mono break-all">
                    {newKeyValue}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(newKeyValue)
                        toast.success('Copied!')
                      } catch {
                        toast.error('Failed to copy')
                      }
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  className="mt-4 w-full rounded-full bg-accent-strong text-foreground"
                  onClick={() => { setDialogOpen(false); setNewKeyValue(null) }}
                >
                  Done
                </Button>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Create API key</DialogTitle>
                </DialogHeader>
                <div className="space-y-1.5 mt-2">
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
                  className="mt-4 w-full rounded-full bg-accent-strong text-foreground hover:bg-accent-light"
                  onClick={handleCreate}
                  disabled={creating || !newKeyName.trim()}
                >
                  {creating ? 'Creating…' : 'Create key'}
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
        </div>
      ) : keys.length === 0 ? (
        <div className="bg-background rounded-xl border border-border shadow-sm p-8 text-center">
          <p className="text-muted text-sm">No API keys yet.</p>
          <button
            className="text-sm underline text-foreground mt-1"
            onClick={() => setDialogOpen(true)}
          >
            Create your first key
          </button>
        </div>
      ) : (
        <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key._id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>
                    <code className="text-sm font-mono text-muted">{maskKey(key.key)}</code>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs border-0 rounded-full ${
                      key.status === 'active'
                        ? 'bg-accent-light text-foreground'
                        : 'bg-background-section text-muted'
                    }`}>
                      {key.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted text-sm">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-muted text-sm">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>
                    {key.status === 'active' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke key?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Any apps using "{key.name}" will stop working immediately.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRevoke(key._id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Revoke
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
