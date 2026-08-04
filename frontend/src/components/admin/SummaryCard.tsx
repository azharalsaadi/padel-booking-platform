import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

interface SummaryCardProps {
  label: string
  value: number | undefined
  isLoading: boolean
  isError: boolean
  description?: string
}

export function SummaryCard({ label, value, isLoading, isError, description }: SummaryCardProps) {
  return (
    <Card>
      <p className="text-sm font-medium text-text-muted">{label}</p>
      {isLoading && <Skeleton className="mt-2 h-8 w-16" />}
      {!isLoading && isError && (
        <p className="mt-2 text-sm text-danger" role="alert">
          Could not load
        </p>
      )}
      {!isLoading && !isError && <p className="mt-2 text-3xl font-semibold text-text">{value ?? 0}</p>}
      {description && <p className="mt-1 text-xs text-text-muted">{description}</p>}
    </Card>
  )
}
