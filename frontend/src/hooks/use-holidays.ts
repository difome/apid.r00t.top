import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchHolidaysList } from '@/lib/api'

export const holidaysQueryOptions = (lang: string = 'ru') =>
  queryOptions({
    queryKey: ['holidays', lang],
    queryFn: () => fetchHolidaysList(lang),
    staleTime: 60000,
  })

export function useHolidays(lang: string = 'ru') {
  return useQuery(holidaysQueryOptions(lang))
}

