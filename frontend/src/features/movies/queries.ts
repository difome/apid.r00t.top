import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchRandomMovie } from './api'
import i18n from '@/i18n'

export const moviesQueryOptions = () =>
  queryOptions({
    queryKey: ['movie', i18n.language || 'uk'],
    queryFn: fetchRandomMovie,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

export function useRandomMovie() {
  return useQuery(moviesQueryOptions())
}
