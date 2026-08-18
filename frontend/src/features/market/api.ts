import { api } from '@/lib/api'
import type { CommodityApiItem, HistoryResponse, ListResponse } from './types'

export const fetchMetalsRates = async (): Promise<ListResponse<CommodityApiItem>> => {
  const { data } = await api.get<ListResponse<CommodityApiItem>>('/commodities/rates/list?category=metals')
  return data
}

export const fetchCommoditiesRates = async (): Promise<ListResponse<CommodityApiItem>> => {
  const { data } = await api.get<ListResponse<CommodityApiItem>>('/commodities/rates/list?category=commodities')
  return data
}

export const fetchCommodityHistory = async (symbol: string, days: number = 30, year?: number): Promise<HistoryResponse> => {
  let url = `/commodities/rates/${symbol}/history`
  if (year) {
    url += `?year=${year}`
  } else {
    url += `?days=${days}`
  }
  const { data } = await api.get<HistoryResponse>(url)
  return data
}

export const fetchCommodityYears = async (symbol: string): Promise<ListResponse<number>> => {
  const { data } = await api.get<ListResponse<number>>(`/commodities/rates/${symbol}/years`)
  return data
}

export const syncCommoditiesRates = async () => {
  const { data } = await api.post('/commodities/rates/sync')
  return data
}
