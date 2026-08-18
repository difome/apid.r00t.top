import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchHolidaysList } from './api'
import i18n from '@/i18n'

export const holidaysQueryOptions = () =>
  queryOptions({
    queryKey: ['holidays', i18n.language || 'uk'],
    queryFn: fetchHolidaysList,
    staleTime: 60000,
  })

export function useHolidays() {
  return useQuery(holidaysQueryOptions())
}
