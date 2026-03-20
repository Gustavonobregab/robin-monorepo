'use client'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { signIn } from '@/app/lib/auth-client'

export default function SignInPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'
  const [loading, setLoading] = useState(false)

  async function handleGoogleSignIn() {
    setLoading(true)
    try {
      await signIn.social({
        provider: 'google',
        callbackURL: callbackUrl,
      })
    } catch {
      toast.error('Could not sign in with Google. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="bg-background rounded-xl shadow-sm border border-border p-8">
      <h1 className="text-xl font-semibold mb-1">Sign in</h1>
      <p className="text-sm text-muted mb-6">Welcome back.</p>
      <Button
        onClick={handleGoogleSignIn}
        className="w-full rounded-full bg-accent-strong text-foreground hover:bg-accent-light"
        disabled={loading}
      >
        {loading ? 'Redirecting…' : 'Continue with Google'}
      </Button>
    </div>
  )
}
