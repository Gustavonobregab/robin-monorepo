'use client'
import { useState } from 'react'
import { cn } from '@/app/lib/utils'
import { Button } from '@/app/components/ui/button'
import Link from 'next/link'

export function Showcase() {
  const [activeTab, setActiveTab] = useState<'stories' | 'usecases'>('stories')

  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <h2 className="text-2xl sm:text-3xl md:text-[2.75rem] font-medium leading-[1.15] tracking-tight text-center max-w-2xl mx-auto mb-8">
          Built by developers, for developers
        </h2>

        {/* Tab toggle */}
        <div className="flex justify-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-1 bg-background-section rounded-full p-1 border border-border">
            <button
              type="button"
              onClick={() => setActiveTab('stories')}
              className={cn(
                'px-4 sm:px-5 py-2 rounded-full text-sm font-medium transition-colors',
                activeTab === 'stories'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted hover:text-foreground'
              )}
            >
              Stories
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('usecases')}
              className={cn(
                'px-4 sm:px-5 py-2 rounded-full text-sm font-medium transition-colors',
                activeTab === 'usecases'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted hover:text-foreground'
              )}
            >
              Use Cases
            </button>
          </div>
        </div>

        {/* Grid — stacks on mobile, masonry on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-auto">
          <div className="md:row-span-2 rounded-2xl bg-accent-light/50 border border-border p-6 sm:p-8 flex flex-col justify-end min-h-[200px] md:min-h-[400px]">
            <p className="text-foreground font-medium leading-snug">How a startup cut their LLM costs by 40% with text compression</p>
          </div>

          <div className="rounded-2xl bg-background-section border border-border p-6 sm:p-8 flex flex-col justify-end min-h-[160px] md:min-h-[240px]">
            <p className="text-foreground font-medium leading-snug">Processing 10,000 podcast episodes with Robin&apos;s audio pipeline</p>
          </div>

          <div className="hidden md:block rounded-2xl bg-background-section border border-border p-6 min-h-[120px]" />

          <div className="md:col-span-2 rounded-2xl bg-background-section border border-border p-6 sm:p-8 flex flex-col justify-end min-h-[160px] md:min-h-[200px]">
            <p className="text-foreground font-medium leading-snug">Building a media optimization layer for a content platform</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-4 mt-6 bg-background rounded-2xl border border-border px-4 sm:px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2 shrink-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-background-section border-2 border-background"
                />
              ))}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Developer Community</p>
              <p className="text-xs text-muted truncate">Join thousands of developers compressing smarter</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-full self-start sm:self-auto shrink-0" asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
