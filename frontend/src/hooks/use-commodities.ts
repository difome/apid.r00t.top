import { queryOptions, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CommodityApiItem, ListResponse } from '@/types/market'

export const commoditiesQueryOptions = () =>
  queryOptions({
    queryKey: ['commodities_raw'],
    queryFn: async () => {
      const response = await api.get<ListResponse<CommodityApiItem>>('/commodities/rates/list?category=commodities')
      return response.data
    },
    refetchInterval: 60000,
  })

export function useCommodities() {
  return useQuery(commoditiesQueryOptions())
}

