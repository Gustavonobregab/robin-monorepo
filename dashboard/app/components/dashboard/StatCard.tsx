import { cn } from '@/app/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  description?: string
  className?: string
}

export function StatCard({ label, value, description, className }: StatCardProps) {
  return (
    <div className={cn('bg-background rounded-xl p-5 border border-border shadow-sm', className)}>
      <p className="text-sm text-muted mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {description && <p className="text-xs text-muted mt-1">{description}</p>}
    </div>
  )
}
