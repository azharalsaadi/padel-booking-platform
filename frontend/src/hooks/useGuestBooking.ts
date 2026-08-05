import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Query } from '@tanstack/react-query'
import { cancelBooking, downloadBookingPdf, fetchBookingByToken, refreshPaymentStatus, retryThawaniPayment } from '@/api/customer'
import type { BookingView } from '@/types/api'

function bookingQueryKey(accessToken: string) {
  return ['booking', accessToken]
}

interface UseBookingByTokenOptions {
  /** Optional — omitted by every caller except ManageBookingPage, which polls Pay at Venue bookings for a payment-status change. */
  refetchInterval?: (query: Query<BookingView, unknown, BookingView>) => number | false
}

export function useBookingByToken(accessToken: string, options?: UseBookingByTokenOptions) {
  return useQuery({
    queryKey: bookingQueryKey(accessToken),
    queryFn: () => fetchBookingByToken(accessToken),
    retry: false,
    refetchInterval: options?.refetchInterval,
  })
}

export function useCancelBooking(accessToken: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => cancelBooking(accessToken),
    onSuccess: (booking) => {
      queryClient.setQueryData(bookingQueryKey(accessToken), booking)
    },
  })
}

export function useRetryPayment(accessToken: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => retryThawaniPayment(accessToken),
    onSuccess: (booking) => {
      queryClient.setQueryData(bookingQueryKey(accessToken), booking)
    },
  })
}

export function useRefreshPayment(accessToken: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => refreshPaymentStatus(accessToken),
    onSuccess: (booking) => {
      queryClient.setQueryData(bookingQueryKey(accessToken), booking)
    },
  })
}

export function useDownloadBookingPdf(accessToken: string) {
  return useMutation({
    mutationFn: () => downloadBookingPdf(accessToken),
  })
}
