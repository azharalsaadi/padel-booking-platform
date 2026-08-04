import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCourt,
  deleteCourt,
  fetchCourt,
  fetchCourts,
  updateCourt,
  updateCourtWorkingHours,
} from '@/api/admin'
import type { CourtPayload, CourtWorkingHourEntry } from '@/types/admin'

const COURTS_KEY = ['admin', 'courts']
const courtKey = (id: number) => ['admin', 'courts', id]

export function useCourts() {
  return useQuery({ queryKey: COURTS_KEY, queryFn: fetchCourts })
}

export function useCourt(id: number) {
  return useQuery({ queryKey: courtKey(id), queryFn: () => fetchCourt(id) })
}

export function useCreateCourt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CourtPayload) => createCourt(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COURTS_KEY }),
  })
}

export function useUpdateCourt(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CourtPayload) => updateCourt(id, payload),
    onSuccess: (court) => {
      queryClient.setQueryData(courtKey(id), court)
      queryClient.invalidateQueries({ queryKey: COURTS_KEY })
    },
  })
}

export function useDeleteCourt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteCourt(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COURTS_KEY }),
  })
}

export function useUpdateCourtWorkingHours(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (workingHours: CourtWorkingHourEntry[]) => updateCourtWorkingHours(id, workingHours),
    onSuccess: (court) => {
      queryClient.setQueryData(courtKey(id), court)
    },
  })
}
