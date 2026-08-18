import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchRandomFact } from '@/lib/api'

export const factsQueryOptions = (lang: string = 'ru') =>
  queryOptions({
    queryKey: ['fact', lang],
    queryFn: () => fetchRandomFact(lang),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

export function useRandomFact(lang: string = 'ru') {
  return useQuery(factsQueryOptions(lang))
}

