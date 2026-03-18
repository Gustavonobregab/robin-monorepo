import { Sidebar } from '@/app/components/layout/Sidebar'
import { Topbar } from '@/app/components/layout/Topbar'
import { ApiKeyBanner } from '@/app/components/layout/ApiKeyBanner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <ApiKeyBanner />
        <main className="flex-1 overflow-hidden bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
