import { useQuery } from '@tanstack/react-query'
import { fetchHolidaysList } from '@/lib/api'

export function useHolidays(lang: string = 'ru') {
  return useQuery({
    queryKey: ['holidays', lang],
    queryFn: () => fetchHolidaysList(lang),
    staleTime: 60000,
  })
}
