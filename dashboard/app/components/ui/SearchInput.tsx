import { forwardRef } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/app/lib/utils'

/* Search field: 40px tall, 12px radius, leading search glyph. */
export const SearchInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <div
      className={cn(
        'flex h-10 items-center gap-2 rounded-lg border-[1.5px] border-black/10 px-3 transition-colors focus-within:border-black/20',
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        ref={ref}
        className="h-full flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        {...props}
      />
    </div>
  ),
)
SearchInput.displayName = 'SearchInput'
