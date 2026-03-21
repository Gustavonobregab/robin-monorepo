'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/app/lib/utils'

const DEMO_TABS = ['Text Compression', 'Audio Processing', 'Image Optimization'] as const

export function Hero() {
  const [activeTab, setActiveTab] = useState<(typeof DEMO_TABS)[number]>('Text Compression')

  return (
    <section className="pt-12 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Header — stacks on mobile, side-by-side on md+ */}
        <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-start md:justify-between md:gap-16 md:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-[3.5rem] font-medium leading-[1.1] tracking-tight max-w-2xl">
            Compress data,{' '}
            <br />
            save money.
          </h1>
          <p className="text-base md:text-lg text-muted leading-relaxed max-w-sm md:pt-2">
            Every token you send to OpenAI or Anthropic gets billed. Robin compresses your data before it gets there, no AI, just algorithms, and quietly starts stealing back your budget.
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex items-center gap-3 mb-8 md:mb-16">
          <Button className="rounded-full bg-accent-strong text-foreground hover:bg-accent-light px-6" asChild>
            <Link href="/sign-up">Sign up</Link>
          </Button>
          <Button variant="outline" className="rounded-full px-6" asChild>
            <Link href="#pricing">View pricing</Link>
          </Button>
        </div>

        {/* Demo card */}
        <div className="bg-background-section rounded-2xl border border-border overflow-hidden">
          {/* Tabs — horizontal scroll on small screens */}
          <div className="flex items-center gap-1 px-4 sm:px-6 pt-4 sm:pt-5 overflow-x-auto no-scrollbar">
            {DEMO_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0',
                  activeTab === tab
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted hover:text-foreground'
                )}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    tab === 'Text Compression' && 'bg-accent-strong',
                    tab === 'Audio Processing' && 'bg-emerald-400',
                    tab === 'Image Optimization' && 'bg-blue-400'
                  )}
                />
                {tab}
              </button>
            ))}
          </div>

          {/* Demo content */}
          <div className="p-3 sm:p-4 md:p-6">
            <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
              {activeTab === 'Text Compression' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-border">
                  <div className="p-4 sm:p-6 space-y-3 border-b sm:border-b-0 border-border">
                    <div className="text-xs text-muted uppercase tracking-wider mb-4">Operations</div>
                    {['Trim whitespace', 'Remove stopwords', 'Minify', 'Summarize'].map((op, i) => (
                      <div
                        key={op}
                        className={cn(
                          'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm',
                          i === 0 && 'bg-background-section'
                        )}
                      >
                        <span>{op}</span>
                        <span className="text-muted text-xs">{['Active', 'Active', 'Active', 'Optional'][i]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="text-xs text-muted uppercase tracking-wider mb-4">Preview</div>
                    <div className="text-sm text-muted leading-relaxed">
                      <p className="mb-3">The quick brown fox jumps over the lazy dog. This is a sample text that would be compressed using Robin&apos;s text pipeline.</p>
                      <p className="text-foreground font-medium">Result: 42% smaller, 58% fewer tokens</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'Audio Processing' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-border">
                  <div className="p-4 sm:p-6 space-y-3 border-b sm:border-b-0 border-border">
                    <div className="text-xs text-muted uppercase tracking-wider mb-4">Pipeline</div>
                    {['Trim silence', 'Normalize', 'Compress dynamics', 'Speed up'].map((op, i) => (
                      <div
                        key={op}
                        className={cn(
                          'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm',
                          i === 0 && 'bg-background-section'
                        )}
                      >
                        <span>{op}</span>
                        <span className="text-muted text-xs">{['0.5', '-14 dB', '4:1', '1.25x'][i]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="text-xs text-muted uppercase tracking-wider mb-4">Output</div>
                    <div className="space-y-4">
                      <div className="h-12 bg-background-section rounded-lg flex items-center px-4 overflow-hidden">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 40 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-1 bg-foreground/30 rounded-full"
                              style={{ height: `${Math.random() * 24 + 8}px` }}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-foreground font-medium">Duration: 12:34 to 8:21 (34% shorter)</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'Image Optimization' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-border">
                  <div className="p-4 sm:p-6 border-b sm:border-b-0 border-border">
                    <div className="text-xs text-muted uppercase tracking-wider mb-4">Original</div>
                    <div className="aspect-video bg-background-section rounded-lg flex items-center justify-center">
                      <span className="text-muted text-sm">2.4 MB · 1920x1080</span>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="text-xs text-muted uppercase tracking-wider mb-4">Compressed</div>
                    <div className="aspect-video bg-accent-light/30 rounded-lg flex items-center justify-center">
                      <span className="text-muted text-sm">420 KB · 1920x1080</span>
                    </div>
                    <p className="text-sm text-foreground font-medium mt-3">82% smaller, same quality</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col gap-3 px-4 sm:px-6 pb-4 sm:pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1 bg-background rounded-full border border-border p-1 self-start">
              {['Text', 'Audio', 'Image'].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      label === 'Text' ? 'Text Compression' : label === 'Audio' ? 'Audio Processing' : 'Image Optimization'
                    )
                  }
                  className={cn(
                    'px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm transition-colors',
                    (label === 'Text' && activeTab === 'Text Compression') ||
                    (label === 'Audio' && activeTab === 'Audio Processing') ||
                    (label === 'Image' && activeTab === 'Image Optimization')
                      ? 'bg-accent-strong text-foreground'
                      : 'text-muted hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button className="rounded-full bg-accent-strong text-foreground hover:bg-accent-light self-start sm:self-auto" asChild>
              <Link href="/sign-up">Try it free</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
