import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchMetalsRates, fetchCommoditiesRates, fetchCommodityHistory, fetchCommodityYears } from './api'

export const metalsQueryOptions = () =>
  queryOptions({
    queryKey: ['metals'],
    queryFn: fetchMetalsRates,
    staleTime: 60000,
    refetchInterval: 60000,
  })

export function useMetals() {
  return useQuery(metalsQueryOptions())
}

export const commoditiesQueryOptions = () =>
  queryOptions({
    queryKey: ['commodities_raw'],
    queryFn: fetchCommoditiesRates,
    staleTime: 60000,
    refetchInterval: 60000,
  })

export function useCommodities() {
  return useQuery(commoditiesQueryOptions())
}

export function useCommodityHistory(symbol: string | null, days: number = 30, year?: number) {
  return useQuery({
    queryKey: ['commodity-history', symbol, days, year],
    queryFn: () => fetchCommodityHistory(symbol!, days, year),
    enabled: !!symbol,
  })
}

export function useCommodityYears(symbol: string | null) {
  return useQuery({
    queryKey: ['commodity-years', symbol],
    queryFn: () => fetchCommodityYears(symbol!),
    enabled: !!symbol,
  })
}
