'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/app/lib/utils'

/* Generic dialog shell; use ConfirmDialog for yes/no asks. */
export function Modal({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  className,
  children,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  title: string
  description?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-6 shadow-2xl focus:outline-none',
              className,
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Dialog.Title className="text-base font-medium tracking-tight text-foreground">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-black/[0.05] hover:text-foreground">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
            <div className="mt-5">{children}</div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
