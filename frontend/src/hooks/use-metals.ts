import { queryOptions, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CommodityApiItem, ListResponse } from '@/types/market'

export const metalsQueryOptions = () =>
  queryOptions({
    queryKey: ['metals'],
    queryFn: async () => {
      const response = await api.get<ListResponse<CommodityApiItem>>('/commodities/rates/list?category=metals')
      return response.data
    },
    refetchInterval: 60000,
  })

export function useMetals() {
  return useQuery(metalsQueryOptions())
}

