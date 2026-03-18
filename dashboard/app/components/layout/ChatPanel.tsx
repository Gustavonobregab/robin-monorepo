'use client'
import { Plus, Clock, Mic } from 'lucide-react'

export function ChatPanel() {
  return (
    <div className="w-80 shrink-0 flex flex-col h-full bg-foreground/8">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-5">
        <span className="text-sm font-medium">New chat</span>
        <div className="flex items-center gap-2">
          <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-background-section transition-colors text-muted hover:text-foreground">
            <Plus className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-background-section transition-colors text-muted hover:text-foreground">
            <Clock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        <p className="text-sm text-foreground leading-relaxed">
          Hi! How can I help you today?
        </p>
      </div>

      {/* Input */}
      <div className="p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Ask anything…"
            className="w-full bg-background-section rounded-xl px-4 py-3 text-sm placeholder:text-muted outline-none border border-border focus:border-accent-strong/50 pr-12 transition-colors"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-accent-light hover:bg-accent-strong transition-colors">
            <Mic className="w-3.5 h-3.5 text-foreground" />
          </button>
        </div>
      </div>
    </div>
  )
}
