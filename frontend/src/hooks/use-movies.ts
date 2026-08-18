import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchRandomMovie } from '@/lib/api'

export const moviesQueryOptions = (lang: string = 'ru') =>
  queryOptions({
    queryKey: ['movie', lang],
    queryFn: () => fetchRandomMovie(lang),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

export function useRandomMovie(lang: string = 'ru') {
  return useQuery(moviesQueryOptions(lang))
}

