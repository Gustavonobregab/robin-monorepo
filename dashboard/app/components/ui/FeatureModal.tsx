'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import { ArrowRight, X, type LucideIcon } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { cn } from '@/app/lib/utils'

export interface FeatureItem {
  icon: LucideIcon
  text: string
}

/* Product announcement modal: gradient hero, feature list, primary CTA.
   For first-visit teasers, drive `open` with useOnceFlag. */
export function FeatureModal({
  open,
  onOpenChange,
  badge,
  heroLabel,
  title,
  features,
  ctaLabel,
  onCta,
  secondaryLabel,
  onSecondary,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  badge?: string
  heroLabel: string
  title: string
  features: FeatureItem[]
  ctaLabel: string
  onCta: () => void
  secondaryLabel?: string
  onSecondary?: () => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Content asChild>
          <div className="fixed inset-0 z-50 overflow-y-auto p-4 focus:outline-none">
            <div className="flex min-h-full items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-background p-3 shadow-2xl"
              >
                <Dialog.Close className="absolute right-5 top-5 z-10 grid h-7 w-7 place-items-center rounded-md text-primary-foreground/70 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground">
                  <X className="h-4 w-4" />
                </Dialog.Close>

                {/* Hero */}
                <div className="grid h-40 place-items-center rounded-2xl bg-primary">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-medium tracking-tight text-primary-foreground">
                      {heroLabel}
                    </span>
                    {badge && (
                      <span className="rounded-full bg-primary-foreground/15 px-2 py-0.5 text-xs font-medium text-primary-foreground">
                        {badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="px-3 pt-5">
                  <Dialog.Title className="text-xl font-medium tracking-tight text-foreground">
                    {title}
                  </Dialog.Title>

                  <ul className="mt-4 space-y-3">
                    {features.map(({ icon: Icon, text }) => (
                      <li key={text} className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-foreground">
                          <Icon className="h-[1.05rem] w-[1.05rem]" />
                        </span>
                        <span className="text-sm leading-snug text-foreground">{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Footer */}
                <div className={cn('mt-6 flex items-center gap-2 px-1 pb-1', secondaryLabel ? 'sm:gap-3' : '')}>
                  {secondaryLabel && (
                    <Button
                      variant="secondary"
                      size="lg"
                      className="flex-1 rounded-xl"
                      onClick={onSecondary}
                    >
                      {secondaryLabel}
                    </Button>
                  )}
                  <Button
                    size="lg"
                    className={cn('rounded-xl', secondaryLabel ? 'flex-1' : 'w-full')}
                    onClick={onCta}
                  >
                    {ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
