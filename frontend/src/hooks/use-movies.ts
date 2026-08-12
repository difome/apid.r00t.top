import { useQuery } from '@tanstack/react-query'
import { fetchRandomMovie } from '@/lib/api'

export function useRandomMovie(lang: string = 'ru') {
  return useQuery({
    queryKey: ['movie', lang],
    queryFn: () => fetchRandomMovie(lang),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}
