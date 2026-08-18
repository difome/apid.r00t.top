import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchRandomFact } from './api'
import i18n from '@/i18n'

export const factsQueryOptions = () =>
  queryOptions({
    queryKey: ['fact', i18n.language || 'uk'],
    queryFn: fetchRandomFact,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

export function useRandomFact() {
  return useQuery(factsQueryOptions())
}
