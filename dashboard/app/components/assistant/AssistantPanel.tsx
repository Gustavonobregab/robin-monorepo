'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, FileText, Sparkles, X } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { Chip } from '@/app/components/ui/Chip'
import { InlineSelect } from '@/app/components/ui/Select'
import { cn } from '@/app/lib/utils'

type AssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}

type AssistantContext = 'page' | 'jobs'

const CONTEXT_OPTIONS = [
  { value: 'page', label: 'This page' },
  { value: 'jobs', label: 'All jobs' },
]

const SUGGESTIONS = [
  'Compress a podcast episode',
  'Best settings for photos',
  'Explain my usage',
]

/* Single integration point: swap for the real app/http/assistant.ts call when the backend lands. */
async function sendToAssistant(text: string, context: AssistantContext): Promise<string> {
  void text
  void context
  await new Promise((resolve) => setTimeout(resolve, 800))
  return "The assistant isn't wired up yet. I'll be able to answer this once the backend is connected. Everything you send here stays local for now."
}

const TIME_FMT = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })

function formatTime(date: Date) {
  return TIME_FMT.format(date)
}

function MessageRow({ message }: { message: AssistantMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      <p
        className={cn(
          'whitespace-pre-wrap text-sm text-foreground',
          isUser
            ? 'max-w-[85%] rounded-2xl bg-black/[0.04] px-3.5 py-2.5'
            : 'max-w-[95%] leading-relaxed',
        )}
      >
        {message.content}
      </p>
      <span className="text-[11px] text-muted-foreground">{formatTime(message.createdAt)}</span>
    </div>
  )
}

export function AssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [draft, setDraft] = useState('')
  const [context, setContext] = useState<AssistantContext>('page')
  const [replying, setReplying] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, replying])

  const resizeTextarea = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || replying) return

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: trimmed, createdAt: new Date() },
    ])
    setDraft('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    setReplying(true)
    const reply = await sendToAssistant(trimmed, context)
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'assistant', content: reply, createdAt: new Date() },
    ])
    setReplying(false)
  }

  const canSend = draft.trim().length > 0 && !replying

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
          className="fixed inset-y-0 right-0 z-50 flex w-[380px] max-w-full flex-col border-l border-border bg-background"
        >
          {/* Header */}
          <div className="flex h-[3.75rem] shrink-0 items-center justify-between border-b border-border px-4">
            <span className="text-sm font-medium text-foreground">Assistant</span>
            <Button variant="ghost" size="icon" title="Close assistant" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-5 px-2 text-center">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.04]">
                  <Sparkles className="h-[1.05rem] w-[1.05rem] text-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">How can I help?</p>
                  <p className="text-sm text-muted-foreground">
                    Ask about compression settings, your jobs, or your usage.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <Chip key={suggestion} onClick={() => void send(suggestion)}>
                      {suggestion}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <MessageRow key={message.id} message={message} />
                ))}
                {replying && <p className="text-sm text-muted-foreground">Thinking…</p>}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="shrink-0 p-3 pt-0">
            <div className="rounded-3xl border border-border bg-background p-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={draft}
                placeholder="Ask the assistant…"
                onChange={(e) => {
                  setDraft(e.target.value)
                  resizeTextarea()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send(draft)
                  }
                }}
                className="max-h-40 w-full resize-none bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <div className="flex items-center justify-between pt-1">
                <InlineSelect
                  value={context}
                  onValueChange={(v) => setContext(v as AssistantContext)}
                  options={CONTEXT_OPTIONS}
                  icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                />
                <Button
                  size="orb"
                  className="h-9 w-9 shrink-0"
                  title="Send"
                  disabled={!canSend}
                  onClick={() => void send(draft)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
