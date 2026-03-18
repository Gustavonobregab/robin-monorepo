// dashboard/app/(app)/dashboard/account/page.tsx
'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Separator } from '@/app/components/ui/separator'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog'
import { useSession, authClient } from '@/app/lib/auth-client'

export default function AccountPage() {
  const { data: session } = useSession()
  const user = session?.user
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPw, setChangingPw] = useState(false)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setChangingPw(true)
    try {
      const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: false })
      if (error) {
        toast.error('Failed to change password')
        return
      }
      toast.success('Password updated')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      toast.error('Failed to change password')
    } finally {
      setChangingPw(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
    <div className="space-y-8 max-w-xl mx-auto">
      {/* Profile */}
      <div className="bg-background rounded-xl border border-border shadow-sm p-6">
        <h2 className="font-semibold mb-4">Profile</h2>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={user?.name ?? ''} disabled className="bg-background-section" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email ?? ''} disabled className="bg-background-section" />
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-background rounded-xl border border-border shadow-sm p-6">
        <h2 className="font-semibold mb-4">Change password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-pw">Current password</Label>
            <Input
              id="current-pw"
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pw">New password</Label>
            <Input
              id="new-pw"
              type="password"
              placeholder="Min. 8 characters"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw">Confirm password</Label>
            <Input
              id="confirm-pw"
              type="password"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
          </div>
          <Button
            type="submit"
            disabled={changingPw}
            className="rounded-full bg-accent-strong text-foreground hover:bg-accent-light"
          >
            {changingPw ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="bg-background rounded-xl border border-red-200 shadow-sm p-6">
        <h2 className="font-semibold mb-1 text-red-600">Danger zone</h2>
        <p className="text-sm text-muted mb-4">Permanently delete your account and all data.</p>
        <Separator className="mb-4" />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
              Delete account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete account?</AlertDialogTitle>
              <AlertDialogDescription>
                This action is not yet available. Contact support to delete your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction disabled className="opacity-50">
                Delete — coming soon
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
    </div>
  )
}
