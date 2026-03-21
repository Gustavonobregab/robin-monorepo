'use client'
import { useState } from 'react'
import { cn } from '@/app/lib/utils'

export function HowItWorks() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'api'>('dashboard')

  return (
    <section id="platforms" className="py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <h2 className="text-2xl sm:text-3xl md:text-[2.75rem] font-medium leading-[1.15] tracking-tight text-center max-w-2xl mx-auto mb-6">
          Two ways to use Robin, same powerful engine
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-16 max-w-3xl mx-auto mb-12">
          <div>
            <h3 className="font-semibold mb-1">Dashboard</h3>
            <p className="text-sm text-muted leading-relaxed">
              Upload files and configure operations visually. Perfect for one-off jobs and watching the savings stack up.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">API</h3>
            <p className="text-sm text-muted leading-relaxed">
              Plug Robin into your pipeline. SDKs for Node, Python, and more. A noticeably smaller cloud bill included.
            </p>
          </div>
        </div>

        {/* Tab toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-1 bg-background-section rounded-full p-1 border border-border">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                'px-5 py-2 rounded-full text-sm font-medium transition-colors',
                activeTab === 'dashboard'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted hover:text-foreground'
              )}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('api')}
              className={cn(
                'px-5 py-2 rounded-full text-sm font-medium transition-colors',
                activeTab === 'api'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted hover:text-foreground'
              )}
            >
              API
            </button>
          </div>
        </div>

        {/* Mock screenshot */}
        <div className="bg-background-section rounded-2xl border border-border overflow-hidden">
          {activeTab === 'dashboard' ? (
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_280px] h-auto md:h-[480px]">
              {/* Mock sidebar — hidden on mobile */}
              <div className="hidden md:block border-r border-border p-4 space-y-1">
                <div className="text-sm font-semibold mb-4 px-2">Robin</div>
                {['Home', 'Dashboard', 'Text', 'Audio', 'Image'].map((item, i) => (
                  <div
                    key={item}
                    className={cn(
                      'px-3 py-2 rounded-lg text-xs',
                      i === 3 ? 'bg-accent-light text-foreground font-medium' : 'text-muted'
                    )}
                  >
                    {item}
                  </div>
                ))}
                <div className="border-t border-border my-3" />
                {['API Keys', 'Billing', 'Account'].map((item) => (
                  <div key={item} className="px-3 py-2 rounded-lg text-xs text-muted">
                    {item}
                  </div>
                ))}
              </div>

              {/* Mock center */}
              <div className="p-4 sm:p-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-md space-y-3">
                  <div className="bg-background rounded-xl border border-border p-4 shadow-sm">
                    <div className="text-xs text-muted mb-2">Audio file URL</div>
                    <div className="h-8 bg-background-section rounded-lg flex items-center px-3 text-xs text-muted overflow-hidden">
                      <span className="truncate">https://example.com/recording.mp3</span>
                    </div>
                  </div>
                  <div className="bg-background rounded-xl border border-border p-4 shadow-sm">
                    <div className="text-xs text-muted mb-2">Output</div>
                    <div className="text-xs text-accent-strong font-medium">Compressed: 34% smaller</div>
                  </div>
                </div>
              </div>

              {/* Mock settings — hidden on mobile */}
              <div className="hidden md:block border-l border-border p-5">
                <div className="flex gap-4 mb-4 border-b border-border pb-3">
                  <span className="text-xs font-medium border-b-2 border-foreground pb-3 -mb-3">Settings</span>
                  <span className="text-xs text-muted">History</span>
                </div>
                <div className="text-xs font-medium mb-3">Audio compression</div>
                <div className="space-y-2">
                  {['Trim silence', 'Normalize', 'Compress', 'Speed up'].map((op) => (
                    <div key={op} className="flex items-center justify-between text-xs">
                      <span className="text-muted">{op}</span>
                      <div className="w-16 h-1.5 bg-border rounded-full">
                        <div className="h-full w-2/3 bg-accent-strong rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6 md:p-10 flex items-center justify-center min-h-[280px] md:h-[480px]">
              <div className="w-full max-w-2xl">
                <div className="bg-background rounded-xl p-4 sm:p-6 shadow-sm border border-border font-mono text-sm overflow-hidden">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-3 h-3 rounded-full bg-red-300" />
                    <div className="w-3 h-3 rounded-full bg-yellow-300" />
                    <div className="w-3 h-3 rounded-full bg-accent-strong" />
                    <span className="text-xs text-muted ml-2">terminal</span>
                  </div>
                  <pre className="text-[10px] sm:text-xs leading-relaxed text-muted overflow-x-auto">
{`$ curl -X POST https://api.robinwood.dev/audio \\
  -H "Authorization: Bearer rw_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "audioUrl": "https://example.com/podcast.mp3",
    "preset": "podcast"
  }'

`}<span className="text-accent-strong">{`{
  "data": {
    "_id": "job_abc123",
    "status": "processing"
  }
}`}</span>
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
