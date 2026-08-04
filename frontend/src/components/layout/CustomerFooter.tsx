import { Camera, MessageCircle } from 'lucide-react'
import { Container } from '@/components/layout/Container'

/**
 * The single footer for every customer-facing page. Privacy Policy / Terms
 * of Service / Contact Us / Instagram are shown as plain, non-interactive
 * labels matching the approved layout — none of those pages or accounts
 * exist in this project, so they're intentionally not rendered as links.
 * Instagram is represented with lucide-react's generic Camera icon since
 * the library no longer ships brand icons.
 */
export function CustomerFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <Container className="flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <span className="font-serif text-xl font-bold tracking-wide text-primary">RALLY</span>
          <p className="max-w-xs text-sm text-text-muted">The intersection of high-performance sport and luxury lifestyle in Oman.</p>
          <div className="flex items-center gap-3 text-text-muted">
            <Camera aria-hidden="true" className="h-5 w-5" strokeWidth={1.4} />
            <MessageCircle aria-hidden="true" className="h-5 w-5" strokeWidth={1.4} />
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:items-end">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-muted">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Contact Us</span>
            <span>Instagram</span>
          </div>
          <p className="text-sm text-text-muted">&copy; {new Date().getFullYear()} Rally Premium Padel. All rights reserved.</p>
        </div>
      </Container>
    </footer>
  )
}
