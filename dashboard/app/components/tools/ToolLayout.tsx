import type { ReactNode } from 'react'

interface ToolLayoutProps {
  title: string
  description: string
  inputPanel: ReactNode
  outputPanel: ReactNode
  settingsPanel?: ReactNode
  action: ReactNode
}

export function ToolLayout({ title, description, inputPanel, outputPanel, settingsPanel, action }: ToolLayoutProps) {
  return (
    <div className="flex h-full">
      {/* Center area */}
      <div className="flex-1 flex flex-col items-center justify-center p-10 overflow-y-auto">
        <div className="w-full max-w-xl space-y-4">
          <div className="bg-background rounded-xl border border-border shadow-sm p-5">
            {inputPanel}
          </div>
          <div className="bg-background rounded-xl border border-border shadow-sm p-5">
            {outputPanel}
          </div>
          <div className="flex justify-end">
            {action}
          </div>
        </div>
      </div>

      {/* Right settings panel */}
      <div className="w-96 border-l border-border bg-background p-8 overflow-y-auto shrink-0">
        <div className="mb-5">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted mt-0.5">{description}</p>
        </div>
        {settingsPanel}
      </div>
    </div>
  )
}
