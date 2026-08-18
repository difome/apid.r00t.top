import { api } from '@/lib/api'

export interface FactApiResponse {
  success: boolean
  data: {
    result: string | { content: string }
  }
}

export const fetchRandomFact = async (): Promise<FactApiResponse> => {
  const { data } = await api.get<FactApiResponse>('/facts')
  return data
}
