'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/app/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface NavItemProps {
  href: string
  icon: LucideIcon
  label: string
  collapsed: boolean
  disabled?: boolean
  badge?: string
}

export function NavItem({ href, icon: Icon, label, collapsed, disabled, badge }: NavItemProps) {
  const pathname = usePathname()
  const isActive = !disabled && (pathname === href || (href !== '/dashboard' && pathname.startsWith(href)))

  if (disabled) {
    return (
      <span
        title={collapsed ? label : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted/50 cursor-not-allowed',
          collapsed && 'justify-center px-2'
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && (
          <>
            <span>{label}</span>
            {badge && (
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider bg-background-section text-muted px-1.5 py-0.5 rounded-md">
                {badge}
              </span>
            )}
          </>
        )}
      </span>
    )
  }

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
        isActive
          ? 'bg-accent-light text-foreground'
          : 'text-muted hover:bg-background-section hover:text-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}
