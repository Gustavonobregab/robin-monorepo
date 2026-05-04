'use client'
import { useState, type ReactNode } from 'react'
import { Settings, ChevronDown } from 'lucide-react'
import { cn } from '@/app/lib/utils'

interface ToolLayoutProps {
  title: string
  description?: string
  inputPanel?: ReactNode
  outputPanel?: ReactNode
  mainPanel?: ReactNode
  settingsPanel?: ReactNode
  historyPanel?: ReactNode
  action: ReactNode
  credits?: number
}

export function ToolLayout({ title, description, inputPanel, outputPanel, mainPanel, settingsPanel, historyPanel, action, credits }: ToolLayoutProps) {
  const [tab, setTab] = useState<'settings' | 'history'>('settings')
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false)
  const hasTabs = !!historyPanel

  const settingsContent = (
    <>
      {hasTabs ? (
        <>
          <div className="flex gap-6 px-5 sm:px-8 pt-6 border-b border-border">
            <button
              type="button"
              onClick={() => setTab('settings')}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === 'settings'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted hover:text-foreground'
              )}
            >
              Settings
            </button>
            <button
              type="button"
              onClick={() => setTab('history')}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === 'history'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted hover:text-foreground'
              )}
            >
              History
            </button>
          </div>

          {tab === 'settings' ? (
            <div className="p-5 sm:p-8">
              <div className="mb-5">
                <h2 className="font-semibold">{title}</h2>
                {description ? (
                  <p className="text-sm text-muted mt-0.5">{description}</p>
                ) : null}
              </div>
              {settingsPanel}
            </div>
          ) : (
            <div className="p-5 sm:p-8">
              {historyPanel}
            </div>
          )}
        </>
      ) : (
        <div className="p-5 sm:p-8">
          <div className="mb-5">
            <h2 className="font-semibold">{title}</h2>
            {description ? (
              <p className="text-sm text-muted mt-0.5">{description}</p>
            ) : null}
          </div>
          {settingsPanel}
        </div>
      )}
    </>
  )

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Main content area */}
      <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 lg:p-10 overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-3xl space-y-4">
            {mainPanel ? (
              <div className="bg-background rounded-xl border border-border shadow-sm p-4 sm:p-6">
                {mainPanel}
              </div>
            ) : (
              <>
                <div className="bg-background rounded-xl border border-border shadow-sm p-4 sm:p-6">
                  {inputPanel}
                </div>
                <div className="bg-background rounded-xl border border-border shadow-sm p-4 sm:p-6">
                  {outputPanel}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="w-full max-w-3xl mx-auto flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>
              {credits != null
                ? `${credits.toLocaleString()} credits remaining`
                : 'x credits remaining'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {action}
          </div>
        </div>
      </div>

      {/* Settings panel — desktop: fixed sidebar, mobile: collapsible below */}
      <div className="lg:hidden border-t border-border bg-background">
        <button
          type="button"
          onClick={() => setMobileSettingsOpen(!mobileSettingsOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
        >
          <span className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted" />
            {title}
          </span>
          <ChevronDown className={cn('w-4 h-4 text-muted transition-transform', mobileSettingsOpen && 'rotate-180')} />
        </button>
        {mobileSettingsOpen && (
          <div className="border-t border-border">
            {settingsContent}
          </div>
        )}
      </div>

      <div className="hidden lg:block w-[480px] border-l border-border bg-background overflow-y-auto shrink-0">
        {settingsContent}
      </div>
    </div>
  )
}
