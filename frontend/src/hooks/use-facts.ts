import { useQuery } from '@tanstack/react-query'
import { fetchRandomFact } from '@/lib/api'

export function useRandomFact(lang: string = 'ru') {
  return useQuery({
    queryKey: ['fact', lang],
    queryFn: () => fetchRandomFact(lang),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}
