import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cancelBooking, fetchBookingByToken, refreshPaymentStatus, retryThawaniPayment } from '@/api/customer'

function bookingQueryKey(accessToken: string) {
  return ['booking', accessToken]
}

export function useBookingByToken(accessToken: string) {
  return useQuery({
    queryKey: bookingQueryKey(accessToken),
    queryFn: () => fetchBookingByToken(accessToken),
    retry: false,
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
