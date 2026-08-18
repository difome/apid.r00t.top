import { api } from '@/lib/api'

export interface MemeItem {
  id?: number
  image: string
  description: string
}

export interface MemeApiResponse {
  success: boolean
  data: {
    result: MemeItem
  }
}

export const fetchRandomMeme = async (): Promise<MemeApiResponse> => {
  const { data } = await api.get<MemeApiResponse>('/memes')
  return data
}
