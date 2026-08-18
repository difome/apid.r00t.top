import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchRandomMeme } from './api'

export const memesQueryOptions = () =>
  queryOptions({
    queryKey: ['meme'],
    queryFn: fetchRandomMeme,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

export function useRandomMeme() {
  return useQuery(memesQueryOptions())
}
