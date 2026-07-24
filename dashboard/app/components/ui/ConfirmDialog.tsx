'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import { Button } from './Button'

type Tone = 'primary' | 'destructive'

type Props = {
  trigger: React.ReactNode
  title: string
  description?: string
  confirmLabel: string
  tone?: Tone
  icon?: React.ReactNode
  onConfirm?: () => void
}

const iconTone: Record<Tone, string> = {
  primary: 'bg-secondary text-foreground',
  destructive: 'bg-destructive-subtle text-destructive',
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  tone = 'primary',
  icon,
  onConfirm,
}: Props) {
  const [open, setOpen] = useState(false)

  function handleConfirm() {
    onConfirm?.()
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm" />
        {/* Centering lives on this wrapper: framer-motion writes an inline transform that would override translate utilities on the panel itself. */}
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-4">
          {/* Scroll must live on Dialog.Content itself: Radix's scroll lock only whitelists Content, so a scrollable ancestor gets its wheel events cancelled. */}
          <Dialog.Content asChild>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto max-h-[calc(100vh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl focus:outline-none"
            >
              {icon && (
                <div
                  className={`mb-4 grid h-10 w-10 place-items-center rounded-full ${iconTone[tone]}`}
                >
                  {icon}
                </div>
              )}
              <Dialog.Title className="text-base font-medium tracking-tight text-foreground">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </Dialog.Description>
              )}
              <div className="mt-6 flex justify-end gap-2">
                <Dialog.Close asChild>
                  <Button variant="secondary">Cancel</Button>
                </Dialog.Close>
                <Button variant={tone} onClick={handleConfirm}>
                  {confirmLabel}
                </Button>
              </div>
            </motion.div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
