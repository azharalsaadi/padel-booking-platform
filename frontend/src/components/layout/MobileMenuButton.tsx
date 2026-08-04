interface MobileMenuButtonProps {
  isOpen: boolean
  onClick: () => void
  /** id of the element this button expands/collapses (aria-controls). */
  controls: string
  label?: string
}

/** Shared hamburger/close toggle used by both the customer and admin mobile navigation. */
export function MobileMenuButton({ isOpen, onClick, controls, label = 'Menu' }: MobileMenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={isOpen}
      aria-controls={controls}
      aria-label={isOpen ? `Close ${label.toLowerCase()}` : `Open ${label.toLowerCase()}`}
      className="inline-flex items-center justify-center rounded-control p-2 text-text hover:bg-primary-50 md:hidden"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        {isOpen ? (
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        ) : (
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        )}
      </svg>
    </button>
  )
}
