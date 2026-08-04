import { useMutation } from '@tanstack/react-query'
import { createBooking } from '@/api/customer'

export function useCreateBooking() {
  return useMutation({
    mutationFn: createBooking,
  })
}
