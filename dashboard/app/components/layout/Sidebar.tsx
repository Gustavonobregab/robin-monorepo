'use client'
import { useState, useEffect } from 'react'
import {
  Home, LayoutDashboard, FileText, Music, Image as ImageIcon,
  Key, CreditCard, User, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { NavItem } from './NavItem'
import { Separator } from '@/app/components/ui/separator'
import { cn } from '@/app/lib/utils'

const STORAGE_KEY = 'robin_sidebar_collapsed'

const toolNav = [
  { href: '/dashboard/home', icon: Home, label: 'Home' },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/text', icon: FileText, label: 'Text' },
  { href: '/dashboard/audio', icon: Music, label: 'Audio' },
  { href: '/dashboard/image', icon: ImageIcon, label: 'Image' },
]

const settingsNav = [
  { href: '/dashboard/keys', icon: Key, label: 'API Keys' },
  { href: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
]

const accountNav = [
  { href: '/dashboard/account', icon: User, label: 'Account' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) setCollapsed(stored === 'true')
  }, [])

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem(STORAGE_KEY, String(!prev))
      return !prev
    })
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-background border-r border-border transition-all duration-200 flex-shrink-0',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className={cn('h-14 flex items-center border-b border-border px-4', collapsed && 'justify-center px-2')}>
        {collapsed ? (
          <span className="font-bold text-sm">R</span>
        ) : (
          <span className="font-semibold tracking-tight">Robin</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {toolNav.map((item) => (
          <NavItem key={item.href} {...item} collapsed={collapsed} />
        ))}
        <Separator className="my-2" />
        {settingsNav.map((item) => (
          <NavItem key={item.href} {...item} collapsed={collapsed} />
        ))}
        <Separator className="my-2" />
        {accountNav.map((item) => (
          <NavItem key={item.href} {...item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Toggle */}
      <div className="p-2 border-t border-border">
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted hover:bg-background-section hover:text-foreground transition-colors',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
