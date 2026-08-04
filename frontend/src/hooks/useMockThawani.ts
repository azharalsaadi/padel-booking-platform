import { useMutation, useQuery } from '@tanstack/react-query'
import { completeMockThawaniPayment, failMockThawaniPayment, fetchMockThawaniSession } from '@/api/customer'

export function useMockThawaniSession(sessionId: string) {
  return useQuery({
    queryKey: ['mock-thawani', sessionId],
    queryFn: () => fetchMockThawaniSession(sessionId),
    retry: false,
  })
}

export function useCompleteMockThawaniPayment(sessionId: string) {
  return useMutation({ mutationFn: () => completeMockThawaniPayment(sessionId) })
}

export function useFailMockThawaniPayment(sessionId: string) {
  return useMutation({ mutationFn: () => failMockThawaniPayment(sessionId) })
}
