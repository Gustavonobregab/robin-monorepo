'use client'
import { Sidebar } from '@/app/components/layout/Sidebar'
import { Topbar } from '@/app/components/layout/Topbar'
import { ApiKeyBanner } from '@/app/components/layout/ApiKeyBanner'
import { ChatPanel } from '@/app/components/layout/ChatPanel'
import { ChatProvider, useChat } from '@/app/components/layout/ChatContext'
import { cn } from '@/app/lib/utils'

function AppShell({ children }: { children: React.ReactNode }) {
  const { chatOpen } = useChat()

  return (
    <div
      className={cn(
        'flex h-screen overflow-hidden transition-colors duration-300',
        chatOpen ? 'bg-foreground/9' : 'bg-background'
      )}
    >
      {/* Main app — compresses and gets rounded when chat is open */}
      <div
        className={cn(
          'flex flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out',
          chatOpen && 'm-4 rounded-3xl shadow-xl overflow-hidden'
        )}
      >
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar />
          <ApiKeyBanner />
          <main className="flex-1 overflow-hidden bg-background">
            {children}
          </main>
        </div>
      </div>

      {/* Chat panel — slides in from right */}
      <div
        className={cn(
          'shrink-0 overflow-hidden transition-all duration-300 ease-in-out',
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
      <AppShell>{children}</AppShell>
    </ChatProvider>
  )
}
