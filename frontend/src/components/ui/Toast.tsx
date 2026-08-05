import { useCallback, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { ToastContext } from '@/components/ui/toastContext'
import type { ToastItem } from '@/components/ui/toastContext'

const DEFAULT_DURATION_MS = 5000

const variantClasses: Record<ToastItem['variant'], string> = {
  success: 'border-success/30 bg-success-50 text-success',
  error: 'border-danger/30 bg-danger-50 text-danger',
  info: 'border-info/30 bg-info-50 text-info',
  warning: 'border-warning/30 bg-warning-50 text-warning',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = nextId.current++
      setToasts((current) => [...current, { ...toast, id }])

      // Error/warning toasts stay until manually dismissed — WCAG 2.2.1
      // (Timing Adjustable): a user reading why something failed shouldn't
      // race a 5-second clock. Success/info are transient by nature.
      if (toast.variant !== 'error' && toast.variant !== 'warning') {
        window.setTimeout(() => dismiss(id), DEFAULT_DURATION_MS)
      }
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className={cn(
                'flex items-start justify-between gap-3 rounded-card border p-4 shadow-soft-lg',
                variantClasses[toast.variant],
              )}
            >
              <div>
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-sm opacity-90">{toast.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label={t('common.dismissNotification')}
                className="shrink-0 rounded-control p-1 hover:bg-black/5"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
