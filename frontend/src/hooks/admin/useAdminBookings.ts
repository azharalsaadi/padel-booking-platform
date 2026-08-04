import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAdminBooking, fetchAdminBookings, markBookingPaid } from '@/api/admin'
import type { AdminBookingFilters } from '@/types/admin'

function bookingQueryKey(id: number) {
  return ['admin', 'bookings', id]
}

export function useAdminBookings(filters: AdminBookingFilters) {
  return useQuery({
    queryKey: ['admin', 'bookings', filters],
    queryFn: () => fetchAdminBookings(filters),
  })
}

export function useAdminBooking(id: number) {
  return useQuery({
    queryKey: bookingQueryKey(id),
    queryFn: () => fetchAdminBooking(id),
  })
}

export function useMarkBookingPaid(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => markBookingPaid(id),
    onSuccess: (booking) => {
      // Set directly rather than letting invalidation refetch it — the
      // mutation response is already the authoritative fresh state, and
      // this page is actively mounted, so an immediate refetch would just
      // race the very data being set. The bookings list (also matched by
      // this key) still gets marked stale for whenever it's next viewed —
      // refetchType 'none' just skips refetching anything immediately.
      queryClient.setQueryData(bookingQueryKey(id), booking)
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'], exact: false, refetchType: 'none' })
    },
  })
}
