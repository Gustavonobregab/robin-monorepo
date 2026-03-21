'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Logo } from '@/app/components/layout/Logo'
import { cn } from '@/app/lib/utils'

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 h-12 flex items-center">
        <Link href="/" aria-label="Robin home" className="flex items-center shrink-0">
          <Logo size={20} />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-5 text-sm ml-5">
          <Link href="#features" className="text-muted hover:text-foreground transition-colors">Features</Link>
          <Link href="#platforms" className="text-muted hover:text-foreground transition-colors">Platforms</Link>
          <Link href="#pricing" className="text-muted hover:text-foreground transition-colors">Pricing</Link>
          <Link href="#" className="text-muted hover:text-foreground transition-colors">Docs</Link>
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-1 ml-auto">
          <Button variant="outline" size="sm" className="rounded-full" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button size="sm" className="rounded-full bg-accent-strong text-foreground hover:bg-accent-light" asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="md:hidden ml-auto p-1.5 text-foreground"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          'md:hidden overflow-hidden transition-all duration-200 bg-background',
          open ? 'max-h-64 border-b border-border' : 'max-h-0'
        )}
      >
        <div className="px-4 pb-4 pt-2 space-y-3">
          <Link href="#features" onClick={() => setOpen(false)} className="block text-sm text-muted hover:text-foreground">Features</Link>
          <Link href="#platforms" onClick={() => setOpen(false)} className="block text-sm text-muted hover:text-foreground">Platforms</Link>
          <Link href="#pricing" onClick={() => setOpen(false)} className="block text-sm text-muted hover:text-foreground">Pricing</Link>
          <Link href="#" onClick={() => setOpen(false)} className="block text-sm text-muted hover:text-foreground">Docs</Link>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="rounded-full flex-1" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button size="sm" className="rounded-full bg-accent-strong text-foreground hover:bg-accent-light flex-1" asChild>
              <Link href="/sign-up">Get started</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
