import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/Toast'

interface RenderOptions {
  /** Initial history entry — a plain path, or {pathname, state} to simulate navigate(path, {state}). */
  route?: string | { pathname: string; state?: unknown }
  /** Route pattern the element is mounted under — set this to use useParams(). */
  path?: string
}

/** One QueryClient per render call — retries disabled so failed-request tests resolve immediately. */
export function renderWithProviders(ui: ReactElement, { route = '/', path = '*' }: RenderOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}
