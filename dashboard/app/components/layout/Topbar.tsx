'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from '@/app/lib/auth-client'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/text': 'Text',
  '/dashboard/audio': 'Audio',
  '/dashboard/image': 'Image',
  '/dashboard/keys': 'API Keys',
  '/dashboard/billing': 'Billing',
  '/dashboard/account': 'Account',
}

export function Topbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const router = useRouter()
  const title = PAGE_TITLES[pathname] ?? 'Dashboard'
  const initials = session?.user?.name?.slice(0, 2).toUpperCase() ?? 'U'

  return (
    <header className="h-14 bg-background border-b border-border flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="font-semibold text-base">{title}</h1>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="focus:outline-none">
            <Avatar className="w-8 h-8 cursor-pointer">
              <AvatarFallback className="bg-accent-light text-foreground text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => router.push('/dashboard/account')}>
            Account
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              try {
                await signOut()
              } catch {
                // sign-out failure is non-critical; redirect anyway
              }
              router.push('/sign-in')
            }}
            className="text-red-600"
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
