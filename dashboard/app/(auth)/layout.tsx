import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <Link href="/" className="font-semibold text-lg tracking-tight mb-8">
        Robin
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
