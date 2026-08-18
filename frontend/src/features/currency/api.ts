import { api } from '@/lib/api'
import type { ApiResponse } from './types'
import type { HistoryResponse, ListResponse } from '@/types/market'

export const fetchCurrencies = async () => {
  const { data } = await api.get<ApiResponse>('/currency/rates/list')
  return data
}

export const fetchHistory = async (
  key: string,
  days: number = 30,
  year?: number,
  startDate?: string,
  endDate?: string,
  basePath: string = '/currency'
) => {
  let url = `${basePath}/rates/${encodeURIComponent(key)}/history`
  if (startDate && endDate) {
    url += `?startDate=${startDate}&endDate=${endDate}`
  } else if (year) {
    url += `?year=${year}`
  } else {
    url += `?days=${days}`
  }
  const { data } = await api.get<HistoryResponse>(url)
  return data
}

export const fetchAvailableYears = async (key: string, basePath: string = '/currency') => {
  const { data } = await api.get<ListResponse<number>>(`${basePath}/rates/${key}/years`)
  return data
}

export const convertCurrency = async (amount: number, from: string, to: string[]) => {
  const { data } = await api.post('/currency/convert', {
    amount,
    from_currency: from.toLowerCase(),
    to_currencies: to.map((t) => t.toLowerCase()),
    exclude_source: true,
  })
  return data
}

export const syncRates = async () => {
  const { data } = await api.post('/currency/rates/sync')
  return data
}
