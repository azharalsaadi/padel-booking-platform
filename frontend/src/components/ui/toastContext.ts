import { createContext } from 'react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

export interface ToastContextValue {
  /** Queues a toast; it auto-dismisses after a fixed duration or on manual close. */
  show: (toast: Omit<ToastItem, 'id'>) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
