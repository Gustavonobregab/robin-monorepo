'use client'
import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { PageHeader } from '@/app/components/ui/page-header'
import { Surface } from '@/app/components/ui/surface'
import { signIn } from '@/app/lib/auth-client'

function SignInForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard/home'
  const [loading, setLoading] = useState(false)

  async function handleGoogleSignIn() {
    setLoading(true)
    try {
      await signIn.social({
        provider: 'google',
        callbackURL: new URL(callbackUrl, window.location.origin).toString(),
      })
    } catch {
      toast.error('Could not sign in with Google. Try again.')
      setLoading(false)
    }
  }

  return (
    <Surface padding="lg">
      <PageHeader title="Sign in" description="Welcome back." className="mb-6" />
      <Button onClick={handleGoogleSignIn} className="w-full" disabled={loading}>
        {loading ? 'Redirecting...' : 'Continue with Google'}
      </Button>
    </Surface>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}
