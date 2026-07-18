'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  AudioLines,
  Home,
  FileText,
  Mic,
  ImageIcon,
  History,
  BarChart3,
  CreditCard,
  KeyRound,
  Settings,
  PanelLeft,
  Sparkles,
  BookOpen,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { AssistantPanel } from '@/app/components/assistant/AssistantPanel'
import { useSession } from '@/app/lib/auth-client'

const DOCS_URL = 'https://docs.robinzip.app'

type NavItem = { label: string; href: string; icon: LucideIcon; external?: boolean }
type NavGroup = { label?: string; items: NavItem[] }

const NAV: NavGroup[] = [
  {
    items: [{ label: 'Home', href: '/dashboard/home', icon: Home }],
  },
  {
    label: 'Compress',
    items: [
      { label: 'Text', href: '/dashboard/text', icon: FileText },
      { label: 'Audio', href: '/dashboard/audio', icon: Mic },
      { label: 'Image', href: '/dashboard/image', icon: ImageIcon },
    ],
  },
  {
    label: 'Activity',
    items: [
      { label: 'History', href: '/dashboard/history', icon: History },
      { label: 'Usage', href: '/dashboard/usage', icon: BarChart3 },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Billing', href: '/dashboard/billing', icon: CreditCard },
      { label: 'API Keys', href: '/dashboard/keys', icon: KeyRound },
      { label: 'Settings', href: '/dashboard/account', icon: Settings },
    ],
  },
  {
    items: [{ label: 'Docs', href: DOCS_URL, icon: BookOpen, external: true }],
  },
]

/* Label that fades + slides in when the sidebar expands. */
const revealClass =
  'whitespace-nowrap opacity-0 -translate-x-1 transition-all duration-150 group-aria-expanded/sidebar:opacity-100 group-aria-expanded/sidebar:translate-x-0'

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const { icon: Icon, label, href, external } = item
  return (
    <Link
      href={href}
      title={label}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={`flex h-9 items-center gap-3 rounded-lg px-[0.7rem] text-sm transition-colors ${
        active
          ? 'bg-secondary font-medium text-foreground'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
      }`}
    >
      <Icon className={`h-[1.05rem] w-[1.05rem] shrink-0 ${active ? 'text-primary' : ''}`} />
      <span className={revealClass}>{label}</span>
    </Link>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [pinned, setPinned] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const open = pinned || hovered
  const user = session?.user

  return (
    <div className="min-h-screen bg-background">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}
      <aside
        aria-expanded={open || mobileOpen}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`group/sidebar fixed left-0 top-0 z-40 flex h-screen w-64 flex-col overflow-hidden border-r border-border bg-sidebar transition-[width,transform] duration-200 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 ${open ? 'md:w-64' : 'md:w-[4.5rem]'}`}
      >
        {/* Brand + collapse toggle */}
        <div className="flex h-[3.75rem] items-center gap-3 px-[0.9rem]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <AudioLines className="h-[1.05rem] w-[1.05rem]" />
          </div>
          <div className="flex-1" />
          <button
            onClick={() => {
              setPinned((v) => !v)
              setHovered(false)
            }}
            title={pinned ? 'Collapse' : 'Expand'}
            className={`hidden h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:grid ${revealClass}`}
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav
          className="flex-1 space-y-5 overflow-y-auto px-3 py-2 no-scrollbar"
          onClick={() => setMobileOpen(false)}
        >
          {NAV.map((group, gi) => (
            <div key={gi} className="space-y-1">
              {group.label && (
                <p
                  className={`h-4 px-[0.7rem] text-[11px] font-medium text-muted-foreground/70 ${revealClass}`}
                >
                  {group.label}
                </p>
              )}
              {group.items.map((item) => (
                <NavRow
                  key={item.href}
                  item={item}
                  active={pathname === item.href || pathname.startsWith(item.href + '/')}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* User card */}
        <div className="border-t border-border p-3">
          <div className="flex h-11 items-center gap-3 rounded-lg px-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-sm font-medium text-foreground">
              {(user?.name ?? user?.email)?.[0]?.toUpperCase()}
            </div>
            <div className={`flex min-w-0 flex-1 flex-col ${revealClass}`}>
              {user?.name && (
                <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
              )}
              {user?.email && (
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              title="Assistant"
              onClick={() => setAssistantOpen(true)}
              className={`shrink-0 ${revealClass}`}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />

      {/* Content */}
      <div
        className={`transition-[padding] duration-200 ease-out ${
          pinned ? 'md:pl-64' : 'md:pl-[4.5rem]'
        }`}
      >
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            title="Menu"
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <AudioLines className="h-4 w-4" />
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:px-10">{children}</main>
      </div>
    </div>
  )
}
