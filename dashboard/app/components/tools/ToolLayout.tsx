interface ToolLayoutProps {
  title: string
  description: string
  inputPanel: React.ReactNode
  outputPanel: React.ReactNode
  action: React.ReactNode
}

export function ToolLayout({ title, description, inputPanel, outputPanel, action }: ToolLayoutProps) {
  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted mt-0.5">{description}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-background rounded-xl border border-border shadow-sm p-5">{inputPanel}</div>
        <div className="bg-background rounded-xl border border-border shadow-sm p-5">{outputPanel}</div>
      </div>
      <div className="flex justify-end">{action}</div>
    </div>
  )
}
