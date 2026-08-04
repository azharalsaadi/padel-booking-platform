import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/** A pulsing placeholder block; size it with className (e.g. "h-4 w-32"). */
export function Skeleton({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-control bg-border/70', className)}
      {...props}
    />
  )
}

interface SkeletonTextProps {
  lines?: number
  className?: string
}

/** A short paragraph-shaped skeleton — last line runs shorter, like real wrapped text. */
export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cn('h-3', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}
