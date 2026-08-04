import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/** The one responsive max-width wrapper both interfaces use for page content. */
export function Container({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)} {...props} />
}
