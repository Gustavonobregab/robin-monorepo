'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from '@/app/lib/auth-client'
import { MessageSquare } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar'
import { useChat } from '@/app/components/layout/ChatContext'
import { cn } from '@/app/lib/utils'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard/home': 'Home',
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
  const { chatOpen, toggleChat } = useChat()
  const title = PAGE_TITLES[pathname] ?? 'Dashboard'
  const initials = session?.user?.name?.slice(0, 2).toUpperCase() ?? 'U'

  return (
    <header className="h-14 bg-background border-b border-border flex items-center justify-between px-10 flex-shrink-0">
      <div className="flex items-center min-w-0">
        <h1 className="font-semibold text-base truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleChat}
          aria-label={chatOpen ? 'Close chat' : 'Open chat'}
          className={cn(
            'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
            chatOpen
              ? 'bg-accent-light text-foreground'
              : 'text-muted hover:bg-background-section hover:text-foreground'
          )}
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        <Link
          href="/dashboard/account"
          aria-label="Account"
          className="focus:outline-none rounded-full"
        >
          <Avatar className="w-8 h-8 cursor-pointer">
            <AvatarFallback className="bg-accent-light text-foreground text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  )
}
