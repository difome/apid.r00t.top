import axios from 'axios'
import type { CommodityApiItem, HistoryResponse, ListResponse } from '@/types/market'
import type { ApiResponse, CurrencyData } from '@/types/currency'

import i18n from '@/i18n'

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return import.meta.env.VITE_API_URL || '/api/v2'
  }
  return (
    process.env.INTERNAL_API_URL ||
    process.env.VITE_API_URL ||
    'http://127.0.0.1:3000/api/v2'
  )
}

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const currentLang = i18n.language || 'uk'
  config.headers['Accept-Language'] = currentLang

  if (!config.params) {
    config.params = {}
  }
  if (!config.params.lang) {
    config.params.lang = currentLang
  }

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const key = localStorage.getItem('admin_key')
    if (key) {
      config.headers['x-admin-key'] = key
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const url = error.config?.url || ''
      const isAdminRequest = url.startsWith('/admin') || url.includes('/sync')

      if (error.response?.status === 401 && isAdminRequest) {
        localStorage.removeItem('admin_key')
        window.dispatchEvent(new Event('admin-auth-error'))
      }
    }

    return Promise.reject(error)
  }
)

export const fetchCurrencies = async () => {
  const { data } = await api.get<ApiResponse>('/currency/rates/list')
  return data
}

export const fetchHistory = async (key: string, days: number = 30, year?: number, startDate?: string, endDate?: string, basePath: string = '/currency') => {
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
    to_currencies: to.map(t => t.toLowerCase()),
    exclude_source: true
  })
  return data
}

export const fetchParsingLogs = async () => {
  const { data } = await api.get('/admin/logs')
  return data
}

export const syncRates = async () => {
  const { data } = await api.post('/currency/rates/sync')
  return data
}

export const fetchTrafficLogs = async () => {
  const { data } = await api.get('/admin/traffic')
  return data
}

export const fetchConfig = async (key: string) => {
  const { data } = await api.get(`/admin/config?key=${key}`)
  return data
}

export const updateConfig = async (key: string, value: string) => {
  const { data } = await api.post('/admin/config', { key, value })
  return data
}

export const fetchAllCurrencies = async () => {
  const { data } = await api.get<CurrencyData[]>('/admin/currencies')
  return data
}

export const createCurrencyAdmin = async (currency: any) => {
  const { data } = await api.post('/admin/currencies', currency)
  return data
}

export const updateCurrencyAdmin = async (key: string, currency: any) => {
  const { data } = await api.patch(`/admin/currencies/${key}`, currency)
  return data
}

export const deleteCurrencyAdmin = async (key: string) => {
  const { data } = await api.delete(`/admin/currencies/${key}`)
  return data
}

export const syncCurrencyHistoryAdmin = async (key: string) => {
  const { data } = await api.post(`/admin/currencies/${key}/sync`)
  return data
}

export const fetchBans = async () => {
  const { data } = await api.get('/admin/bans')
  return data
}

export const banIpAdmin = async (ip: string, reason?: string) => {
  const { data } = await api.post('/admin/bans', { ip, reason })
  return data
}

export const unbanIpAdmin = async (ip: string) => {
  const { data } = await api.delete(`/admin/bans/${ip}`)
  return data
}

export const fetchRandomMovie = async (lang: string = 'ru') => {
  const { data } = await api.get(`/movies?lang=${lang}`)
  return data
}

export const fetchRandomMeme = async () => {
  const { data } = await api.get('/memes')
  return data
}

export const fetchRandomFact = async (lang: string = 'ru') => {
  const { data } = await api.get(`/facts?lang=${lang}`)
  return data
}

export const fetchHolidaysList = async (lang: string = 'ru') => {
  const { data } = await api.get(`/holidays/list?lang=${lang}`)
  return data
}

// ---- Commodities Admin API ----
export const fetchAllCommodities = async () => {
  const { data } = await api.get<CommodityApiItem[]>('/admin/commodities')
  return data
}

export const createCommodityAdmin = async (commodity: any) => {
  const { data } = await api.post('/admin/commodities', commodity)
  return data
}

export const updateCommodityAdmin = async (symbol: string, commodity: any) => {
  const { data } = await api.patch(`/admin/commodities/${symbol}`, commodity)
  return data
}

export const deleteCommodityAdmin = async (symbol: string) => {
  const { data } = await api.delete(`/admin/commodities/${symbol}`)
  return data
}

export const syncAllCommodityPrices = async () => {
  const { data } = await api.post('/admin/commodities/sync')
  return data
}

export const syncOneCommodityPrice = async (symbol: string) => {
  const { data } = await api.post(`/admin/commodities/${symbol}/sync`)
  return data
}

export const fetchCommodityHistory = async (symbol: string, days: number = 30, year?: number) => {
  let url = `/commodities/rates/${symbol}/history`
  if (year) {
    url += `?year=${year}`
  } else {
    url += `?days=${days}`
  }
  const { data } = await api.get<HistoryResponse>(url)
  return data
}

export const fetchCommodityYears = async (symbol: string) => {
  const { data } = await api.get<ListResponse<number>>(`/commodities/rates/${symbol}/years`)
  return data
}

export const fetchCommodityLogs = async (limit: number = 50) => {
  const { data } = await api.get('/admin/commodities/logs', { params: { limit } })
  return data
}

export const syncCommoditiesRates = async () => {
  const { data } = await api.post('/commodities/rates/sync')
  return data
}
