import { api } from '@/lib/api'

export interface MovieItem {
  id: number
  title: string
  original_title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  popularity: number
}

export interface MovieApiResponse {
  success: boolean
  data: {
    result: MovieItem
  }
}

export const fetchRandomMovie = async (): Promise<MovieApiResponse> => {
  const { data } = await api.get<MovieApiResponse>('/movies')
  return data
}
