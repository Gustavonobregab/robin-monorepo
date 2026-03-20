// dashboard/app/(app)/dashboard/account/page.tsx
'use client'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Separator } from '@/app/components/ui/separator'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog'
import { useSession, signOut } from '@/app/lib/auth-client'

export default function AccountPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user

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
        <Button
          type="button"
          variant="outline"
          className="mt-4 rounded-full"
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
