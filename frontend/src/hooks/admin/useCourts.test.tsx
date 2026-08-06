import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MockAdapter from 'axios-mock-adapter'
import { apiClient } from '@/api/client'
import { useCourts, useCreateCourt, useDeleteCourt } from '@/hooks/admin/useCourts'

/**
 * Exercises the real hooks against a real QueryClient with only the HTTP
 * transport mocked — proves cache invalidation actually happens (the
 * courts list refetches after a mutation), not just that the mutation
 * function was called.
 */
describe('useCourts cache invalidation (real QueryClient, HTTP transport mocked)', () => {
  const clientMock = new MockAdapter(apiClient)

  afterEach(() => {
    clientMock.reset()
  })

  function renderHarness() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }
    return renderHook(
      () => ({ courts: useCourts(), create: useCreateCourt(), remove: useDeleteCourt() }),
      { wrapper },
    )
  }

  it('refetches the courts list after a successful create', async () => {
    clientMock
      .onGet('/admin/courts')
      .replyOnce(200, { data: [{ id: 1, name: 'Court 1', description: null, is_active: true, sort_order: 1, created_at: 'x', updated_at: 'x' }], meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 } })
      .onGet('/admin/courts')
      .reply(200, {
        data: [
          { id: 1, name: 'Court 1', description: null, is_active: true, sort_order: 1, created_at: 'x', updated_at: 'x' },
          { id: 2, name: 'Court 2', description: null, is_active: true, sort_order: 2, created_at: 'x', updated_at: 'x' },
        ],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 },
      })
    clientMock.onPost('/admin/courts').reply(201, { data: { id: 2, name: 'Court 2', description: null, is_active: true, sort_order: 2, created_at: 'x', updated_at: 'x' } })

    const { result } = renderHarness()

    await waitFor(() => expect(result.current.courts.data?.data).toHaveLength(1))

    await act(async () => {
      await result.current.create.mutateAsync({ name: 'Court 2' })
    })

    await waitFor(() => expect(result.current.courts.data?.data).toHaveLength(2))
    expect(clientMock.history.get.filter((r) => r.url === '/admin/courts')).toHaveLength(2)
  })

  it('refetches the courts list after a successful delete', async () => {
    clientMock
      .onGet('/admin/courts')
      .replyOnce(200, {
        data: [
          { id: 1, name: 'Court 1', description: null, is_active: true, sort_order: 1, created_at: 'x', updated_at: 'x' },
          { id: 2, name: 'Court 2', description: null, is_active: true, sort_order: 2, created_at: 'x', updated_at: 'x' },
        ],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 },
      })
      .onGet('/admin/courts')
      .reply(200, { data: [{ id: 1, name: 'Court 1', description: null, is_active: true, sort_order: 1, created_at: 'x', updated_at: 'x' }], meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 } })
    clientMock.onDelete('/admin/courts/2').reply(204)

    const { result } = renderHarness()

    await waitFor(() => expect(result.current.courts.data?.data).toHaveLength(2))

    await act(async () => {
      await result.current.remove.mutateAsync(2)
    })

    await waitFor(() => expect(result.current.courts.data?.data).toHaveLength(1))
  })
})
