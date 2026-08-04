import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClosure, deleteClosure, deleteClosureBatch, fetchClosures } from '@/api/admin'
import type { CreateClosurePayload } from '@/types/admin'

const CLOSURES_KEY = ['admin', 'closures']

export function useClosures() {
  return useQuery({ queryKey: CLOSURES_KEY, queryFn: fetchClosures })
}

export function useCreateClosure() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateClosurePayload) => createClosure(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLOSURES_KEY }),
  })
}

export function useDeleteClosure() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteClosure(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLOSURES_KEY }),
  })
}

export function useDeleteClosureBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (batchId: string) => deleteClosureBatch(batchId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLOSURES_KEY }),
  })
}
