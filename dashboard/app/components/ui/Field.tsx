import { forwardRef } from 'react'
import { cn } from '@/app/lib/utils'

/* Form primitives: 40px tall, 12px radius, darker border on focus. */

export function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-[13px] font-medium text-foreground">{label}</span>
      {children}
    </label>
  )
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 rounded-lg border-[1.5px] border-black/10 bg-background px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-black/25 focus:outline-none disabled:bg-black/[0.02] disabled:text-muted-foreground',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[6rem] rounded-lg border-[1.5px] border-black/10 bg-background px-3 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-black/25 focus:outline-none',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'
