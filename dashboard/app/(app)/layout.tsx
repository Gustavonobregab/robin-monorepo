'use client'
import { Sidebar } from '@/app/components/layout/Sidebar'
import { Topbar } from '@/app/components/layout/Topbar'
import { ChatPanel } from '@/app/components/layout/ChatPanel'
import { ChatProvider, useChat } from '@/app/components/layout/ChatContext'
import { SidebarProvider, useSidebar } from '@/app/components/layout/SidebarContext'
import { cn } from '@/app/lib/utils'

function AppShell({ children }: { children: React.ReactNode }) {
  const { chatOpen } = useChat()
  const { mobileOpen, setMobileOpen } = useSidebar()

  return (
    <div
      className={cn(
        'flex h-screen overflow-hidden transition-colors duration-300',
        chatOpen ? 'bg-secondary' : 'bg-background'
      )}
    >
      {/* Mobile sidebar overlay + drawer */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-foreground/40 md:hidden transition-opacity duration-200',
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setMobileOpen(false)}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-200 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar />
      </aside>

      {/* Main app: compresses and gets rounded when chat is open */}
      <div
        className={cn(
          'flex flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out',
          chatOpen && 'md:m-4 md:rounded-3xl md:shadow-xl md:overflow-hidden'
        )}
      >
        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-background">
          <Topbar />
          <main className="relative flex-1 overflow-y-auto px-4 pb-12 sm:px-6 md:px-8">
            {children}
          </main>
        </div>
      </div>

      {/* Chat panel: slides in from right — hidden on mobile */}
      <div
        className={cn(
          'hidden md:block shrink-0 overflow-hidden transition-all duration-300 ease-in-out',
          chatOpen ? 'w-80 opacity-100' : 'w-0 opacity-0'
        )}
      >
        <ChatPanel />
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <SidebarProvider>
        <AppShell>{children}</AppShell>
      </SidebarProvider>
    </ChatProvider>
  )
}
