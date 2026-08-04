import type { ReactNode } from 'react'
import { CustomerHeader } from '@/components/layout/CustomerHeader'
import { CustomerFooter } from '@/components/layout/CustomerFooter'

interface CustomerShellProps {
  children: ReactNode
}

/**
 * Wraps every customer-facing route with the shared header/footer chrome.
 * The theme-customer class (see index.css) re-themes every shared
 * component (Button, Card, Badge, ...) underneath it to the monochrome
 * black/white/gray customer brand identity — admin never renders inside
 * this wrapper, so AdminShell's green identity is completely unaffected.
 */
export function CustomerShell({ children }: CustomerShellProps) {
  return (
    <div className="theme-customer flex min-h-screen flex-col">
      <CustomerHeader />
      <main className="flex-1">{children}</main>
      <CustomerFooter />
    </div>
  )
}
