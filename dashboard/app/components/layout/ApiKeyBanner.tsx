'use client'
import Link from 'next/link'
import { useApiKey } from '@/app/hooks/use-api-key'
import { usePathname } from 'next/navigation'

export function ApiKeyBanner() {
  const { hasKey } = useApiKey()
  const pathname = usePathname()

  if (hasKey || pathname === '/dashboard/keys') return null

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
      <Link
        href="/dashboard/keys"
        className="inline-flex items-center gap-1.5 bg-accent-light/80 backdrop-blur-sm text-foreground text-xs font-medium px-4 py-1.5 rounded-full shadow-sm hover:bg-accent-light transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-accent-strong animate-pulse" />
        Beta
      </Link>
    </div>
  )
}
