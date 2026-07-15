import { Button } from './Button'
import { Card } from './Card'

/* Inline SWR-error state: message + "Try again"; never a toast. */
export function RetryCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 p-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </Card>
  )
}
