import { useQuery } from '@tanstack/react-query'
import { fetchRandomMeme } from '@/lib/api'

export function useRandomMeme() {
  return useQuery({
    queryKey: ['meme'],
    queryFn: fetchRandomMeme,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}
