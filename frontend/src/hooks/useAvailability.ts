import { useQuery } from '@tanstack/react-query'
import { fetchAvailability } from '@/api/customer'

export function useAvailability(date: string | null) {
  return useQuery({
    queryKey: ['availability', date],
    queryFn: () => fetchAvailability(date as string),
    enabled: date !== null,
  })
}
