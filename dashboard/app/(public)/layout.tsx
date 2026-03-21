import { Navbar } from '@/app/components/landing/Navbar'
import { Footer } from '@/app/components/landing/Footer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Navbar />
      <main className="flex-1">
        <div className="relative max-w-6xl mx-auto">
          {/* Vertical guide lines on left and right edges */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-border/60 hidden md:block" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-border/60 hidden md:block" />
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}
