import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/**
 * Thin, composable wrappers around the native table elements — callers
 * compose their own <Table.Head>/<Table.Row>/<Table.Cell> structure for
 * whatever columns Steps 14/15 end up needing. The only behavior owned
 * here is the horizontal-scroll container, so wide tables never break
 * the page layout on small screens.
 */
export function Table({ className = '', ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-card border border-border">
      <table className={cn('w-full min-w-max border-collapse text-left text-sm', className)} {...props} />
    </div>
  )
}

export function TableHead({ className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-background text-text-muted', className)} {...props} />
}

export function TableBody({ className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-border', className)} {...props} />
}

export function TableRow({ className = '', ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('hover:bg-background/60', className)} {...props} />
}

export function TableHeaderCell({ className = '', scope = 'col', ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope={scope} className={cn('px-4 py-3 text-xs font-semibold uppercase tracking-wide', className)} {...props} />
}

export function TableCell({ className = '', ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 text-text', className)} {...props} />
}
